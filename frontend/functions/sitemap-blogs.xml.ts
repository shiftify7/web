export const onRequestGet = async (ctx: { env: Record<string, string | undefined> }) => {
  const origin = 'https://shiftify.in';
  let urls: string[] = [`${origin}/blog/`];
  if (ctx.env.BACKEND_URL) {
    try {
      const res = await fetch(`${ctx.env.BACKEND_URL.replace(/\/$/, '')}/api/public/blogs`);
      const d = (await res.json()) as { posts?: { slug: string }[] };
      for (const p of d.posts || []) urls.push(`${origin}/blog/${p.slug}/`);
    } catch {}
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
