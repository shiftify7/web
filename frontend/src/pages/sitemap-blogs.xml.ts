import type { APIRoute } from 'astro';
import { SITE } from '@/consts';
import { SEED_BLOGS } from '@/data/seed-blogs';
import { urlset, urlEntry } from '@/lib/sitemap';

/** Published, statically rendered seed blog posts only. */
export const GET: APIRoute = () => {
  const urls = SEED_BLOGS
    .filter((post) => post.status === 'published')
    .map((post) => urlEntry(`${SITE.domain}/blog/${post.slug}/`, '0.6', 'monthly', post.updatedAt.slice(0, 10)));
  return new Response(urlset(urls), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
