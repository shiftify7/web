import nodemailer from 'nodemailer';
import { FRONTEND, envMap } from './business.js';
import { logger } from './logger.js';

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function digits(s = '') {
  return String(s || '').replace(/\D/g, '');
}

function intlPhone(s = '') {
  const d = digits(s);
  if (!d) return '';
  return d.startsWith('91') && d.length >= 12 ? d : `91${d}`;
}

/** Public contact values come from the same backend business resolver used by CRM/settings. */
function publicBusiness() {
  const env = envMap();
  return {
    ...FRONTEND,
    phoneDisplay: env.phoneDisplay || FRONTEND.phoneDisplay,
    phoneIntl: digits(env.phoneIntl || FRONTEND.phoneIntl),
    whatsappIntl: digits(env.whatsappIntl || FRONTEND.whatsappIntl),
    email: env.email || FRONTEND.email,
  };
}

function contactLinks(business) {
  const phone = intlPhone(business.phoneIntl);
  const whatsapp = intlPhone(business.whatsappIntl);
  return {
    tel: phone ? `tel:+${phone}` : '',
    wa: whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent('Hi Shiftify, I need help with my moving enquiry.')}` : '',
  };
}

function emailCss() {
  return `<style>
    @media screen and (max-width:620px) {
      .sfx-shell { width:100% !important; }
      .sfx-pad { padding-left:20px !important; padding-right:20px !important; }
      .sfx-button { display:block !important; margin:0 0 10px !important; text-align:center !important; }
      .sfx-title { font-size:24px !important; }
    }
  </style>`;
}

export function ownerEmailHtml(d) {
  const business = publicBusiness();
  const customerIntl = intlPhone(d.phone);
  const customerTel = customerIntl ? `tel:+${customerIntl}` : '';
  const customerWa = customerIntl
    ? `https://wa.me/${customerIntl}?text=${encodeURIComponent(`Hi ${d.name || ''}, this is Shiftify Packers & Movers regarding your moving enquiry.`)}`
    : '';
  const crmUrl = process.env.PUBLIC_CRM_URL || process.env.CRM_URL || 'https://crm.shiftify.in/';
  const row = (label, value, shaded = false) => value
    ? `<tr><td style="padding:10px 14px;color:#64748b;font-size:11px;letter-spacing:.08em;text-transform:uppercase;vertical-align:top;white-space:nowrap;width:34%;${shaded ? 'background:#f8fafc;' : ''}">${esc(label)}</td><td style="padding:10px 14px;color:#0f172a;font-size:14px;line-height:1.45;${shaded ? 'background:#f8fafc;' : ''}">${esc(value)}</td></tr>`
    : '';
  const customerActions = [
    customerTel ? `<a class="sfx-button" href="${customerTel}" style="display:inline-block;background:#173b8f;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:5px;margin:0 8px 0 0">Call customer</a>` : '',
    customerWa ? `<a class="sfx-button" href="${customerWa}" style="display:inline-block;background:#188b4b;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:5px;margin:0 8px 0 0">WhatsApp customer</a>` : '',
    `<a class="sfx-button" href="${esc(crmUrl)}" style="display:inline-block;background:#eef4ff;color:#173b8f;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:5px;margin:0">Open Shiftify CRM</a>`,
  ].join('');
  const displayName = d.name || 'New customer';
  const moveType = d.moveType || 'MOVING ENQUIRY';
  return `<!doctype html><html lang="en"><head><meta name="x-apple-disable-message-reformatting"><meta name="viewport" content="width=device-width, initial-scale=1.0">${emailCss()}</head><body style="margin:0;background:#eef3fb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table role="presentation" class="sfx-shell" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:#fff;border:1px solid #dbe4f5;border-radius:8px;overflow:hidden">
      <tr><td class="sfx-pad" style="padding:22px 28px;background:#102a68;color:#fff">
        <p style="margin:0 0 8px;color:#a9c5ff;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">Shiftify CRM notification</p>
        <h1 class="sfx-title" style="margin:0;font-size:26px;line-height:1.2;color:#fff">New moving enquiry</h1>
        <p style="margin:9px 0 0;color:#dce7fb;font-size:14px;line-height:1.5">${esc(displayName)} · ${esc(moveType)}</p>
      </td></tr>
      <tr><td class="sfx-pad" style="padding:22px 28px 8px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dbe4f5;border-radius:6px;border-left:4px solid #ef7d1a">
          ${row('Customer', d.name, false)}
          ${row('Phone', d.phone, true)}
          ${row('Email', d.email || 'Not provided', false)}
          ${row('Move type', d.moveType, true)}
          ${row('From', d.from, false)}
          ${row('To', d.to, true)}
          ${row('Property', d.propertyType, false)}
          ${row('Moving date', d.movingDate, true)}
          ${row('Message', d.message || '—', false)}
        </table>
      </td></tr>
      <tr><td class="sfx-pad" style="padding:14px 28px 24px">
        <p style="margin:0 0 10px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Take the next step</p>
        <p style="margin:0 0 18px">${customerActions}</p>
        <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #e5eaf3;color:#64748b;font-size:12px;line-height:1.6">
          <strong style="color:#173b8f">Attribution</strong><br>
          ${esc([d.landingPage && `Landing page: ${d.landingPage}`, d.utmSource && `Source: ${d.utmSource}`, d.utmMedium && `Medium: ${d.utmMedium}`, d.utmCampaign && `Campaign: ${d.utmCampaign}`, d.gclid && `GCLID: ${d.gclid}`, d.createdAt && `Received: ${d.createdAt}`].filter(Boolean).join(' · ') || 'Direct enquiry')}
        </p>
      </td></tr>
      <tr><td style="padding:14px 28px;background:#f8fafc;color:#64748b;font-size:11px;line-height:1.5">Reply and follow up from the CRM. Public contact: ${esc(business.phoneDisplay)}${business.email ? ` · ${esc(business.email)}` : ''}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function customerEmailHtml(d, logoUrl) {
  const business = publicBusiness();
  const links = contactLinks(business);
  const name = d.name || 'there';
  const summary = [
    ['Move type', d.moveType],
    ['From', d.from],
    ['To', d.to],
    ['Property type', d.propertyType],
    ['Moving date', d.movingDate],
  ].filter(([, value]) => value).map(([label, value], index) => `<tr><td style="padding:9px 12px;color:#64748b;font-size:12px;width:38%;${index % 2 ? 'background:#f8fafc;' : ''}">${esc(label)}</td><td style="padding:9px 12px;color:#0f172a;font-size:13px;font-weight:700;${index % 2 ? 'background:#f8fafc;' : ''}">${esc(value)}</td></tr>`).join('');
  const actionButtons = [
    links.tel ? `<a class="sfx-button" href="${links.tel}" style="display:inline-block;background:#173b8f;color:#fff;text-decoration:none;padding:12px 17px;border-radius:5px;font-size:13px;font-weight:700;margin:0 8px 0 0">Call Shiftify</a>` : '',
    links.wa ? `<a class="sfx-button" href="${links.wa}" style="display:inline-block;background:#188b4b;color:#fff;text-decoration:none;padding:12px 17px;border-radius:5px;font-size:13px;font-weight:700;margin:0">WhatsApp Shiftify</a>` : '',
  ].join('');
  const logo = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="Shiftify Packers and Movers" width="140" style="display:inline-block;width:140px;max-width:100%;height:auto;background:#fff;padding:8px;border-radius:5px">`
    : '<span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:.08em">SHIFTIFY</span>';
  return `<!doctype html><html lang="en"><head><meta name="x-apple-disable-message-reformatting"><meta name="viewport" content="width=device-width, initial-scale=1.0">${emailCss()}</head><body style="margin:0;background:#eef3fb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table role="presentation" class="sfx-shell" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:#fff;border:1px solid #dbe4f5;border-radius:8px;overflow:hidden">
      <tr><td class="sfx-pad" style="padding:24px 28px;text-align:center;background:#102a68">${logo}</td></tr>
      <tr><td class="sfx-pad" style="padding:30px 28px 10px">
        <p style="margin:0 0 8px;color:#ef7d1a;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase">Your enquiry is with us</p>
        <h1 class="sfx-title" style="margin:0 0 12px;font-size:26px;line-height:1.2;color:#102a68">Thank you for contacting Shiftify.</h1>
        <p style="margin:0;color:#334155;font-size:15px;line-height:1.65">Hi ${esc(name)}, we have received your moving enquiry. A member of our team will contact you shortly to confirm the details and share the next step.</p>
      </td></tr>
      <tr><td class="sfx-pad" style="padding:18px 28px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dbe4f5;border-left:4px solid #ef7d1a;border-radius:6px">${summary}</table>
      </td></tr>
      <tr><td class="sfx-pad" style="padding:0 28px 28px">
        <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.55">Need immediate assistance? We are happy to help.</p>
        <p style="margin:0">${actionButtons}</p>
        <p style="margin:22px 0 0;padding-top:16px;border-top:1px solid #e5eaf3;color:#64748b;font-size:12px;line-height:1.6">Please keep this email for your records. We will discuss the route, inventory and quote with you before anything is confirmed.</p>
      </td></tr>
      <tr><td style="padding:15px 28px;background:#f8fafc;color:#64748b;font-size:11px;line-height:1.55;text-align:center">${esc(business.phoneDisplay)}${business.email ? ` · ${esc(business.email)}` : ''}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function gmailTransport() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

function recipientsFor(to) {
  const raw = Array.isArray(to)
    ? to
    : String(to || process.env.LEAD_EMAIL_TO || process.env.RESEND_TO || process.env.GMAIL_TO || '')
        .split(',');
  return raw.map((value) => String(value || '').trim()).filter(Boolean);
}

async function resendSend({ from, to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('resend_not_configured');
  if (!from) throw new Error('resend_from_not_configured');
  if (!to?.length) throw new Error('mail_recipient_not_configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html, text }),
      signal: controller.signal,
    });
    const detail = await res.text();
    if (!res.ok) {
      throw new Error(`resend_failed_${res.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resend is the primary provider. Gmail is a secondary provider for the
 * Node backend only. Cloudflare Pages Functions cannot open Gmail SMTP.
 * A successful result identifies the provider that actually accepted the mail.
 */
export async function sendMail({ to, subject, html, text, from }) {
  const recipients = recipientsFor(to);
  if (!recipients.length) {
    logger.warn('mail_recipient_not_configured');
    return 'EMAIL_NOT_CONFIGURED';
  }

  const chain = [];
  if (process.env.RESEND_API_KEY) {
    chain.push({
      name: 'resend',
      run: async () => {
        await resendSend({
          from: from || process.env.RESEND_FROM,
          to: recipients,
          subject,
          html,
          text,
        });
        return 'EMAIL_SENT_RESEND';
      },
    });
  }

  const gmail = gmailTransport();
  if (gmail) {
    chain.push({
      name: 'gmail',
      run: async () => {
        await gmail.sendMail({
          from: process.env.GMAIL_USER,
          to: recipients,
          subject,
          html,
          text,
        });
        return 'EMAIL_SENT_GMAIL';
      },
    });
  }

  if (!chain.length) {
    logger.warn('mail_provider_not_configured');
    return 'EMAIL_NOT_CONFIGURED';
  }

  let last;
  for (const step of chain) {
    try {
      return await step.run();
    } catch (e) {
      last = e;
      logger.error('mail_provider_failed', e, { provider: step.name });
    }
  }
  logger.error('all_mail_providers_failed', last || new Error('mail_delivery_failed'));
  return 'EMAIL_FAILED';
}

export function mailStatus() {
  const resend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
  const gmail = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  return {
    primary: resend ? 'resend' : gmail ? 'gmail' : 'none',
    order: ['resend', 'gmail'],
    resend,
    gmail,
    cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
  };
}

function healthTimeout(promise, ms = 5000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('health_check_timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function checkResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || !process.env.RESEND_FROM) throw new Error('resend_credentials_missing');
  const response = await healthTimeout(
    fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
    }),
  );
  if (!response.ok) throw new Error(`resend_health_${response.status}`);
  await response.text();
  return true;
}

async function checkGmail() {
  const transport = gmailTransport();
  if (!transport) throw new Error('gmail_credentials_missing');
  try {
    await healthTimeout(transport.verify(), 10_000);
    return true;
  } finally {
    transport.close();
  }
}

export async function mailHealth({ deep = false } = {}) {
  const config = mailStatus();
  const checks = {};
  const configuredProviders = [];
  if (config.resend) configuredProviders.push('resend');
  if (config.gmail) configuredProviders.push('gmail');

  if (!configuredProviders.length) {
    return {
      ok: false,
      status: 'not_configured',
      provider: 'none',
      configuredProviders,
      checks,
      message: 'No Resend or Gmail credentials are configured.',
    };
  }

  if (!deep) {
    return {
      ok: true,
      status: 'configured',
      provider: config.primary,
      configuredProviders,
      checks,
      message: 'Credentials are present. Use the deep health check or CRM test-email to verify delivery.',
    };
  }

  const checksToRun = [];
  if (config.resend) checksToRun.push(['resend', checkResend]);
  if (config.gmail) checksToRun.push(['gmail', checkGmail]);
  const failedProviders = [];
  for (const [provider, check] of checksToRun) {
    try {
      await check();
      checks[provider] = { ok: true, status: 'up' };
    } catch (error) {
      checks[provider] = { ok: false, status: 'down', message: error.message };
      failedProviders.push(provider);
    }
  }

  const liveProvider = Object.entries(checks).find(([, result]) => result.ok)?.[0] || '';
  if (liveProvider) {
    for (const provider of failedProviders) {
      logger.warn('mail_health_provider_degraded', { provider, fallbackProvider: liveProvider, error: checks[provider].message });
    }
  } else {
    logger.error('mail_health_all_providers_failed', new Error('All configured mail providers failed their health checks.'), {
      providers: configuredProviders,
      failures: Object.fromEntries(failedProviders.map((provider) => [provider, checks[provider].message])),
    });
  }
  return {
    ok: Boolean(liveProvider),
    status: liveProvider ? 'up' : 'down',
    provider: liveProvider || config.primary,
    configuredProviders,
    checks,
    message: liveProvider
      ? `Mail provider ${liveProvider} responded successfully${failedProviders.length ? `; fallback provider failure: ${failedProviders.join(', ')}` : ''}.`
      : 'All configured mail providers failed their health check.',
  };
}
