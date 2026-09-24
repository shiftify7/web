import type { APIRoute } from 'astro';
import { SITE } from '@/consts';
import { urlset, urlEntry } from '@/lib/sitemap';

const PAGES: [string, string][] = [
  ['/', '1.0'],
  ['/about/', '0.6'],
  ['/contact/', '0.8'],
  ['/reviews/', '0.6'],
  ['/faq/', '0.7'],
  ['/cities/', '0.8'],
  ['/services/', '0.8'],
  ['/guides/', '0.6'],
  ['/blog/', '0.6'],
  ['/privacy-policy/', '0.2'],
  ['/terms/', '0.2'],
  ['/refund-policy/', '0.2'],
  ['/disclaimer/', '0.2'],
];

export const GET: APIRoute = () =>
  new Response(
    urlset(PAGES.map(([p, prio]) => urlEntry(`${SITE.domain}${p}`, prio, 'weekly'))),
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
