import { SITE, apiUrl } from '@/consts';

export const BIZ_KEYS = [
  'phoneDisplay',
  'phoneIntl',
  'whatsappIntl',
  'email',
  'supportHours',
  'legalEntity',
  'gstin',
  'hqAddress',
  'insuranceCover',
  'insurerName',
  'instagram',
  'facebook',
  'linkedin',
  'youtube',
] as const;

export type BizKey = (typeof BIZ_KEYS)[number];
export type SourceMode = 'AUTO' | 'ENV' | 'CRM' | 'FRONTEND';

export type BusinessValues = Record<BizKey, string>;

export const FRONTEND_BUSINESS: BusinessValues = {
  phoneDisplay: SITE.phoneDisplay,
  phoneIntl: SITE.phoneIntl,
  whatsappIntl: SITE.whatsappIntl,
  email: SITE.email,
  supportHours: SITE.supportHours || '',
  legalEntity: SITE.legalEntity || '',
  gstin: SITE.gstin || '',
  hqAddress: SITE.hqAddress || '',
  insuranceCover: SITE.insuranceCover || '',
  insurerName: SITE.insurerName || '',
  instagram: SITE.social.instagram || '',
  facebook: SITE.social.facebook || '',
  linkedin: SITE.social.linkedin || '',
  youtube: SITE.social.youtube || '',
};

const ENV_MAP: Record<BizKey, string> = {
  phoneDisplay: String(import.meta.env.PUBLIC_PHONE_DISPLAY || ''),
  phoneIntl: String(import.meta.env.PUBLIC_PHONE_INTL || ''),
  whatsappIntl: String(import.meta.env.PUBLIC_WHATSAPP_INTL || ''),
  email: String(import.meta.env.PUBLIC_BUSINESS_EMAIL || ''),
  supportHours: String(import.meta.env.PUBLIC_SUPPORT_HOURS || ''),
  legalEntity: String(import.meta.env.PUBLIC_LEGAL_ENTITY || ''),
  gstin: String(import.meta.env.PUBLIC_GSTIN || ''),
  hqAddress: String(import.meta.env.PUBLIC_HQ_ADDRESS || ''),
  insuranceCover: String(import.meta.env.PUBLIC_INSURANCE_COVER || ''),
  insurerName: String(import.meta.env.PUBLIC_INSURER_NAME || ''),
  instagram: String(import.meta.env.PUBLIC_INSTAGRAM || ''),
  facebook: String(import.meta.env.PUBLIC_FACEBOOK || ''),
  linkedin: String(import.meta.env.PUBLIC_LINKEDIN || ''),
  youtube: String(import.meta.env.PUBLIC_YOUTUBE || ''),
};

export function digits(s: string): string {
  return String(s || '').replace(/\D/g, '');
}

export function telFromIntl(intl: string): string {
  const d = digits(intl);
  return d ? `tel:+${d}` : '';
}

export function waFromIntl(intl: string, text?: string): string {
  const d = digits(intl);
  if (!d) return '';
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${d}${q}`;
}

function first(...vals: string[]): string {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

export function resolveLocal(crm: Partial<BusinessValues> = {}, sources: Partial<Record<BizKey, SourceMode>> = {}): BusinessValues {
  const out = { ...FRONTEND_BUSINESS };
  for (const k of BIZ_KEYS) {
    const mode = sources[k] || 'AUTO';
    const env = ENV_MAP[k];
    const c = crm[k] || '';
    const fe = FRONTEND_BUSINESS[k];
    if (mode === 'ENV') out[k] = first(env, c, fe);
    else if (mode === 'CRM') out[k] = first(c, env, fe);
    else if (mode === 'FRONTEND') out[k] = fe;
    else out[k] = first(env, c, fe);
  }
  if (out.phoneIntl) out.phoneIntl = digits(out.phoneIntl);
  if (out.whatsappIntl) out.whatsappIntl = digits(out.whatsappIntl);
  return out;
}

export async function fetchBusiness(): Promise<BusinessValues> {
  try {
    const r = await fetch(apiUrl('/api/public/settings'), { cache: 'no-store' });
    const d = await r.json();
    if (d?.business && typeof d.business === 'object') {
      return { ...FRONTEND_BUSINESS, ...d.business };
    }
  } catch {
    /* keep frontend default */
  }
  return resolveLocal();
}
