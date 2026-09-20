# Shiftify — shiftify.in

Programmatic, static-first marketing site for **Shiftify Packers and Movers** (GST trade name).
Astro 5 · Tailwind CSS v4 · Preact islands · Content Layer + Zod · Cloudflare Pages.

Primary goal: qualified moving leads via Google Ads. Secondary: organic rankings for
city and route terms. Design language follows the brand concept board — *boxy, premium, blue*.

---

## Quickstart

```bash
npm install
npm run assets     # derive favicons + og image from src/assets/*.png (sharp)
cp .env.example .env   # fill what you have — everything degrades gracefully when empty
npm run dev        # http://localhost:4321
npm run build      # content gate → astro build → dist/
npm run preview    # serve dist/ locally
npm run lhci       # Lighthouse CI against dist/ (budget enforced)
```

## Deploy (Cloudflare Pages)

| Setting | Value |
|---|---|
| Build command | `npm run assets && npm run build` |
| Output directory | `dist` |
| Node version | `22` (set `NODE_VERSION=22` in Pages env; Functions require ≥20) |
| Functions dir | `functions/` (auto-detected — `POST /api/lead`) |
| KV binding | `LEADS_KV` → a KV namespace (rate limiting) |

The `functions/api/lead.ts` Pages Function ships with the repo — Cloudflare deploys it
with the static site. Why Cloudflare: Indian POPs (Mumbai, Delhi, Chennai, Hyderabad,
Bengaluru, Kolkata) beat single-region hosts on TTFB for most of the country.

## Environment variables

Copy `.env.example` → `.env` (dev) and set the same in the Pages dashboard (prod).
**Server-side secrets are never prefixed `PUBLIC_` and never committed.**

| Var | Purpose |
|---|---|
| `PUBLIC_GTAG_ID` | GA4 measurement id (G-…) |
| `PUBLIC_ADS_ID` / `PUBLIC_ADS_CONVERSION_LABEL` | Ads conversion (AW-…/label), fired on `/thank-you/` |
| `PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Turnstile spam protection (form widget / siteverify) |
| `PUBLIC_LEAD_ENDPOINT` | **MVP shortcut:** Formspree/Web3Forms URL. Empty → posts to `/api/lead` |
| `RESEND_API_KEY`, `LEAD_EMAIL_FROM`, `LEAD_EMAIL_TO` | Lead email via Resend |
| `SHEETS_WEBHOOK_URL` | Apps Script `doPost` that appends lead rows to Google Sheets |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_ALERT_TO` | Instant ops alert via WhatsApp Cloud API |
| `PUBLIC_CLARITY_ID` | Microsoft Clarity — deferred to idle/first-interaction only |

## ⚠️ PLACEHOLDER REGISTER — fill before launch

The site **never invents business facts**. Unverified facts render as visible dashed
`[TOKEN]` chips. Single source of truth: **`src/consts.ts`** — set these to real values:

`phoneIntl` / `phoneDisplay` · `whatsappIntl` · `email` · `supportHours` ·
`legalEntity` · `gstin` · `hqAddress` · `movesCompleted` · `insuranceCover` / `insurerName` · `certifications[]`

