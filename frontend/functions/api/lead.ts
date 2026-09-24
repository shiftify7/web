/**
 * POST /api/lead — Cloudflare Pages Function.
 * Proxies to the Node backend when BACKEND_URL is set (Mongo + Resend/Gmail).
 * Otherwise validates and sends via Resend HTTPS. Cloudflare Workers cannot use Gmail SMTP.
 */

type PagesFunction = (context: {
  request: Request;
  env: Record<string, string | undefined>;
  waitUntil: (p: Promise<unknown>) => void;
}) => Response | Promise<Response>;

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

function classify(b: Record<string, string>): 'INTRA_CITY' | 'INTERCITY' | 'INTERSTATE' {
  const mt = (b.moveType || '').toLowerCase();
  if (mt.includes('within') || mt === 'intra_city') return 'INTRA_CITY';
  const fs = (b.fromState || '').trim().toLowerCase();
  const ts = (b.toState || '').trim().toLowerCase();
  if (fs && ts && fs !== ts) return 'INTERSTATE';
  return 'INTERCITY';
}

async function sendResend(env: Record<string, string | undefined>, subject: string, html: string, text: string, to?: string) {
  const key = env.RESEND_API_KEY;
  const from = env.RESEND_FROM;
  const dest = to || env.LEAD_EMAIL_TO || env.RESEND_TO;
  if (!key || !from || !dest) throw new Error('resend_missing');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [dest], subject, html, text }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`resend_failed_${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
}

export const onRequestPost: PagesFunction = async (ctx) => {
  const headers = { 'content-type': 'application/json' };
  try {
    const ip = ctx.request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (limited(ip)) {
      return new Response(JSON.stringify({ ok: false, error: 'rate_limited' }), { status: 429, headers });
    }
    const raw = (await ctx.request.json()) as Record<string, string>;
    if (raw.company && raw.company.trim() !== '') {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    if (ctx.env.BACKEND_URL) {
      const res = await fetch(`${ctx.env.BACKEND_URL.replace(/\/$/, '')}/api/lead`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(raw),
      });
      const text = await res.text();
      return new Response(text, { status: res.status, headers });
    }

    const name = clean(raw.name, 80);
    const phone = clean(raw.phone, 10);
    if (!name || !PHONE_RE.test(phone)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid' }), { status: 400, headers });
    }
    const moveType = classify(raw);
    const from = clean(raw.from, 160);
    const to = clean(raw.to, 160);
    const subject = `New Shiftify Lead — ${moveType} — ${from} → ${to}`;
    const html = `<p>${name} ${phone} ${from} → ${to}</p>`;
    const text = `${name}\n${phone}\n${moveType}\n${from} → ${to}`;
    try {
      await sendResend(ctx.env, subject, html, text);
      if (raw.email) {
        await sendResend(
          ctx.env,
          'Thank you for contacting Shiftify',
          `<p>Thank you for contacting Shiftify. Our team will contact you shortly.</p>`,
          'Thank you for contacting Shiftify.',
          clean(raw.email, 120),
        );
      }
    } catch (e) {
      console.error('lead email failed', e);
      return new Response(JSON.stringify({ ok: false, error: 'send_failed' }), { status: 502, headers });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    console.error('lead-endpoint: exception', err);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), { status: 500, headers });
  }
};
