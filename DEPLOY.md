# Shiftify — deployment & lead-email setup

The site is a **static Astro build** (`dist/`) plus one **Cloudflare Pages Function**
(`functions/api/lead.ts`) that emails form leads to the business inbox.
Nothing else needs a server.

## 1. Build settings (Cloudflare Pages)

| Setting        | Value          |
|----------------|----------------|
| Build command  | `npm ci && npm run build` |
| Build output   | `dist` |
| Root directory | `/` (repo root — `functions/` is picked up automatically) |

`wrangler.toml` already contains `pages_build_output_dir = "dist"` for
`wrangler pages deploy` flows.

## 2. Mail environment variables (required for the lead form to send email)

Set these in **Pages project → Settings → Environment variables → Production**.
They are server-side only — nothing is ever bundled into client JS.

| Variable           | Example                                   | Purpose |
|--------------------|-------------------------------------------|---------|
| `LEAD_EMAIL_TO`    | `shiftify@gmail.com`                      | Inbox that receives every lead |
| `LEAD_EMAIL_FROM`  | `leads@your-domain.tld`                   | Verified sender address on the relay |
| `SMTP_HOST`        | `https://api.resend.com/emails` etc.      | HTTPS send endpoint of your mail relay (Workers can't open raw SMTP sockets — this is the relay's API URL) |
| `SMTP_PORT`        | `443`                                     | Documented for completeness |
| `SMTP_USER`        | `api` / provider username                 | Auth user |
| `SMTP_PASSWORD`    | provider API key                          | Auth secret |

The function POSTs a JSON payload `{ from, to, subject, html, text }` with HTTP
Basic auth (`SMTP_USER:SMTP_PASSWORD`) to `SMTP_HOST`. Resend, Brevo, Mailgun,
Elastic Email and Postmark all expose such an endpoint; any of them works as-is or
with a trivial body-shape tweak in `functions/api/lead.ts`.

Until these are set, the form **never fakes success**: it shows its honest error
state with Call/WhatsApp fallback buttons, so no lead is silently lost.

## 3. Behavior guarantees

- `^[6-9][0-9]{9}$` mobile enforced client- and server-side
- Honeypot submissions get a quiet 200 and are never mailed
- 5 requests / 10 min / IP soft rate limit → 429
- Missing env → 503, relay rejection → 502, both surface as the form's error state
- Email subject: `New Shiftify Moving Lead — {FROM} to {TO}`, all fields, tel:/wa.me customer links
- All free-text fields are HTML/tag-stripped before going into the email

## 4. Local emulation (optional)

```bash
cp .dev.vars.example .dev.vars   # fill values
npm run build
npx wrangler pages dev dist       # serves static site + /api/lead locally
```

## 5. After deploying

1. Submit a test lead on the live home page.
2. Confirm the branded email lands in `LEAD_EMAIL_TO`.
3. Confirm the 2nd immediate duplicate-submission is dropped (form stays in success state).
