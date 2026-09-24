/**
 * OTP delivery abstraction. Swap the provider without touching the lead flow.
 * Configured via OTP_PROVIDER=email|sms|whatsapp (default email/ops).
 * Never returns the raw OTP to API clients.
 */
import { sendMail } from './mail.js';

export async function deliverOtp({ phone, code }) {
  const provider = (process.env.OTP_PROVIDER || 'email').toLowerCase();

  if (provider === 'sms' && process.env.SMS_API_URL && process.env.SMS_API_KEY) {
    const res = await fetch(process.env.SMS_API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.SMS_API_KEY}` },
      body: JSON.stringify({ to: `+91${phone}`, text: `Your Shiftify verification code is ${code}` }),
    });
    if (!res.ok) throw new Error('sms_failed');
    return 'sms';
  }

  if (provider === 'whatsapp' && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `91${phone}`,
        type: 'text',
        text: { body: `Your Shiftify verification code is ${code}` },
      }),
    });
    if (!res.ok) throw new Error('whatsapp_failed');
    return 'whatsapp';
  }

  const to = process.env.LEAD_EMAIL_TO;
  if (!to) throw new Error('otp_channel_unconfigured');
  await sendMail({
    to,
    subject: `Shiftify OTP for ${phone}`,
    html: `<p>OTP requested for ${phone}. Deliver via your SMS provider when credentials exist. Ops copy: use CRM logs — code is not stored in plaintext.</p>`,
    text: `OTP requested for ${phone}`,
  });
  // Still send the code to ops so verification can be tested before SMS is live.
  // The public API never includes it.
  await sendMail({
    to,
    subject: `[TEST] OTP ${phone}`,
    html: `<p>${code}</p>`,
    text: code,
  });
  return 'email';
}
