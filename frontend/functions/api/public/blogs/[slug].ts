type PagesFunction = (context: {
  env: Record<string, string | undefined>;
  params: { slug: string };
}) => Response | Promise<Response>;

export const onRequestGet: PagesFunction = async (ctx) => {
  const headers = { 'content-type': 'application/json' };
  if (!ctx.env.BACKEND_URL) return new Response(JSON.stringify({ ok: false }), { status: 404, headers });
  const res = await fetch(`${ctx.env.BACKEND_URL.replace(/\/$/, '')}/api/public/blogs/${ctx.params.slug}`);
  return new Response(await res.text(), { status: res.status, headers });
};
