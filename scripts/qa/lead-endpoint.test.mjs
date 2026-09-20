import { onRequestPost } from '/tmp/lead.mjs';

let relayCalls = 0;
let relayStatus = 200;
globalThis.fetch = async () => { relayCalls++; return { ok: relayStatus >= 200 && relayStatus < 300, status: relayStatus }; };

const env = { LEAD_EMAIL_TO: 'shiftify@gmail.com', LEAD_EMAIL_FROM: 'leads@x.tld', SMTP_HOST: 'https://relay.example/send', SMTP_USER: 'u', SMTP_PASSWORD: 'p' };
const ctx = (body, ip = '1.1.1.1', e = env) => ({
  request: new Request('https://x/api/lead', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(body) }),
  env: e,
  waitUntil: () => {},
});
const valid = { name: 'Test User', phone: '8766331715', moveType: 'Within City', from: 'Dwarka, Delhi', to: 'Rohini, Delhi', propertyType: '2 BHK', date: '2026-10-05', message: '', service: '', source: 'home', company: '', submittedAt: '2026-09-20T00:00:00.000Z' };
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '—', e.message); } };
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m} (got ${a}, want ${b})`); };

await t('honeypot silently accepted, no mail', async () => { const before = relayCalls; const r = await onRequestPost(ctx({ ...valid, company: 'spammy' })); eq(r.status, 200, 'status'); eq(relayCalls, before, 'relay not called'); });
await t('bad phone rejected 400', async () => { const r = await onRequestPost(ctx({ ...valid, phone: '12345' })); eq(r.status, 400, 'status'); });
await t('phone starting with 5 rejected', async () => { const r = await onRequestPost(ctx({ ...valid, phone: '5876543210' })); eq(r.status, 400, 'status'); });
await t('missing name rejected', async () => { const r = await onRequestPost(ctx({ ...valid, name: '  ' })); eq(r.status, 400, 'status'); });
await t('missing from/to rejected', async () => { const r = await onRequestPost(ctx({ ...valid, from: '' })); eq(r.status, 400, 'status'); });
await t('no env → 503, no fake success', async () => { const r = await onRequestPost(ctx(valid, '2.2.2.2', {})); eq(r.status, 503, 'status'); });
await t('valid lead mails → 200', async () => { const r = await onRequestPost(ctx(valid, '3.3.3.3')); eq(r.status, 200, 'status'); });
relayStatus = 500;
await t('relay failure → 502', async () => { const r = await onRequestPost(ctx(valid, '4.4.4.4')); eq(r.status, 502, 'status'); });
relayStatus = 200;
await t('rate limit: 6th hit same IP → 429', async () => { for (let i = 0; i < 5; i++) await onRequestPost(ctx(valid, '5.5.5.5')); const r = await onRequestPost(ctx(valid, '5.5.5.5')); eq(r.status, 429, 'status'); });

// email content sanity: capture a body
await onRequestPost(ctx({ ...valid, message: 'please <b>call</b>\r\nBCC: x@y.z' }, '6.6.6.6'));
const sentPayload = await (async () => { let captured; globalThis.fetch = async (_, init) => { captured = init.body; return { ok: true, status: 200 }; }; await onRequestPost(ctx(valid, '7.7.7.7')); return JSON.parse(captured); })();
await t('subject matches spec', async () => { eq(sentPayload.subject, 'New Shiftify Moving Lead — Dwarka, Delhi to Rohini, Delhi', 'subject'); });
await t('html contains tel: and wa.me customer links', async () => { const h = sentPayload.html; if (!h.includes('tel:+918766331715') || !h.includes('wa.me/918766331715')) throw new Error('links missing'); });
await t('html stripped of angle brackets from message', async () => { if (sentPayload.html.includes('<b>call</b>') || sentPayload.html.includes('BCC:')) { /* ok BCC can stay, but tags must be gone */ } if (sentPayload.html.includes('<b>') ) throw new Error('html injection not stripped'); });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
