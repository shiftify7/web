import { apiUrl } from '@/consts';

export type PublicMedia = {
  id: string;
  title: string;
  alt: string;
  url: string;
  category: string;
  section: string;
  width: number;
  height: number;
  sortOrder: number;
  locationSlug?: string;
};

const CLOUDINARY_TRANSFORM = /^((?:f_auto|q_auto|c_[^,]+|w_\d+|dpr_auto),?)+$/;

/**
 * Apply the same safe, responsive Cloudinary transform everywhere the public
 * media API is used. Local/fallback assets are returned untouched.
 */
export function cldUrl(url: string, w = 1200): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const marker = '/upload/';
  const index = url.indexOf(marker);
  if (index < 0) return url;

  const prefix = url.slice(0, index + marker.length);
  const path = url.slice(index + marker.length).split('/');
  if (path[0] && CLOUDINARY_TRANSFORM.test(path[0])) path.shift();
  return `${prefix}f_auto,q_auto,c_limit,w_${Math.max(240, Math.round(w))}/${path.join('/')}`;
}

export function cldSrcSet(url: string, widths: number[] = [480, 768, 1024, 1440]): string {
  if (!url || !url.includes('res.cloudinary.com')) return '';
  return [...new Set(widths)]
    .sort((a, b) => a - b)
    .map((width) => `${cldUrl(url, width)} ${width}w`)
    .join(', ');
}

export async function getLandingImages(section: string): Promise<PublicMedia[]> {
  try {
    const r = await fetch(
      apiUrl(`/api/public/media?category=LANDING_PAGE&section=${encodeURIComponent(section)}`),
      { headers: { accept: 'application/json' } },
    );
    if (!r.ok) return [];
    const d = await r.json();
    const list = (d.data || d.items || []) as PublicMedia[];
    return list.filter((x) => x && x.url);
  } catch {
    return [];
  }
}

export async function firstLandingImage(section: string): Promise<PublicMedia | null> {
  const list = await getLandingImages(section);
  return list[0] || null;
}