Also pending:
`src/content/testimonials/` — all entries are `placeholder: true`, **labelled "SAMPLE
REVIEW" in the UI**. Replace with verified reviews (set `placeholder: false, verified:
true`) — only then does social-proof markup upgrade. `AggregateRating` is intentionally
never emitted until real, verifiable reviews exist.
`src/pages/about.astro` — `[FOUNDER STORY]` token.

**Certifications:** none are claimed anywhere (no "IBA approved", no "govt registered").
Add only real ones to `certifications[]` in `consts.ts`.

## Operating model

**Hybrid** — own supervisor-led crews in core areas + vetted partner network elsewhere.
Copy implications are pre-baked: schema emits per-city `LocalBusiness`/`MovingCompany`
nodes **only** where `city.hasBranch: true` **and** a real `address` exists (fabricated
branch addresses are a known manual-action + GBP-suspension trigger). The disclaimer page
discloses the hybrid model.

## Content commands

### Add a city
1. `cp src/content/cities/noida.json src/content/cities/jaipur.json`
2. Fill **every** field — the Zod schema (`src/content.config.ts`) fails the build on a bad entry.
3. Write genuinely local copy: `intro`, `whyLocal`, ≥4 `localRules`, `seasonality`.
   The build **fails** if `intro + whyLocal + localRules + seasonality` < **300 words**
   or if any city is **>70% similar** to another (5-gram Jaccard — `scripts/validate-content.mjs`).
4. Real price bands in `priceMatrix` (every ₹ figure on the site comes from collections — never hardcode).
5. Tier-1 cities should add `localities[]` (6+ entries with `pincode`, unique `intro`, `highlights`)
   → locality pages generate automatically at `/packers-and-movers-{city}/{locality}/`.
6. `npm run build` → page appears at `/packers-and-movers-{slug}/`, in sitemaps, nav, `/cities/`, calculator.

### Add a route
`src/content/routes/{from}-to-{to}.json` — both endpoints should be existing city slugs
(keeps the crawl mesh two-way). Page: `/packers-and-movers-{from}-to-{to}/`.
Route `priceMatrix` keys: `1RK 1BHK 2BHK 3BHK 4BHK+ car bike`.

### Tiering discipline (anti-doorway policy)
- **Tier 1** (metros): full page + locality pages + richest unique copy.
- **Tier 2**: full page, same template, ≥300-word unique local block.
- **Tier 3**: *don't build the page* — a directory line on `/cities/` (`COMING` list) until you actually serve it.

## Tracking rules (performance budget — do not regress)

- **gtag.js loads `async` in `<head>`** (`src/components/Tracking.astro`). Never route it
  through Partytown, never lazy-load it — that breaks Ads conversion attribution and loses
  bounced-session conversions.
- Non-essential scripts (Clarity) defer to `requestIdleCallback`/first input only.
- URL conversion on `/thank-you/` (primary) + events: `call_click`, `whatsapp_click`,
  `calculator_complete`, `form_step_2`, `generate_lead`.
- Attribution params (gclid, UTMs, landing, referrer) persist in `sessionStorage`
  (`sfx_attr`) and ride along as hidden lead fields — disable them and early Ads data dies.
- Enhanced conversions: thank-you page sets `user_data` from query params when present.
- Later: offline conversion import (lead → booked job). Raw-lead optimisation alone floods
  the account with junk clicks in this category.

## Ads compliance checklist (already structural)

- Ad group → city page H1 keyword match: **always land city ads on `/packers-and-movers-{city}/`, never the homepage.**
- Footer on every page: phone, WhatsApp, email, HQ address, GSTIN + privacy/terms/refund links.
- No countdown timers, no "#1" claims, no invented review counts.
- `<PhoneNumber>` renders through one `data-sfx-phone` seam — dynamic number insertion by
  gclid wires in there later without a refactor.
- `/lp/{city}/` reserved for Phase-3 noindex landing variants (see note that was in
  `src/pages/lp/README.md` — keep variants out of sitemaps, `noindex,follow`, full compliance footer).

## Performance budget (enforced in CI — `lighthouserc.json`)

Lighthouse mobile ≥95 ×4 categories · LCP <1.8s · INP <150ms · CLS <0.05 ·
JS ≤40KB gz/page (we ship ~8–16KB) · HTML ≤60KB gz.
Zero client JS by default; islands only: mobile nav, quote form, calculator.
FAQ = native `<details>`. One self-hosted Sora WOFF2 (Latin, ~25KB, preloaded, swap).
Images via `astro:assets` → AVIF+WebP; LCP hero preloaded with `imagesrcset`.

## Project map

```
src/
  consts.ts              # ← business facts live HERE (placeholder register)
  content.config.ts      # Zod schemas — bad data fails the build
  content/               # cities/ routes/ services/ testimonials/ faqs/ guides/
  lib/                   # data helpers, schema.org builders, calculator props
  components/            # Astro components + islands/ (Preact: QuoteForm, CostCalculator, MobileNav)
  layouts/BaseLayout.astro
  pages/                 # incl. split sitemap endpoints + robots.txt.ts
scripts/
  validate-content.mjs   # anti-doorway gate (runs before every build)
  prepare-assets.mjs     # favicons + og image from brand PNGs
functions/api/lead.ts    # Cloudflare Pages Function
lighthouserc.json        # Lighthouse CI budget
```

## Known trade-offs / next phases

1. **OTP phone verification** — intentionally absent at launch (conversion-dropping in this
   category). Phase-2 A/B test; Turnstile + honeypot + min-time + KV rate limit ship instead.
2. `/lp/{city}/` ads variants — Phase 3, noindex.
3. Hindi (`hi-IN`) — `hreflang` scaffolding already in place; Footer notes "coming soon".
4. Offline conversion import into Google Ads — post-launch, once job completion data exists.
5. Tier-1 word count deepens over time — the gate enforces ≥300 unique words/city;
   current seed ships ~550+ (warnings printed, non-blocking).
```
