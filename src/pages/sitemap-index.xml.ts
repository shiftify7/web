import type { APIRoute } from 'astro';
import { SITE } from '@/consts';

const MAPS = ['sitemap-pages.xml', 'sitemap-cities.xml', 'sitemap-routes.xml', 'sitemap-services.xml', 'sitemap-guides.xml'];

export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${MAPS.map((m) => `  <sitemap><loc>${SITE.domain}/${m}</loc></sitemap>`).join('\n')}
</sitemapindex>
`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
