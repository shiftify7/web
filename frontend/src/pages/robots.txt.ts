import type { APIRoute } from 'astro';
import { SITE } from '@/consts';

export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /
Disallow: /thank-you/
Disallow: /lp/
Disallow: /crm/
Disallow: /api/

Sitemap: ${SITE.domain}/sitemap-index.xml
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
