# Shiftify upgrade — implementation report

Production Astro site was **not rebuilt from scratch**. Existing routes, content collections, city/locality URL scheme (`/packers-and-movers-{city}/{locality}/`), GSAP islands, and Cloudflare Pages Functions remain.

## Files created
- `backend/` — Express + MongoDB CRM API (`src/index.js`, `models.js`, `mail.js`)
- `backend/.env.example`
- `crm-frontend/` — isolated Preact CRM SPA
- `crm-frontend/.env.example`
- `functions/api/otp/request.ts`, `verify.ts`
- `functions/api/public/settings.ts`, `blogs.ts`, `blogs/[slug].ts`
- `src/components/islands/AnnouncementBar.tsx`, `BlogIndex.tsx`, `BlogPost.tsx`
- `src/pages/blog/index.astro`, `src/pages/blog/[slug].astro`
- `src/pages/lp/*.astro` (Delhi, Gurgaon, Delhi→Gurgaon, home shifting)
- `.env.example` (expanded)

## Files modified
- `src/pages/index.astro` — single truck asset; no poster swap / flicker
- `src/components/islands/LeadForm.tsx` — UTM/GCLID, OTP when enabled, tracking events, success copy
- `functions/api/lead.ts` — proxy to Node backend; Resend fallback; classification
- `src/pages/moving-cost-calculator.astro`, `packers-and-movers-charges.astro` — **no public prices**
- Header, Footer, MobileNav, BaseLayout, robots.txt, sitemap-pages

## Major features
1. Loader + hero truck: one WebP, transform-only GSAP, `prefers-reduced-motion`
2. Reusable lead form (intra / intercity-interstate, Indian `^[6-9][0-9]{9}$`)
3. MongoDB leads + JWT CRM
4. Email: Hostinger SMTP → Resend → Gmail app password (all server-side). Lead is stored first.
5. OTP toggle (default OFF); hashed OTP; SMS provider is abstracted (ops email until SMS creds exist)
6. Blog CMS (markdown + sanitized HTML), Cloudinary media, announcements
7. Local SEO hierarchy preserved; footer locality links only to real pages
8. Ads LPs `noindex`; conversion event hooks

## Environment variables required
See `backend/.env.example` and root `.env.example`.
Critical: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, SMTP/Resend/Gmail, `CLOUDINARY_*`, `BACKEND_URL` on Cloudflare Pages, `CORS_ORIGIN`.

## Database collections
`leads`, `users`, `settings`, `otps`, `blogs`, `media`, `announcements`

## API endpoints
Public: `POST /api/lead`, `POST /api/otp/request|verify`, `GET /api/public/settings|blogs`
CRM (JWT): dashboard, leads CRUD/status, email send, blogs, media, announcements, settings, auth login/logout

## CRM routes (SPA)
Dashboard, Leads, Email, Blog, Media, Announcements, Settings

## Public SEO routes
Existing city / locality / route / service / guides + `/blog/` + LPs (noindex)

## Build/test result
`npm run build` — **PASS** (52 pages). Content gate PASS.

## Latest (leftover phases)
- Unique Mumbai localities: Andheri, Bandra, Powai, Navi Mumbai
- OTP provider abstraction (`OTP_PROVIDER=email|sms|whatsapp`) + 45s resend cooldown
- Duplicate lead window (same phone within 2 minutes)
- CRM email templates, blog preview, banner-required publish, announcement dates/toggle
- Guide ↔ city/service internal links
- Frontend build: **65 pages, PASS**

## Remaining credentials
MongoDB Atlas, Hostinger SMTP, Resend, Gmail app password, Cloudinary, JWT secret, admin password, and `BACKEND_URL` must be set in production. OTP currently notifies ops email until an SMS/WhatsApp provider is configured. CMS blog `[slug]` HTML is client-fetched (static host); add `PUBLIC_BACKEND_URL` at build time to prerender published posts.
