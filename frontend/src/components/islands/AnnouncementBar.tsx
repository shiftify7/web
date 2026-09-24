import { useEffect, useState } from 'preact/hooks';
import { apiUrl } from '@/consts';

export type Ann = {
  enabled?: boolean;
  text?: string;
  link?: string;
  position?: 'LEFT' | 'CENTER' | 'RIGHT';
  background?: string;
  textColor?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

export function AnnouncementStrip({ a }: { a: Ann }) {
  if (!a?.text) return null;
  const justify = a.position === 'LEFT' ? 'flex-start' : a.position === 'RIGHT' ? 'flex-end' : 'center';
  const href = a.ctaUrl || a.link || '';
  return (
    <div
      class="sfx-ann"
      style={{
        background: a.background || '#1e3a8a',
        color: a.textColor || '#fff',
        justifyContent: justify,
      }}
    >
      <span>{a.text}</span>
      {a.ctaLabel && href && (
        <a href={href}>{a.ctaLabel}</a>
      )}
    </div>
  );
}

export default function AnnouncementBar() {
  const [a, setA] = useState<Ann | null>(null);
  useEffect(() => {
    fetch(apiUrl('/api/public/settings'))
      .then((r) => r.json())
      .then((d) => setA(d.announcement || null))
      .catch(() => {});
  }, []);
  if (!a?.text) return null;
  return <AnnouncementStrip a={a} />;
}
