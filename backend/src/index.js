import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import sanitizeHtml from 'sanitize-html';
import { Lead, User, Settings, Otp, Blog, Media, Announcement, Review } from './models.js';
import { resolveBusiness, KEYS as BIZ_KEYS, MODES as BIZ_MODES } from './business.js';
import { sendMail, ownerEmailHtml, customerEmailHtml, mailStatus, mailHealth } from './mail.js';
import { logger } from './logger.js';
import { deliverOtp } from './otpProvider.js';

const PHONE_RE = /^[6-9][0-9]{9}$/;
const IS_PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (IS_PROD ? '' : 'dev-only-change');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);

const app = express();
let httpServer;
let shuttingDown = false;
let databaseRetryTimer;
let deepHealthSnapshot;
let deepHealthPromise;
let deepHealthTimer;

app.set('trust proxy', 1);
app.use((req, res, next) => {
  const requestId = req.get('x-request-id') || crypto.randomUUID();
  const startedAt = Date.now();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.on('finish', () => {
    const details = {
      requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: req.ip,
    };
    const healthPath = req.path === '/health' || req.path === '/api/health';
    if (res.statusCode >= 500 && !healthPath) logger.error('request_complete', new Error(`HTTP_${res.statusCode}`), details);
    else if (res.statusCode >= 400) logger.warn('request_complete', details);
    else logger.info('request_complete', details);
  });
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }),
);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 12 });
const leadLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 8 });
const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 6 });

const DB_CONNECT_TIMEOUT_MS = 10_000;
const DB_RETRY_MS = 30_000;
const DB_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

function dbState() {
  return DB_STATES[mongoose.connection.readyState] || 'unknown';
}

function scheduleDatabaseRetry() {
  if (databaseRetryTimer || shuttingDown || !process.env.MONGODB_URI) return;
  const retryInMs = DB_RETRY_MS;
  logger.warn('database_retry_scheduled', { retryInMs });
  databaseRetryTimer = setTimeout(async () => {
    databaseRetryTimer = undefined;
    if (shuttingDown || dbState() === 'connected') return;
    const connected = await connectDatabase();
    if (!connected) scheduleDatabaseRetry();
  }, retryInMs);
  databaseRetryTimer.unref?.();
}

mongoose.connection.on('connected', () => {
  deepHealthSnapshot = undefined;
  logger.info('database_connected', { state: 'connected' });
});
mongoose.connection.on('reconnected', () => {
  deepHealthSnapshot = undefined;
  logger.info('database_reconnected', { state: 'connected' });
});
mongoose.connection.on('disconnected', () => {
  deepHealthSnapshot = undefined;
  logger.warn('database_disconnected', { state: 'disconnected' });
  scheduleDatabaseRetry();
});
mongoose.connection.on('error', (error) => logger.error('database_error', error, { state: dbState() }));

function clean(s, max = 400) {
  return typeof s === 'string' ? s.replace(/[<>\r\n]+/g, ' ').trim().slice(0, max) : '';
}

function classify(body) {
  const mt = String(body.moveType || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (mt === 'WITHIN_CITY' || mt === 'INTRA_CITY' || mt === 'WITHIN' || body.moveType === 'Within City') return 'INTRA_CITY';
  if (mt === 'INTERSTATE') return 'INTERSTATE';
  if (mt === 'INTERCITY' || mt === 'INTRA_STATE') return 'INTERCITY';
  const fs = (body.fromState || '').trim().toLowerCase();
  const ts = (body.toState || '').trim().toLowerCase();
  if (fs && ts && fs !== ts) return 'INTERSTATE';
  const fc = (body.fromCity || '').trim().toLowerCase();
  const tc = (body.toCity || '').trim().toLowerCase();
  if (fc && tc && fc === tc) return 'INTRA_CITY';
  return 'INTERCITY';
}

function auth(req, res, next) {
  if (IS_PROD && !process.env.JWT_SECRET) {
    return res.status(503).json({ ok: false, error: 'auth_unconfigured' });
  }
  const header = req.headers.authorization;
  const cookieTok = req.cookies?.sfx_token;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : cookieTok;
  if (!token) return res.status(401).json({ ok: false, error: 'unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'expired' });
  }
}

function sign(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '8h' });
}

async function notifyLead(lead) {
  const from = [lead.fromLocality, lead.fromCity, lead.fromState].filter(Boolean).join(', ') || lead.from;
  const to = [lead.toLocality, lead.toCity, lead.toState].filter(Boolean).join(', ') || lead.to;
  const d = {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    moveType: lead.moveType,
    from,
    to,
    propertyType: lead.propertyType,
    movingDate: lead.movingDate,
    message: lead.message,
    landingPage: lead.landingPage,
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    gclid: lead.gclid,
    createdAt: lead.createdAt?.toISOString?.() || new Date().toISOString(),
  };
  const ownerTo = process.env.LEAD_EMAIL_TO || process.env.RESEND_TO || process.env.GMAIL_TO;
  const ownerStatus = await sendMail({
    to: ownerTo,
    subject: `New Shiftify Lead — ${lead.moveType} — ${from} → ${to}`,
    html: ownerEmailHtml(d),
    text: Object.entries(d).map(([k, v]) => `${k}: ${v}`).join('\n'),
  });
  let customerStatus = 'NOT_REQUESTED';
  if (lead.email) {
    customerStatus = await sendMail({
      to: lead.email,
      subject: 'Thank you for contacting Shiftify',
      html: customerEmailHtml(d, process.env.PUBLIC_LOGO_URL),
      text: 'Thank you for contacting Shiftify. Our team will contact you shortly.',
    });
  }
  logger.info('lead_email_dispatch', {
    leadId: String(lead._id),
    ownerStatus,
    customerStatus,
    customerEmailProvided: Boolean(lead.email),
  });
  lead.emailNotificationStatus = customerStatus === 'EMAIL_FAILED' ? 'CUSTOMER_EMAIL_FAILED' : ownerStatus;
  await lead.save();
  return status;
}

