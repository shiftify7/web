type PagesFunction = (context: { request: Request; env: Record<string, string | undefined> }) => Response | Promise<Response>;

export const onRequestGet: PagesFunction = async (ctx) => {
  const headers = { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' };
  if (!ctx.env.BACKEND_URL) return new Response(JSON.stringify({ ok: true, data: [] }), { headers });
  const u = new URL(ctx.request.url);
  const dest = `${ctx.env.BACKEND_URL.replace(/\/$/, '')}/api/public/media${u.search}`;
  const res = await fetch(dest);
  return new Response(await res.text(), { status: res.status, headers });
};
