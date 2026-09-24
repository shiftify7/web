import { useEffect, useState } from 'preact/hooks';
import { FRONTEND_BUSINESS, fetchBusiness, type BizKey } from '@/lib/business';

/** Renders resolved business text or nothing (never a placeholder token). */
export default function BizText({ field, prefix = '', suffix = '' }: { field: BizKey; prefix?: string; suffix?: string }) {
  const [v, setV] = useState(FRONTEND_BUSINESS[field]);
  useEffect(() => { fetchBusiness().then((b) => setV(b[field] || '')); }, [field]);
  if (!v) return null;
  return <span>{prefix}{v}{suffix}</span>;
}
