type PagesFunction = (context: { env: Record<string, string | undefined> }) => Response | Promise<Response>;

export const onRequestGet: PagesFunction = async (ctx) => {
  const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  if (!ctx.env.BACKEND_URL) return new Response(JSON.stringify({ ok: true, reviews: [] }), { headers });
  const res = await fetch(`${ctx.env.BACKEND_URL.replace(/\/$/, '')}/api/public/reviews`);
  return new Response(await res.text(), { status: res.status, headers });
};
