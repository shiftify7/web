/** Tiny sitemap XML helpers for the split-sitemap endpoints. */

export function xmlEscape(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function urlEntry(loc: string, priority?: string, changefreq?: string, lastmod?: string) {
  return {
    loc: xmlEscape(loc),
    priority,
    changefreq,
    lastmod,
  };
}

export function urlset(entries: { loc: string; priority?: string; changefreq?: string; lastmod?: string }[]): string {
  const body = entries
    .map(
      (e) => `  <url>
    <loc>${e.loc}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}${e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : ''}${e.priority ? `\n    <priority>${e.priority}</priority>` : ''}
  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;
}
