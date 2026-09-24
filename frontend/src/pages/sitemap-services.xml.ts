import type { APIRoute } from 'astro';
import { SITE } from '@/consts';
import { allServices } from '@/lib/data';
import { urlset, urlEntry } from '@/lib/sitemap';

export const GET: APIRoute = async () => {
  const services = await allServices();
  const urls = services.map((s) => urlEntry(`${SITE.domain}/services/${s.data.slug}/`, '0.8', 'monthly'));
  return new Response(urlset(urls), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
