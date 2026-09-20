import type { APIRoute } from 'astro';
import { SITE } from '@/consts';
import { allCities } from '@/lib/data';
import { urlset, urlEntry } from '@/lib/sitemap';

export const GET: APIRoute = async () => {
  const cities = await allCities();
  const urls: { loc: string; priority?: string; changefreq?: string }[] = [];
  for (const c of cities) {
    urls.push(urlEntry(`${SITE.domain}/packers-and-movers-${c.data.slug}/`, '0.9', 'weekly'));
    for (const l of c.data.localities) {
      urls.push(urlEntry(`${SITE.domain}/packers-and-movers-${c.data.slug}/${l.slug}/`, '0.7', 'monthly'));
    }
  }
  return new Response(urlset(urls), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
