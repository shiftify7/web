/**
 * POST /api/lead — Shiftify lead intake (Cloudflare Pages Function).
 *
 * Secrets live ONLY in server-side environment variables (Pages dashboard /
 * wrangler secret). Nothing here is ever shipped to the browser bundle.
 *
 *   LEAD_EMAIL_TO   = where leads are mailed (e.g. shiftify@gmail.com)
 *   LEAD_EMAIL_FROM = verified sender address
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD = any SMTP relay that
 *        exposes an HTTPS API equivalent is wired below via MailChannels-style
 *        fetch; raw SMTP sockets aren't available in Workers, so we post to
 *        the relay's HTTPS endpoint (set SMTP_HOST to it).
 *
 * Validation is re-done server-side (client validation is UX only).
 * Abuse protection: honeypot field + per-IP soft rate limit in module scope
 * (per-isolate, best-effort — cheap and adequate for a lead form).
 */

type PagesFunction<Env = unknown> = (context: {
  request: Request;
  env: Env;
  waitUntil: (p: Promise<unknown>) => void;
}) => Response | Promise<Response>;

type LeadBody = {
  name?: string;
  phone?: string;
  email?: string;
  moveType?: string;
  from?: string;
  to?: string;
  propertyType?: string;
  date?: string;
  message?: string;
  service?: string;
  source?: string;
  company?: string; // honeypot
  submittedAt?: string;
};

const PHONE_RE = /^[6-9][0-9]{9}$/;
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) return true;
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

const clean = (s: unknown, max = 500): string =>
  typeof s === 'string' ? s.replace(/[<>\r\n]+/g, ' ').trim().slice(0, max) : '';

function emailHtml(b: Required<Pick<LeadBody, never>> & Record<string, string>): string {
  const row = (label: string, value: string) =>
    value
      ? `<tr><td style="padding:7px 14px 7px 0;color:#64748b;font-size:12px;letter-spacing:.08em;text-transform:uppercase;vertical-align:top;white-space:nowrap">${label}</td><td style="padding:7px 0;color:#0f172a;font-size:14px">${value}</td></tr>`
      : '';
  const tel = `tel:+91${b.phone}`;
  const wa = `https://wa.me/91${b.phone}?text=${encodeURIComponent('Hi ' + (b.name || '') + ', this is Shiftify Packers & Movers regarding your moving enquiry.')}`;
  return `<!doctype html><html><body style="margin:0;background:#f4f7fe;padding:24px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dbe4f5;border-radius:10px;overflow:hidden">
    <div style="background:#1e3a8a;padding:16px 22px">
      <span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:.02em">New Shiftify Moving Lead</span>
      <span style="float:right;background:#ef7d1a;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;letter-spacing:.06em">LEAD</span>
    </div>
    <div style="padding:18px 22px">
      <table style="border-collapse:collapse;width:100%">
        ${row('Customer Name', b.name)}
        ${row('Mobile', b.phone)}
        ${row('Email', b.email || '—')}
        ${row('Move Type', b.moveType)}
        ${row('From', b.from)}
        ${row('To', b.to)}
        ${row('Property Type', b.propertyType)}
        ${row('Preferred Date', b.date)}
        ${row('Service', b.service || '—')}
        ${row('Page', b.source)}
        ${row('Requirements', b.message || '—')}
        ${row('Submitted At', b.submittedAt)}
      </table>
      <div style="margin-top:18px">
        <a href="${tel}" style="display:inline-block;background:#1e3a8a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 16px;border-radius:6px;margin-right:8px">Call Customer</a>
        <a href="${wa}" style="display:inline-block;background:#1fa855;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 16px;border-radius:6px">WhatsApp Customer</a>
      </div>
    </div>
    <div style="padding:12px 22px;border-top:1px solid #eef2fb;color:#8a97ab;font-size:11px">
      Shiftify Packers & Movers · lead form · pricing is discussed after contact, never shown on site
    </div>
  </div></body></html>`;
}

export const onRequestPost: PagesFunction = async (ctx) => {
  const headers = { 'content-type': 'application/json' };
  try {
    const ip = ctx.request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (limited(ip)) {
      return new Response(JSON.stringify({ ok: false, error: 'rate_limited' }), { status: 429, headers });
    }

    const b = (await ctx.request.json()) as LeadBody;

    // Honeypot: bots fill hidden fields — accept quietly, send nothing.
    if (b.company && b.company.trim() !== '') {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    const name = clean(b.name, 80);
    const phone = clean(b.phone, 10);
    const from = clean(b.from, 160);
    const to = clean(b.to, 160);
    if (!name || !PHONE_RE.test(phone) || !from || !to) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid' }), { status: 400, headers });
    }

    const data = {
      name,
      phone,
      email: clean(b.email, 120),
      moveType: clean(b.moveType, 40) || 'Within City',
      from,
      to,
      propertyType: clean(b.propertyType, 30),
      date: clean(b.date, 20),
      message: clean(b.message, 900),
      service: clean(b.service, 80),
      source: clean(b.source, 80),
      submittedAt: clean(b.submittedAt, 40) || new Date().toISOString(),
    };

    const env = ctx.env as Record<string, string | undefined>;
    const toAddr = env.LEAD_EMAIL_TO;
    const fromAddr = env.LEAD_EMAIL_FROM;
    const relay = env.SMTP_HOST; // HTTPS endpoint of the chosen mail relay

    if (!toAddr || !fromAddr || !relay) {
      console.error('lead-endpoint: mail env not configured');
      return new Response(JSON.stringify({ ok: false, error: 'mail_not_configured' }), { status: 503, headers });
    }

    const subject = `New Shiftify Moving Lead — ${data.from} to ${data.to}`;
    const sendRes = await fetch(relay, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${btoa(`${env.SMTP_USER ?? 'api'}:${env.SMTP_PASSWORD ?? ''}`)}`,
      },
      body: JSON.stringify({
        from: fromAddr,
        to: [toAddr],
        subject,
        html: emailHtml(data as any),
        text: [
          'NEW SHIFTIFY LEAD', '',
          `Customer Name: ${data.name}`,
          `Mobile: ${data.phone}`,
          `Email: ${data.email || '-'}`,
          `Move Type: ${data.moveType}`,
          `From: ${data.from}`,
          `To: ${data.to}`,
          `Property Type: ${data.propertyType}`,
          `Preferred Moving Date: ${data.date}`,
          `Additional Requirements: ${data.message || '-'}`,
          `Submitted At: ${data.submittedAt}`,
        ].join('\n'),
      }),
    });
    if (!sendRes.ok) {
      console.error('lead-endpoint: relay rejected', sendRes.status);
      return new Response(JSON.stringify({ ok: false, error: 'send_failed' }), { status: 502, headers });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    console.error('lead-endpoint: exception', err);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), { status: 500, headers });
  }
};
