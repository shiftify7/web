import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '@/consts';
import { urlset, urlEntry } from '@/lib/sitemap';

export const GET: APIRoute = async () => {
  const guides = (await getCollection('guides')).filter((g) => !g.data.draft);
  const urls = guides.map((g) =>
    urlEntry(`${SITE.domain}/guides/${g.id.replace(/\.mdx?$/, '')}/`, '0.7', 'monthly', g.data.updatedDate ?? g.data.pubDate),
  );
  return new Response(urlset(urls), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
