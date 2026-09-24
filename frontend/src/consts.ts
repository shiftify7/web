/**
 * Shiftify — global site configuration.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  PLACEHOLDER REGISTER — fill these before production launch.     │
 * │  Any value left empty renders a visible dashed `[TOKEN]` chip    │
 * │  in the UI (see components/Placeholder.astro) so an unfilled     │
 * │  business fact can never be mistaken for a real claim.           │
 * └──────────────────────────────────────────────────────────────────┘
 */

export const SITE = {
  name: 'Shiftify',
  /** GST trade name */
  tradeName: 'Shiftify Packers and Movers',
  domain: 'https://shiftify.in',
  lang: 'en-IN',

  // ── Contact ─────────────────────────────────────────────────────────
  /** E.164 without '+' */
  phoneIntl: '918766331715',
  phoneDisplay: '+91 87663 31715',
  /** wa.me number, digits only */
  whatsappIntl: '918766331715',
  email: 'shiftify@gmail.com',
  /** Human support hours, e.g. '24×7' or '8 AM – 10 PM' */
  supportHours: '',

  // ── Legal entity (PLACEHOLDER) ────────────────────────────────────────
  legalEntity: '',
  gstin: '',
  hqAddress: '',

  // ── Trust signals — only set what is TRUE. Empty → token/omitted. ─────
  /** e.g. '1,200+' completed moves. Never ship an invented number. */
  movesCompleted: '',
  /** e.g. 'up to ₹5 lakh' — only once a real policy is in force. */
  insuranceCover: '',
  insurerName: '',
  /** Certifications actually held (IBA approval, ISO, …). Empty = none. */
  certifications: [] as string[],

  social: {
    instagram: '',
    facebook: '',
    linkedin: '',
    youtube: '',
  },
} as const;

/** The four USP cards — swap any copy you cannot genuinely stand behind. */
export const USP_CARDS = [
  {
    icon: 'receipt',
    title: 'Zero hidden charges',
    text: 'Itemised written quote before you book. The final bill matches that quote. Anything extra is discussed before it is charged.',
  },
  {
    icon: 'shield-check',
    title: 'Trained & verified crew',
    text: 'Uniformed teams led by a move supervisor. Crew verification process is documented on our About page.',
  },
  {
    icon: 'box',
    title: 'Damage-proof packing',
    text: 'Layered packing, room-by-room labelling and a shared inventory list, so every box is accounted for at delivery.',
  },
  {
    icon: 'clock',
    title: 'On-time, or told early',
    text: 'Live coordination on move day. If a delay is possible, you hear it from us first, with a revised ETA.',
  },
] as const;

/** Email displayed when SITE.email is still a placeholder — keeps mailto off production until real. */
export const ENV = {
  gtagId: import.meta.env.PUBLIC_GTAG_ID ?? '',
  adsId: import.meta.env.PUBLIC_ADS_ID ?? '',
  adsConversionLabel: import.meta.env.PUBLIC_ADS_CONVERSION_LABEL ?? '',
  turnstileSiteKey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? '',
  clarityId: import.meta.env.PUBLIC_CLARITY_ID ?? '',
  leadEndpoint: import.meta.env.PUBLIC_LEAD_ENDPOINT ?? '',
  siteUrl: import.meta.env.PUBLIC_SITE_URL ?? SITE.domain,
  /** Origin of the Node CRM/API. Empty = same-origin (Pages Functions / Vite proxy). */
  apiOrigin: String(import.meta.env.PUBLIC_BACKEND_URL || import.meta.env.PUBLIC_API_URL || '').replace(/\/$/, ''),
} as const;

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${ENV.apiOrigin}${p}`;
}

// ── Link builders ──────────────────────────────────────────────────────────

/** Prefilled WhatsApp deep link; returns '' when the number is still a placeholder. */
export function waLink(message: string): string {
  if (!SITE.whatsappIntl) return '';
  return `https://wa.me/${SITE.whatsappIntl}?text=${encodeURIComponent(message)}`;
}

export function waMessageFor(context?: { city?: string; route?: { from: string; to: string } }): string {
  if (context?.route) {
    return `Hi Shiftify, I want to enquire about a move from ${context.route.from} to ${context.route.to}.`;
  }
  if (context?.city) {
    return `Hi Shiftify, I want to enquire about packers and movers in ${context.city}.`;
  }
  return 'Hi Shiftify, I want to enquire about a move.';
}

export function telHref(): string {
  return SITE.phoneIntl ? `tel:+${SITE.phoneIntl}` : '';
}

/** Canonical URL helper — always trailing slash, always lowercase path. */
export function canonical(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SITE.domain}${p.endsWith('/') ? p : `${p}/`}`.toLowerCase();
}


