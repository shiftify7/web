type PagesFunction = (context: { env: Record<string, string | undefined> }) => Response | Promise<Response>;

export const onRequestGet: PagesFunction = async (ctx) => {
  const headers = { 'content-type': 'application/json' };
  if (!ctx.env.BACKEND_URL) return new Response(JSON.stringify({ ok: true, posts: [] }), { headers });
  const res = await fetch(`${ctx.env.BACKEND_URL.replace(/\/$/, '')}/api/public/blogs`);
  return new Response(await res.text(), { status: res.status, headers });
};
