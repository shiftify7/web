const KEYS = [
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
];

const FRONTEND = {
  phoneDisplay: '+91 87663 31715',
  phoneIntl: '918766331715',
  whatsappIntl: '918766331715',
  email: 'shiftify@gmail.com',
  supportHours: '',
  legalEntity: '',
  gstin: '',
  hqAddress: '',
  insuranceCover: '',
  insurerName: '',
  instagram: '',
  facebook: '',
  linkedin: '',
  youtube: '',
};

const ENV_NAMES = {
  phoneDisplay: ['PUBLIC_PHONE_DISPLAY'],
  phoneIntl: ['PUBLIC_PHONE_INTL'],
  whatsappIntl: ['PUBLIC_WHATSAPP_INTL'],
  email: ['PUBLIC_BUSINESS_EMAIL'],
  supportHours: ['PUBLIC_SUPPORT_HOURS'],
  legalEntity: ['PUBLIC_LEGAL_ENTITY'],
  gstin: ['PUBLIC_GSTIN'],
  hqAddress: ['PUBLIC_HQ_ADDRESS'],
  insuranceCover: ['PUBLIC_INSURANCE_COVER'],
  insurerName: ['PUBLIC_INSURER_NAME'],
  instagram: ['PUBLIC_INSTAGRAM'],
  facebook: ['PUBLIC_FACEBOOK'],
  linkedin: ['PUBLIC_LINKEDIN'],
  youtube: ['PUBLIC_YOUTUBE'],
};

const MODES = new Set(['AUTO', 'ENV', 'CRM', 'FRONTEND']);

function envVal(key) {
  for (const n of ENV_NAMES[key] || []) {
    const v = process.env[n];
    if (v && String(v).trim()) return String(v).trim();
  }
  return '';
}

function digits(s) {
  return String(s || '').replace(/\D/g, '');
}

function first(...vals) {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

export function envMap() {
  const o = {};
  for (const k of KEYS) o[k] = envVal(k);
  return o;
}

export function resolveBusiness(settings) {
  const crm = settings?.business && typeof settings.business === 'object' ? settings.business : {};
  const sources = settings?.businessSources && typeof settings.businessSources === 'object' ? settings.businessSources : {};
  const env = envMap();
  const values = {};
  const resolvedFrom = {};
  const envPresent = {};
  for (const k of KEYS) {
    const mode = MODES.has(sources[k]) ? sources[k] : 'AUTO';
    const e = env[k] || '';
    const c = typeof crm[k] === 'string' ? crm[k].trim() : '';
    const fe = FRONTEND[k] || '';
    envPresent[k] = Boolean(e);
    let picked = '';
    let from = '';
    if (mode === 'ENV') {
      picked = first(e, c, fe);
      from = e ? 'ENV' : c ? 'CRM' : fe ? 'FRONTEND' : '';
    } else if (mode === 'CRM') {
      picked = first(c, e, fe);
      from = c ? 'CRM' : e ? 'ENV' : fe ? 'FRONTEND' : '';
    } else if (mode === 'FRONTEND') {
      picked = fe;
      from = fe ? 'FRONTEND' : '';
    } else {
      picked = first(e, c, fe);
      from = e ? 'ENV' : c ? 'CRM' : fe ? 'FRONTEND' : '';
    }
    if (k === 'phoneIntl' || k === 'whatsappIntl') picked = digits(picked);
    values[k] = picked;
    resolvedFrom[k] = from;
  }
  return { values, resolvedFrom, envPresent, frontend: FRONTEND, crm, sources: { ...Object.fromEntries(KEYS.map((k) => [k, MODES.has(sources[k]) ? sources[k] : 'AUTO'])) } };
}

export { KEYS, FRONTEND, MODES };