function healthTimeout(promise, ms = 5000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('health_check_timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function databaseHealth({ deep = false } = {}) {
  const state = dbState();
  if (!process.env.MONGODB_URI) {
    return {
      ok: false,
      status: 'not_configured',
      required: true,
      connected: false,
      state,
      message: 'MONGODB_URI is missing.',
    };
  }
  if (state !== 'connected' || !mongoose.connection.db) {
    return {
      ok: false,
      status: state === 'connecting' ? 'starting' : 'down',
      required: true,
      connected: false,
      state,
      message: `MongoDB is ${state}.`,
    };
  }
  if (!deep) {
    return {
      ok: true,
      status: 'up',
      required: true,
      connected: true,
      state,
      message: 'MongoDB connection is established.',
    };
  }
  try {
    await healthTimeout(mongoose.connection.db.admin().ping());
    return {
      ok: true,
      status: 'up',
      required: true,
      connected: true,
      state,
      message: 'MongoDB connection and ping are healthy.',
    };
  } catch (error) {
    logger.error('database_health_check_failed', error, { state });
    return {
      ok: false,
      status: 'down',
      required: true,
      connected: false,
      state,
      message: 'MongoDB ping failed. Inspect backend logs.',
    };
  }
}

async function cloudinaryHealth({ deep = false } = {}) {
  const configured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
  if (!configured) {
    return {
      ok: false,
      status: 'not_configured',
      required: false,
      connected: false,
      message: 'Cloudinary credentials are not configured. Media upload is unavailable.',
    };
  }
  if (!deep) {
    return {
      ok: true,
      status: 'configured',
      required: false,
      connected: false,
      message: 'Cloudinary credentials are present.',
    };
  }
  try {
    cldCfg();
    await healthTimeout(cloudinary.api.ping());
    return {
      ok: true,
      status: 'up',
      required: false,
      connected: true,
      message: 'Cloudinary API ping is healthy.',
    };
  } catch (error) {
    logger.error('cloudinary_health_check_failed', error);
    return {
      ok: false,
      status: 'down',
      required: false,
      connected: false,
      message: 'Cloudinary ping failed. Inspect backend logs.',
    };
  }
}

function otpHealth() {
  const provider = String(process.env.OTP_PROVIDER || 'email').toLowerCase();
  const mail = mailStatus();
  let channel = '';
  if (provider === 'sms' && process.env.SMS_API_URL && process.env.SMS_API_KEY) channel = 'sms';
  else if (provider === 'whatsapp' && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) channel = 'whatsapp';
  else if (process.env.LEAD_EMAIL_TO && mail.primary !== 'none') channel = 'email_fallback';

  if (!channel) {
    return {
      ok: false,
      status: 'not_configured',
      required: false,
      connected: false,
      provider,
      message: `OTP provider ${provider} is not fully configured.`,
    };
  }
  return {
    ok: true,
    status: 'configured',
    required: false,
    connected: false,
    provider,
    channel,
    message: `OTP will use ${channel}.`,
  };
}

function authHealth() {
  const configured = Boolean(process.env.JWT_SECRET);
  if (configured) {
    return {
      ok: true,
      status: 'up',
      required: IS_PROD,
      connected: true,
      message: 'JWT secret is configured.',
    };
  }
  return {
    ok: !IS_PROD,
    status: IS_PROD ? 'down' : 'warning',
    required: IS_PROD,
    connected: false,
    message: IS_PROD ? 'JWT_SECRET is missing in production.' : 'Development JWT fallback is active; set JWT_SECRET before production.',
  };
}

async function collectHealth({ deep = false } = {}) {
  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();
  const [database, email, cloudinaryService] = await Promise.all([
    databaseHealth({ deep }),
    mailHealth({ deep }),
    cloudinaryHealth({ deep }),
  ]);
  const services = {
    backend: {
      ok: true,
      status: 'up',
      required: true,
      connected: true,
      message: 'HTTP API is responding.',
    },
    database,
    email: { ...email, required: false, connected: email.status === 'up' },
    cloudinary: cloudinaryService,
    otp: otpHealth(),
    auth: authHealth(),
  };
  const requiredServices = Object.values(services).filter((service) => service.required);
  const ready = requiredServices.every((service) => service.ok);
  return {
    ok: true,
    db: database.ok,
    live: true,
    ready,
    status: ready ? 'ready' : 'degraded',
    service: 'shiftify-backend',
    environment: process.env.NODE_ENV || 'development',
    node: process.version,
    port: Number(process.env.PORT || 8787),
    uptimeSeconds: Math.round(process.uptime()),
    checkedAt,
    durationMs: Date.now() - startedAt,
    deep,
    services,
    notes: [
      'Live means the backend HTTP process is responding.',
      'Ready requires the database and production authentication configuration to be healthy.',
      'Email and Cloudinary checks never send an email or upload an asset.',
    ],
  };
}

const DEEP_HEALTH_INTERVAL_MS = 60_000;

async function refreshDeepHealth() {
  if (deepHealthPromise) return deepHealthPromise;
  deepHealthPromise = collectHealth({ deep: true })
    .then((report) => {
      deepHealthSnapshot = report;
      return report;
    })
    .catch((error) => {
      logger.error('deep_health_refresh_failed', error);
      return null;
    })
    .finally(() => {
      deepHealthPromise = undefined;
    });
  return deepHealthPromise;
}

function scheduleDeepHealthRefresh() {
  if (deepHealthTimer) clearTimeout(deepHealthTimer);
  if (shuttingDown) return;
  deepHealthTimer = setTimeout(async () => {
    deepHealthTimer = undefined;
    await refreshDeepHealth();
    scheduleDeepHealthRefresh();
  }, DEEP_HEALTH_INTERVAL_MS);
  deepHealthTimer.unref?.();
}

async function rootHealthReport() {
  if (deepHealthSnapshot) return deepHealthSnapshot;
  const report = await collectHealth({ deep: false });
  report.deepHealthPending = true;
  report.notes = [...report.notes, 'A deep connectivity check is running in the background; refresh shortly for live provider pings.'];
  void refreshDeepHealth();
  return report;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusLabel(status) {
  return {
    up: 'LIVE',
    configured: 'CONFIGURED',
    warning: 'WARNING',
    starting: 'STARTING',
    down: 'DOWN',
    not_configured: 'NOT CONFIGURED',
  }[status] || String(status || 'UNKNOWN').toUpperCase();
}

function renderHealthPage(report) {
  const overallClass = report.ready ? 'good' : 'warn';
  const overallLabel = report.ready ? 'ALL REQUIRED SERVICES LIVE' : 'BACKEND LIVE — CHECK SERVICES';
  const rows = Object.entries(report.services).map(([name, service]) => {
    const details = [service.message, service.state, service.provider ? `provider: ${service.provider}` : '']
      .filter(Boolean)
      .join(' · ');
    return `<tr><td><strong>${escapeHtml(name)}</strong><small>${service.required ? 'Required' : 'Optional'}</small></td><td><span class="pill ${escapeHtml(service.status)}">${escapeHtml(statusLabel(service.status))}</span></td><td>${escapeHtml(details)}</td></tr>`;
  }).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shiftify Backend Status</title>
<style>
:root{color-scheme:light;--ink:#172033;--muted:#65728a;--line:#e5eaf2;--blue:#1e3a8a;--orange:#ef7d1a;--green:#15803d;--red:#b42318;--amber:#a15c00}*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:var(--ink);font:15px/1.5 Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:980px;margin:0 auto;padding:34px 18px 56px}.brand{color:var(--blue);font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:8px 0 24px}.hero h1{font-size:clamp(28px,5vw,44px);line-height:1.05;margin:0}.hero p{color:var(--muted);margin:10px 0 0}.overall{border-radius:14px;padding:14px 18px;background:#fff;border:1px solid var(--line);font-weight:800;color:var(--green);white-space:nowrap}.overall.warn{color:var(--amber)}.card{background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 8px 28px rgba(30,58,138,.06);overflow:hidden}.meta{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--line)}.meta div{padding:14px 16px;border-right:1px solid var(--line)}.meta div:last-child{border-right:0}.meta small,td small{display:block;color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase}.meta strong{display:block;margin-top:2px;font-size:14px}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;min-width:680px}th,td{text-align:left;padding:16px;border-bottom:1px solid var(--line);vertical-align:top}th{background:#fafbfe;color:var(--muted);font-size:11px;letter-spacing:.1em;text-transform:uppercase}tr:last-child td{border-bottom:0}td small{margin-top:3px}.pill{display:inline-block;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:800;letter-spacing:.06em;background:#eef2f7;color:#536176}.pill.up{background:#dcfce7;color:var(--green)}.pill.configured{background:#e0edff;color:var(--blue)}.pill.warning,.pill.starting{background:#fff0d5;color:var(--amber)}.pill.down,.pill.not_configured{background:#fee4e2;color:var(--red)}.footer{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;color:var(--muted);font-size:13px;margin-top:18px}.footer a{color:var(--blue);font-weight:700;text-decoration:none}.notes{padding:16px 18px;color:var(--muted);font-size:13px}.notes ul{margin:6px 0 0;padding-left:20px}@media(max-width:700px){.hero{display:block}.overall{display:inline-block;margin-top:18px}.meta{grid-template-columns:repeat(2,1fr)}.meta div:nth-child(2){border-right:0}.meta div{border-bottom:1px solid var(--line)}.meta div:nth-child(3),.meta div:nth-child(4){border-bottom:0}}
</style></head><body><main class="wrap"><div class="brand">Shiftify operations</div><div class="hero"><div><h1>Backend status</h1><p>Live diagnostics for <strong>api.shiftify.in</strong>.</p></div><div class="overall ${overallClass}">${overallLabel}</div></div><section class="card"><div class="meta"><div><small>Environment</small><strong>${escapeHtml(report.environment)}</strong></div><div><small>Uptime</small><strong>${escapeHtml(report.uptimeSeconds)}s</strong></div><div><small>Checked</small><strong>${escapeHtml(report.checkedAt)}</strong></div><div><small>Check mode</small><strong>${report.deep ? 'Deep' : 'Fast'}</strong></div></div><div class="table-wrap"><table><thead><tr><th>Service</th><th>Status</th><th>Verification</th></tr></thead><tbody>${rows}</tbody></table></div><div class="notes"><strong>What the statuses mean</strong><ul>${report.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul></div></section><div class="footer"><span>Node ${escapeHtml(report.node)} · port ${escapeHtml(report.port)} · check took ${escapeHtml(report.durationMs)}ms</span><span><a href="/">Refresh</a> · <a href="/api/health?deep=1">JSON health</a></span></div></main></body></html>`;
}

async function sendHealthJson(req, res) {
  const deep = ['1', 'true', 'yes'].includes(String(req.query.deep || '').toLowerCase());
  let report;
  if (deep) {
    report = deepHealthSnapshot || await refreshDeepHealth();
    if (!report) report = await collectHealth({ deep: false });
  } else {
    report = await collectHealth({ deep: false });
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(report.ready ? 200 : 503).json(report);
}

app.get('/', async (_req, res, next) => {
  try {
    const report = await rootHealthReport();
    res.setHeader('Cache-Control', 'no-store');
    res.type('html').send(renderHealthPage(report));
  } catch (error) {
    next(error);
  }
});

app.get('/health', sendHealthJson);
app.get('/api/health', sendHealthJson);

app.get('/api/public/settings', async (_req, res) => {
  const s = (await Settings.findOne()) || {};
  const a = await Announcement.findOne({ enabled: true }).sort({ _id: -1 });
  const now = Date.now();
  const active =
    a &&
    (!a.startDate || a.startDate.getTime() <= now) &&
    (!a.endDate || a.endDate.getTime() >= now)
      ? a
      : null;
  const biz = resolveBusiness(s);
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    otpEnabled: Boolean(s.otpEnabled),
    phone: biz.values.phoneDisplay || s.phone || '',
    whatsapp: biz.values.whatsappIntl || s.whatsapp || '',
    announcement: active,
    business: biz.values,
  });
});

app.get('/api/public/blogs', async (req, res) => {
  const q = { status: 'published' };
  if (req.query.category) q.category = String(req.query.category);
  if (req.query.search) {
    const s = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    q.$or = [{ title: new RegExp(s, 'i') }, { excerpt: new RegExp(s, 'i') }, { slug: new RegExp(s, 'i') }];
  }
  const page = Math.max(1, Number(req.query.page) || 0);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || (page ? 12 : 200)));
  const skip = page ? (page - 1) * limit : 0;
  const [total, featured, posts] = await Promise.all([
    Blog.countDocuments(q),
    Blog.findOne({ status: 'published', featured: true }).lean(),
    Blog.find(q).sort({ publishedAt: -1, updatedAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  res.json({
    ok: true,
    posts,
    featured: featured || posts[0] || null,
    total,
    page: page || 1,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

app.get('/api/public/blogs/:slug', async (req, res) => {
  const post = await Blog.findOne({ slug: req.params.slug, status: 'published' }).lean();
  if (!post) return res.status(404).json({ ok: false });
  const around = await Blog.find({ status: 'published' }).sort({ publishedAt: -1 }).select('slug title publishedAt').lean();
  const i = around.findIndex((p) => p.slug === post.slug);
  res.json({
    ok: true,
    post,
    prev: i < around.length - 1 ? around[i + 1] : null,
    next: i > 0 ? around[i - 1] : null,
  });
});

async function createLeadFromBody(body) {
  const name = clean(body.name, 80);
  const phone = clean(body.phone, 10);
  if (!name || !PHONE_RE.test(phone)) return { error: 'invalid', status: 400 };
  const recent = await Lead.findOne({ phone, createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } });
  if (recent) return { lead: recent, duplicate: true };
  const moveType = classify(body);
  const lead = await Lead.create({
    name,
    phone,
    email: clean(body.email, 120),
    moveType,
    fromCity: clean(body.fromCity || body.withinCity, 80),
    fromState: clean(body.fromState, 80),
    fromLocality: clean(body.fromLocality, 80),
    toCity: clean(body.toCity, 80),
    toState: clean(body.toState, 80),
    toLocality: clean(body.toLocality, 80),
    from: clean(body.from, 160),
    to: clean(body.to, 160),
    propertyType: clean(body.propertyType, 30),
    movingDate: clean(body.date || body.movingDate, 20),
    message: clean(body.message, 900),
    source: clean(body.source, 80),
    landingPage: clean(body.landingPage, 200),
    utmSource: clean(body.utmSource || body.utm_source, 80),
    utmMedium: clean(body.utmMedium || body.utm_medium, 80),
    utmCampaign: clean(body.utmCampaign || body.utm_campaign, 80),
    utmTerm: clean(body.utmTerm || body.utm_term, 80),
    utmContent: clean(body.utmContent || body.utm_content, 80),
    gclid: clean(body.gclid, 80),
    verificationEnabled: Boolean(body.verificationEnabled),
    verificationStatus: body.verificationStatus || 'NONE',
  });
  try {
    await notifyLead(lead);
  } catch (e) {
    logger.error('lead_notification_failed', e, { leadId: String(lead._id) });
    try {
      lead.emailNotificationStatus = 'failed';
      await lead.save();
    } catch { /* lead already persisted */ }
  }
  return { lead };
}

app.post('/api/lead', leadLimiter, async (req, res) => {
  try {
    if (req.body?.company) return res.json({ ok: true });
    const settings = (await Settings.findOne()) || { otpEnabled: false };
    if (settings.otpEnabled) {
      return res.status(409).json({ ok: false, error: 'otp_required' });
    }
    const out = await createLeadFromBody(req.body || {});
    if (out.error) return res.status(out.status).json({ ok: false, error: out.error });
    res.json({ ok: true, id: out.lead._id });
  } catch (e) {
    logger.error('lead_request_failed', e, { requestId: req.requestId });
    res.status(500).json({ ok: false, error: 'server_error', requestId: req.requestId });
  }
});

app.post('/api/otp/request', otpLimiter, async (req, res) => {
  try {
    const settings = (await Settings.findOne()) || { otpEnabled: false };
    if (!settings.otpEnabled) return res.status(400).json({ ok: false, error: 'otp_off' });
    const phone = clean(req.body?.phone, 10);
    if (!PHONE_RE.test(phone)) return res.status(400).json({ ok: false, error: 'invalid_phone' });
    const last = await Otp.findOne({ phone }).sort({ _id: -1 });
    if (last && Date.now() - new Date(last.createdAt || 0).getTime() < 45 * 1000) {
      return res.status(429).json({ ok: false, error: 'cooldown' });
    }
    const code = String(crypto.randomInt(100000, 1000000));
    const hash = crypto.createHmac('sha256', process.env.OTP_PEPPER || JWT_SECRET).update(code + phone).digest('hex');
    await Otp.create({
      phone,
      hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      payload: req.body?.payload || {},
    });
    await deliverOtp({ phone, code });
    res.json({ ok: true });
  } catch (e) {
    logger.error('otp_request_failed', e, { requestId: req.requestId });
    res.status(500).json({ ok: false, error: 'otp_error', requestId: req.requestId });
  }
});

app.post('/api/otp/verify', otpLimiter, async (req, res) => {
  try {
    const phone = clean(req.body?.phone, 10);
    const code = clean(req.body?.code, 6);
    const rec = await Otp.findOne({ phone, used: false }).sort({ _id: -1 });
    if (!rec) return res.status(400).json({ ok: false, error: 'no_otp' });
    if (rec.expiresAt < new Date()) return res.status(400).json({ ok: false, error: 'expired' });
    if (rec.attempts >= 5) return res.status(429).json({ ok: false, error: 'max_attempts' });
    rec.attempts += 1;
    const hash = crypto.createHmac('sha256', process.env.OTP_PEPPER || JWT_SECRET).update(code + phone).digest('hex');
    if (hash !== rec.hash) {
      await rec.save();
      return res.status(400).json({ ok: false, error: 'bad_code' });
    }
    rec.used = true;
    await rec.save();
    const payload = { ...(rec.payload || {}), phone, verificationEnabled: true, verificationStatus: 'VERIFIED' };
    const out = await createLeadFromBody(payload);
    if (out.error) return res.status(out.status).json({ ok: false, error: out.error });
    res.json({ ok: true, id: out.lead._id });
  } catch (e) {
    logger.error('otp_verify_failed', e, { requestId: req.requestId });
    res.status(500).json({ ok: false, error: 'otp_error', requestId: req.requestId });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  if (IS_PROD && !process.env.JWT_SECRET) {
    return res.status(503).json({ ok: false, error: 'auth_unconfigured' });
  }
  const email = clean(req.body?.email, 120).toLowerCase();
  const password = String(req.body?.password || '');
  const user = await User.findOne({ email });
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !passwordMatches) {
    logger.warn('auth_login_failed', {
      requestId: req.requestId,
      email,
      reason: user ? 'password_mismatch' : 'user_not_found',
    });
    return res.status(401).json({ ok: false, error: 'invalid_credentials', requestId: req.requestId });
  }
  const token = sign(user);
  logger.info('auth_login_success', { requestId: req.requestId, email, userId: String(user._id) });
  res.cookie('sfx_token', token, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 8 * 3600 * 1000 });
  res.json({ ok: true, token });
});

app.post('/api/auth/logout', auth, (_req, res) => {
  res.clearCookie('sfx_token');
  res.json({ ok: true });
});

app.get('/api/crm/dashboard', auth, async (_req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [total, neu, today, intra, inter, state, contacted, follow, converted] = await Promise.all([
    Lead.countDocuments(),
    Lead.countDocuments({ leadStatus: 'NEW' }),
    Lead.countDocuments({ createdAt: { $gte: start } }),
    Lead.countDocuments({ moveType: 'INTRA_CITY' }),
    Lead.countDocuments({ moveType: 'INTERCITY' }),
    Lead.countDocuments({ moveType: 'INTERSTATE' }),
    Lead.countDocuments({ leadStatus: 'CONTACTED' }),
    Lead.countDocuments({ leadStatus: 'FOLLOW_UP' }),
    Lead.countDocuments({ leadStatus: 'CONVERTED' }),
  ]);
  const recent = await Lead.find().sort({ createdAt: -1 }).limit(8).lean();
  res.json({ ok: true, stats: { total, neu, today, intra, inter, state, contacted, follow, converted }, recent });
});

app.get('/api/crm/leads', auth, async (req, res) => {
  const q = {};
  if (req.query.moveType) q.moveType = req.query.moveType;
  if (req.query.status) q.leadStatus = req.query.status;
  if (req.query.search) {
    const s = String(req.query.search);
    q.$or = [
      { name: new RegExp(s, 'i') },
      { phone: new RegExp(s, 'i') },
      { fromCity: new RegExp(s, 'i') },
      { toCity: new RegExp(s, 'i') },
      { fromLocality: new RegExp(s, 'i') },
    ];
  }
  const leads = await Lead.find(q).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ ok: true, leads });
});

app.get('/api/crm/leads/:id', auth, async (req, res) => {
  const lead = await Lead.findById(req.params.id).lean();
  if (!lead) return res.status(404).json({ ok: false });
  res.json({ ok: true, lead });
});

app.patch('/api/crm/leads/:id', auth, async (req, res) => {
  const allowed = {};
  if (req.body.leadStatus) allowed.leadStatus = req.body.leadStatus;
  if (typeof req.body.notes === 'string') allowed.notes = clean(req.body.notes, 2000);
  if (typeof req.body.followUpDate === 'string') allowed.followUpDate = clean(req.body.followUpDate, 20);
  const lead = await Lead.findByIdAndUpdate(req.params.id, allowed, { new: true });
  res.json({ ok: true, lead });
});

app.post('/api/crm/leads/:id/retry-email', auth, async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ ok: false });
  const status = await notifyLead(lead);
  res.json({ ok: true, status });
});

app.post('/api/crm/email', auth, async (req, res) => {
  const to = clean(req.body.to, 120);
  const subject = clean(req.body.subject, 160);
  const message = clean(req.body.message, 5000);
  if (!to || !subject || !message) return res.status(400).json({ ok: false, error: 'invalid' });
  const status = await sendMail({
    to,
    subject,
    html: `<div style="font-family:Arial,sans-serif">${message.replace(/\n/g, '<br/>')}</div>`,
    text: message,
  });
  res.json({ ok: true, status });
});

app.get('/api/crm/settings', auth, async (_req, res) => {
  const s = (await Settings.findOne()) || (await Settings.create({ otpEnabled: false }));
  res.json({
    ok: true,
    settings: s,
    status: mailStatus(),
    otp: s.otpEnabled ? 'ON' : 'OFF',
    services: {
      database: mongoose.connection.readyState === 1 ? 'Connected' : 'Unavailable',
      jwt: process.env.JWT_SECRET ? 'Configured' : 'Not configured',
      cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Not configured',
      email: mailStatus() || 'Not configured',
    },
  });
});

app.get('/api/crm/business', auth, async (_req, res) => {
  const s = (await Settings.findOne()) || (await Settings.create({ otpEnabled: false }));
  const biz = resolveBusiness(s);
  res.json({ ok: true, ...biz });
});

app.patch('/api/crm/business', auth, async (req, res) => {
  const s = (await Settings.findOne()) || (await Settings.create({ otpEnabled: false }));
  const body = req.body || {};
  const next = { ...(s.business || {}) };
  const nextSrc = { ...(s.businessSources || {}) };
  if (body.values && typeof body.values === 'object') {
    for (const k of BIZ_KEYS) {
      if (typeof body.values[k] === 'string') next[k] = body.values[k].trim();
    }
  }
  if (body.sources && typeof body.sources === 'object') {
    for (const k of BIZ_KEYS) {
      const m = body.sources[k];
      if (BIZ_MODES.has(m)) nextSrc[k] = m;
    }
  }
  if (next.phoneIntl) next.phoneIntl = next.phoneIntl.replace(/\D/g, '');
  if (next.whatsappIntl) next.whatsappIntl = next.whatsappIntl.replace(/\D/g, '');
  if (next.email && next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) {
    return res.status(400).json({ ok: false, error: 'invalid_email' });
  }
  s.business = next;
  s.businessSources = nextSrc;
  await s.save();
  res.json({ ok: true, ...resolveBusiness(s) });
});

app.patch('/api/crm/settings', auth, async (req, res) => {
  const s = (await Settings.findOne()) || (await Settings.create({}));
  ['otpEnabled', 'phone', 'whatsapp', 'email', 'address', 'blogAuthorDefault'].forEach((k) => {
    if (req.body[k] !== undefined) s[k] = req.body[k];
  });
  await s.save();
  res.json({ ok: true, settings: s });
});

app.post('/api/crm/settings/test-email', auth, async (req, res) => {
  const to = clean(req.body?.to, 120) || process.env.LEAD_EMAIL_TO || process.env.RESEND_TO || process.env.GMAIL_TO;
  if (!to) return res.status(400).json({ ok: false, error: 'no_recipient' });
  const status = await sendMail({
    to,
    subject: 'Shiftify email provider test',
    html: '<p>This is a Shiftify CRM email-provider test. If you received this, outbound mail is working.</p>',
    text: 'This is a Shiftify CRM email-provider test. If you received this, outbound mail is working.',
  });
  res.json({ ok: true, status, to });
});

app.get('/api/crm/email/preview', auth, (_req, res) => {
  const sample = {
    name: 'Sample Customer',
    phone: '8766331715',
    email: 'sample@example.com',
    moveType: 'INTERCITY',
    from: 'Delhi',
    to: 'Gurgaon',
    propertyType: '2 BHK',
    movingDate: '2026-10-01',
    message: 'Preview only — not a real lead.',
    landingPage: '/',
    createdAt: new Date().toISOString(),
  };
  res.json({
    ok: true,
    owner: ownerEmailHtml(sample),
    customer: customerEmailHtml(sample, process.env.PUBLIC_LOGO_URL),
  });
});

const HTML_SANITIZE = {
  allowedTags: ['h2', 'h3', 'h4', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br'],
  allowedAttributes: {
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'width', 'height'],
  },
  allowedSchemes: ['http', 'https'],
};

function sanitizeBlogBody(b) {
  if (b.contentMode === 'html' && b.content) b.content = sanitizeHtml(b.content, HTML_SANITIZE);
  if (typeof b.slug === 'string') b.slug = b.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  if (Array.isArray(b.tags)) {
    b.tags = [...new Set(b.tags.map((t) => String(t).trim()).filter(Boolean).map((t) => t[0].toUpperCase() + t.slice(1).toLowerCase()))];
  }
  return b;
}

async function ensureSingleFeatured(id) {
  await Blog.updateMany({ _id: { $ne: id }, featured: true }, { $set: { featured: false } });
}

async function slugTaken(slug, exceptId) {
  if (!slug) return false;
  const q = { slug };
  if (exceptId) q._id = { $ne: exceptId };
  return Boolean(await Blog.findOne(q).select('_id'));
}

function publishReady(b, existing = {}) {
  const title = b.title ?? existing.title;
  const slug = b.slug ?? existing.slug;
  const excerpt = b.excerpt ?? existing.excerpt;
  const content = b.content ?? existing.content;
  const banner = b.bannerImage || b.featuredImage || existing.bannerImage || existing.featuredImage;
  if (!title || !slug || !excerpt || !content) return 'required';
  if (!banner) return 'banner_required';
  return null;
}

app.get('/api/crm/blogs', auth, async (req, res) => {
  const q = {};
  if (req.query.status) q.status = req.query.status;
  if (req.query.category) q.category = req.query.category;
  if (req.query.search) {
    const s = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    q.$or = [{ title: new RegExp(s, 'i') }, { excerpt: new RegExp(s, 'i') }, { slug: new RegExp(s, 'i') }];
  }
  const sortKey = req.query.sort || 'updated';
  const sort = sortKey === 'oldest' ? { publishedAt: 1, createdAt: 1 }
    : sortKey === 'alpha' ? { title: 1 }
    : sortKey === 'newest' ? { publishedAt: -1, createdAt: -1 }
    : { updatedAt: -1 };
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const [total, published, drafts, unpublished, posts] = await Promise.all([
    Blog.countDocuments(q),
    Blog.countDocuments({ status: 'published' }),
    Blog.countDocuments({ status: 'draft' }),
    Blog.countDocuments({ status: 'unpublished' }),
    Blog.find(q).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  res.json({
    ok: true,
    posts,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    stats: { total: published + drafts + unpublished, published, drafts, unpublished },
  });
});

app.get('/api/crm/blogs/slug', auth, async (req, res) => {
  const slug = String(req.query.slug || '');
  const except = req.query.except || '';
  res.json({ ok: true, taken: await slugTaken(slug, except || undefined) });
});

app.post('/api/crm/blogs', auth, async (req, res) => {
  const b = sanitizeBlogBody(req.body || {});
  if (await slugTaken(b.slug)) return res.status(409).json({ ok: false, error: 'slug_taken' });
  if (b.status === 'published') {
    const miss = publishReady(b);
    if (miss) return res.status(400).json({ ok: false, error: miss });
    if (!b.publishedAt) b.publishedAt = new Date();
  }
  const post = await Blog.create(b);
  if (post.featured) await ensureSingleFeatured(post._id);
  res.json({ ok: true, post });
});

app.patch('/api/crm/blogs/:id', auth, async (req, res) => {
  const b = sanitizeBlogBody(req.body || {});
  const existing = await Blog.findById(req.params.id);
  if (!existing) return res.status(404).json({ ok: false });
  if (b.slug && (await slugTaken(b.slug, existing._id))) return res.status(409).json({ ok: false, error: 'slug_taken' });
  if (b.status === 'published') {
    const miss = publishReady(b, existing);
    if (miss) return res.status(400).json({ ok: false, error: miss });
    if (!b.publishedAt && !existing.publishedAt) b.publishedAt = new Date();
  }
  const post = await Blog.findByIdAndUpdate(req.params.id, b, { new: true });
  res.json({ ok: true, post });
});

app.delete('/api/crm/blogs/:id', auth, async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

const MEDIA_CATS = ['LANDING_PAGE', 'BLOG', 'REVIEW', 'SERVICE', 'CITY', 'LOCALITY', 'GENERAL'];
const MEDIA_SECTIONS = [
  'HERO', 'ABOUT', 'SERVICES', 'PROCESS', 'WHY_SHIFTIFY', 'PACKING',
  'HOUSE_SHIFTING', 'OFFICE_SHIFTING', 'INTERCITY', 'VEHICLE_MOVING',
  'TESTIMONIALS', 'CTA', 'FOOTER', 'OTHER',
];

function mediaPublic(m) {
  return {
    id: String(m._id),
    title: m.title || '',
    alt: m.alt || '',
    url: m.url || '',
    category: m.category || 'GENERAL',
    section: m.section || 'OTHER',
    width: m.width || 0,
    height: m.height || 0,
    sortOrder: m.sortOrder || 0,
    locationSlug: m.locationSlug || '',
  };
}

function cldCfg() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

app.get('/api/public/media', async (req, res) => {
  const q = { isActive: { $ne: false } };
  const cat = String(req.query.category || '').toUpperCase();
  const sec = String(req.query.section || '').toUpperCase();
  if (MEDIA_CATS.includes(cat)) q.category = cat;
  if (MEDIA_SECTIONS.includes(sec)) q.section = sec;
  const items = await Media.find(q).sort({ sortOrder: 1, createdAt: 1 }).lean();
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ ok: true, success: true, data: items.map(mediaPublic) });
});

app.get('/api/crm/media', auth, async (req, res) => {
  const q = {};
  const cat = String(req.query.category || '').toUpperCase();
  const sec = String(req.query.section || '').toUpperCase();
  const st = String(req.query.status || '');
  const search = String(req.query.search || '').trim();
  if (MEDIA_CATS.includes(cat)) q.category = cat;
  if (MEDIA_SECTIONS.includes(sec)) q.section = sec;
  if (st === 'active') q.isActive = true;
  if (st === 'inactive') q.isActive = false;
  if (search) q.$or = [{ title: new RegExp(search, 'i') }, { alt: new RegExp(search, 'i') }];
  res.json({ ok: true, items: await Media.find(q).sort({ sortOrder: 1, createdAt: -1 }).lean() });
});

app.post('/api/crm/media', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'no_file' });
    const mime = req.file.mimetype;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) {
      return res.status(400).json({ ok: false, error: 'bad_type' });
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME) return res.status(503).json({ ok: false, error: 'cloudinary_unconfigured' });
    const category = MEDIA_CATS.includes(String(req.body?.category).toUpperCase())
      ? String(req.body.category).toUpperCase() : 'GENERAL';
    const section = MEDIA_SECTIONS.includes(String(req.body?.section).toUpperCase())
      ? String(req.body.section).toUpperCase() : 'OTHER';
    const tags = ['shiftify', category.toLowerCase().replace('_', '-'), section.toLowerCase().replace('_', '-')];
    cldCfg();
    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'shiftify', tags, context: `alt=${clean(req.body?.alt || req.body?.title, 120)}` },
        (err, result) => { if (err) reject(err); else resolve(result); },
      );
      stream.end(req.file.buffer);
    });
    const item = await Media.create({
      publicId: uploaded.public_id,
      url: uploaded.secure_url,
      title: clean(req.body?.title, 120),
      alt: clean(req.body?.alt, 180),
      description: clean(req.body?.description, 400),
      category,
      section,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
      bytes: uploaded.bytes,
      isActive: req.body?.isActive !== 'false' && req.body?.isActive !== false,
      sortOrder: Number(req.body?.sortOrder) || 0,
      locationSlug: clean(req.body?.locationSlug, 40).toLowerCase(),
    });
    res.json({ ok: true, item });
  } catch (e) {
    logger.error('media_upload_failed', e, { requestId: req.requestId });
    res.status(500).json({ ok: false, error: 'upload_error', requestId: req.requestId });
  }
});

app.patch('/api/crm/media/:id', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ ok: false, error: 'invalid_id' });
  const b = req.body || {};
  const patch = {};
  if (typeof b.title === 'string') patch.title = clean(b.title, 120);
  if (typeof b.alt === 'string') patch.alt = clean(b.alt, 180);
  if (typeof b.description === 'string') patch.description = clean(b.description, 400);
  if (MEDIA_CATS.includes(b.category)) patch.category = b.category;
  if (MEDIA_SECTIONS.includes(b.section)) patch.section = b.section;
  if (typeof b.isActive === 'boolean') patch.isActive = b.isActive;
  if (b.sortOrder !== undefined) patch.sortOrder = Number(b.sortOrder) || 0;
  if (typeof b.locationSlug === 'string') patch.locationSlug = clean(b.locationSlug, 40).toLowerCase();
  const item = await Media.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!item) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, item });
});

app.delete('/api/crm/media/:id', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ ok: false, error: 'invalid_id' });
  const destroyCloud = String(req.query.cloudinary || '') === '1';
  const item = await Media.findById(req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: 'not_found' });
  if (destroyCloud && item.publicId && process.env.CLOUDINARY_API_SECRET) {
    cldCfg();
    try { await cloudinary.uploader.destroy(item.publicId); } catch {}
  }
  await Media.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.get('/api/crm/announcements', auth, async (_req, res) => {
  res.json({ ok: true, items: await Announcement.find().sort({ _id: -1 }).lean() });
});

app.post('/api/crm/announcements', auth, async (req, res) => {
  const b = req.body || {};
  const text = clean(b.text, 180);
  if (!text) return res.status(400).json({ ok: false, error: 'required' });
  let ctaUrl = clean(b.ctaUrl, 200);
  if (ctaUrl && !/^https?:\/\//i.test(ctaUrl) && !ctaUrl.startsWith('/')) ctaUrl = '';
  const payload = {
    enabled: Boolean(b.enabled),
    text,
    ctaLabel: clean(b.ctaLabel, 40),
    ctaUrl,
    position: ['LEFT', 'CENTER', 'RIGHT'].includes(b.position) ? b.position : 'CENTER',
    background: clean(b.background, 20) || '#1e3a8a',
    textColor: clean(b.textColor, 20) || '#ffffff',
  };
  const existing = await Announcement.findOne().sort({ _id: -1 });
  const item = existing
    ? await Announcement.findByIdAndUpdate(existing._id, payload, { new: true })
    : await Announcement.create(payload);
  res.json({ ok: true, item });
});

app.patch('/api/crm/announcements/:id', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ ok: false, error: 'invalid_id' });
  const b = req.body || {};
  const patch = {};
  if (typeof b.enabled === 'boolean') patch.enabled = b.enabled;
  if (typeof b.text === 'string') patch.text = clean(b.text, 180);
  if (typeof b.ctaLabel === 'string') patch.ctaLabel = clean(b.ctaLabel, 40);
  if (typeof b.ctaUrl === 'string') {
    let u = clean(b.ctaUrl, 200);
    if (u && !/^https?:\/\//i.test(u) && !u.startsWith('/')) u = '';
    patch.ctaUrl = u;
  }
  if (b.position && ['LEFT', 'CENTER', 'RIGHT'].includes(b.position)) patch.position = b.position;
  if (typeof b.background === 'string') patch.background = clean(b.background, 20);
  if (typeof b.textColor === 'string') patch.textColor = clean(b.textColor, 20);
  const item = await Announcement.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!item) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, item });
});

app.delete('/api/crm/announcements/:id', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ ok: false, error: 'invalid_id' });
  const item = await Announcement.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true });
});

app.get('/api/public/reviews', async (_req, res) => {
  const reviews = await Review.find({ status: 'published' }).sort({ createdAt: -1 }).lean();
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    reviews: reviews.map((r) => ({
      name: r.name,
      text: r.text,
      rating: r.rating,
      image: r.image || '',
    })),
  });
});

function reviewPayload(body, existing) {
  const name = clean(body?.name, 80);
  const text = clean(body?.text, 1200);
  const rating = Number(body?.rating);
  const status = body?.status === 'published' ? 'published' : 'unpublished';
  let image = existing?.image || '';
  if (Object.prototype.hasOwnProperty.call(body || {}, 'image')) {
    image = clean(body.image, 500);
  }
  return { name, text, rating, status, image };
}

app.get('/api/crm/reviews', auth, async (_req, res) => {
  res.json({ ok: true, items: await Review.find().sort({ createdAt: -1 }).lean() });
});

app.post('/api/crm/reviews', auth, async (req, res) => {
  const p = reviewPayload(req.body || {});
  if (!p.name || !p.text) return res.status(400).json({ ok: false, error: 'required' });
  if (!Number.isInteger(p.rating) || p.rating < 1 || p.rating > 5) p.rating = 5;
  const item = await Review.create(p);
  res.json({ ok: true, item });
});

app.patch('/api/crm/reviews/:id', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ ok: false, error: 'invalid_id' });
  const existing = await Review.findById(req.params.id);
  if (!existing) return res.status(404).json({ ok: false, error: 'not_found' });
  const p = reviewPayload(req.body || {}, existing);
  if (!p.name || !p.text) return res.status(400).json({ ok: false, error: 'required' });
  if (!Number.isInteger(p.rating) || p.rating < 1 || p.rating > 5) return res.status(400).json({ ok: false, error: 'rating' });
  existing.name = p.name;
  existing.text = p.text;
  existing.rating = p.rating;
  existing.status = p.status;
  existing.image = p.image;
  await existing.save();
  res.json({ ok: true, item: existing });
});

app.delete('/api/crm/reviews/:id', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ ok: false, error: 'invalid_id' });
  const item = await Review.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true });
});

app.use((req, res) => {
  logger.warn('route_not_found', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl.split('?')[0],
  });
  res.status(404).json({ ok: false, error: 'not_found', requestId: req.requestId });
});

app.use((error, req, res, next) => {
  logger.error('request_error', error, {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl.split('?')[0],
  });
  if (res.headersSent) return next(error);
  const status = Number(error.status || error.statusCode);
  const httpStatus = status >= 400 && status < 600 ? status : 500;
  const code = error.type === 'entity.parse.failed'
    ? 'invalid_json'
    : httpStatus === 413
      ? 'payload_too_large'
      : 'server_error';
  res.status(httpStatus).json({ ok: false, error: code, requestId: req.requestId });
});

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    logger.warn('database_not_configured', { message: 'MONGODB_URI missing — CRM persistence disabled.' });
    return false;
  }

  const serverSelectionTimeoutMS = DB_CONNECT_TIMEOUT_MS;
  try {
    logger.info('database_connecting', { timeoutMs: serverSelectionTimeoutMS });
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS });
    logger.info('database_ready', { state: dbState() });
  } catch (error) {
    logger.error('database_startup_connection_failed', error, { state: dbState() });
    return false;
  }

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (email && process.env.ADMIN_PASSWORD) {
    try {
      const existing = await User.findOne({ email });
      if (!existing) {
        await User.create({
          email,
          passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
        });
        logger.info('admin_seeded', { email });
      } else {
        logger.info('admin_seed_skipped', { email, reason: 'already_exists' });
      }
    } catch (error) {
      logger.error('admin_seed_failed', error, { email });
    }
  }

  try {
    await Settings.findOneAndUpdate({}, {}, { upsert: true, setDefaultsOnInsert: true });
    logger.info('database_initialization_complete');
  } catch (error) {
    logger.error('database_initialization_failed', error);
  }
  deepHealthSnapshot = undefined;
  void refreshDeepHealth();
  return true;
}

async function boot() {
  const port = Number(process.env.PORT || 8787);
  httpServer = await new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0');
    server.once('error', reject);
    server.once('listening', () => resolve(server));
  });
  logger.info('backend_listening', {
    host: '0.0.0.0',
    port,
    environment: process.env.NODE_ENV || 'development',
    node: process.version,
  });

  const databaseReady = await connectDatabase();
  if (!databaseReady) {
    logger.warn('backend_degraded', {
      message: 'HTTP server is live, but database-dependent routes may fail until MongoDB is connected.',
    });
    scheduleDatabaseRetry();
  }
  void refreshDeepHealth();
  scheduleDeepHealthRefresh();
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (databaseRetryTimer) {
    clearTimeout(databaseRetryTimer);
    databaseRetryTimer = undefined;
  }
  if (deepHealthTimer) {
    clearTimeout(deepHealthTimer);
    deepHealthTimer = undefined;
  }
  logger.info('backend_shutdown_started', { signal });
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  await mongoose.disconnect().catch((error) => logger.error('database_shutdown_failed', error));
  logger.info('backend_shutdown_complete', { signal });
  process.exit(0);
}

process.on('warning', (warning) => {
  logger.warn('node_warning', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack,
  });
});
process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', reason);
});
process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', error);
  shutdown('uncaughtException').catch(() => process.exit(1));
});
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

boot().catch((error) => {
  logger.error('backend_boot_failed', error);
  process.exit(1);
});
