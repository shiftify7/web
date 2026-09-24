import type { APIRoute } from 'astro';
import { SITE } from '@/consts';
import { INDIA_STATES } from '@/lib/locations';
import { urlset, urlEntry } from '@/lib/sitemap';

/** Only canonical, statically generated, indexable state landing URLs belong here. */
export const GET: APIRoute = () => {
  const urls = INDIA_STATES.map((region) => urlEntry(
    `${SITE.domain}/packers-and-movers-in-${region.slug}/`,
    '0.7',
    'monthly',
  ));
  return new Response(urlset(urls), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
