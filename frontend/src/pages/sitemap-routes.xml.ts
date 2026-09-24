import type { APIRoute } from 'astro';
import { SITE } from '@/consts';
import { allRoutes } from '@/lib/data';
import { urlset, urlEntry } from '@/lib/sitemap';

export const GET: APIRoute = async () => {
  const routes = await allRoutes();
  const urls = routes.map((r) =>
    urlEntry(`${SITE.domain}/packers-and-movers-${r.data.from}-to-${r.data.to}/`, '0.8', 'monthly'),
  );
  return new Response(urlset(urls), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
