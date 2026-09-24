# Phase status — Shiftify upgrade

## Implemented in code

| Phase | Status |
|---|---|
| 0 Codebase audit | Done |
| 1 Loader truck (single asset, no swap) | Done |
| 2 Hero truck (single asset, no swap) | Done |
| 3 Performance (static Astro, islands, images, fonts) | Done (GSAP still on homepage; chunk warning ~70KB gsap) |
| 4 Responsive layouts / no public overflow work | Done in existing CSS; not a device lab test |
| 5 Reusable LeadForm + Indian phone | Done |
| 6 Lead submit / success / no price | Done |
| 7 Mongo lead model | Done (`backend`) |
| 8 Email Hostinger → Resend → Gmail | Done (needs credentials) |
| 9 Customer thank-you HTML email | Done |
| 10 Owner lead email | Done |
| 11 Isolated CRM + JWT | Done (`crm-frontend`, `/crm/` is noindex stub) |
| 12 Dashboard stats | Done |
| 13 Leads table / filters / status / notes | Done |
| 14 CRM email + templates | Done |
| 15 OTP toggle default OFF | Done (SMS needs provider keys) |
| 16 Blog CMS markdown + sanitized HTML | Done |
| 17 Blog SEO / Article JSON-LD | Done (client-injected on slug view) |
| 18 Cloudinary media manager | Done (needs credentials) |
| 19 Banner required to publish | Done |
| 20 Announcement bar CMS | Done |
| 21 Contact fields in Settings | Done (public site still uses `src/consts.ts` as source of truth until CMS values are wired into Astro) |
| 22–23 Local SEO cities/localities unique copy | Done (Delhi, Gurgaon, Noida, Mumbai, Bengaluru + real localities only) |
| 24 Technical SEO | Done (canonical, OG, schema, breadcrumbs) |
| 25 Sitemaps (pages/cities/routes/services/guides/blogs) | Done |
| 26 People-first copy / no price stuffing | Done (meta “price bands” removed) |
| 27 Ads LPs (`/lp/…` noindex) | Done (4 campaign pages) |
| 28 Conversion events + UTM/GCLID | Done |
| 29 CRM settings status (no secrets) | Done |
| 30 Env examples (frontend / backend / crm) | Done |
| 31 Security headers, rate limits, hashing, sanitization | Done |
| 32 CRM admin UI sections | Done |
| 33 Blog preview / media copy URL | Done |
| 34 Mongo indexes | Done (phone, dates, slug, status) |
| 35 User-facing errors (form, login, upload, OTP) | Done |
| 36 Lead stored before email; retry from CRM | Done |
| 37 Footer location accordion | Done |
| 38 Blog ↔ local/service links | Done |
| 39 `npm run build` | Pass (65+ pages) |
| 40 robots noindex CRM/LP/thank-you/API | Done |
| 41 No secrets in frontend bundle | Done |
| 42 Conversion journey wired | Done in code |

## Not fully implemented / blocked

These cannot be finished without **your production credentials or a live device pass**:

1. **Live MongoDB / SMTP / Resend / Gmail / Cloudinary / JWT admin seed** — env only.
2. **SMS/WhatsApp OTP delivery** — abstraction exists; needs `SMS_*` or `WHATSAPP_*`.
3. **Public site phone/WhatsApp from CMS at build time** — Settings API is runtime; Astro pages still use `consts.ts` (AnnouncementBar *does* read CMS at runtime).
4. **CMS blog HTML prerendered at build** — static host fetches posts client-side (`/blog/:slug/` rewrite).
5. **Lighthouse CI / real 320–1920 device lab** — not run in this environment.
6. **Mongo location collections** — locations stay in Astro content JSON (correct for static SEO; not duplicated in Mongo).
7. **Unused legacy pricing islands** (`CostCalculator`, `QuoteEstimator`, `PricingTable`) — removed in the conservative audit after confirming no imports, dynamic references, routes, or package-script usage.
8. **CRM is not the same origin SPA at `/crm/`** — isolated `crm-frontend` app; public `/crm/` is a noindex stub.

## Acceptance vs credentials

Code criteria 1–50 are implemented except those that require live Mongo/email/Cloudinary/OTP SMS to *prove* in production. No public moving prices. No fake reviews/awards/locations.
