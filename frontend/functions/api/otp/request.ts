type PagesFunction = (context: {
  request: Request;
  env: Record<string, string | undefined>;
}) => Response | Promise<Response>;

export const onRequestPost: PagesFunction = async (ctx) => {
  const headers = { 'content-type': 'application/json' };
  if (!ctx.env.BACKEND_URL) {
    return new Response(JSON.stringify({ ok: false, error: 'otp_unavailable' }), { status: 503, headers });
  }
  const res = await fetch(`${ctx.env.BACKEND_URL.replace(/\/$/, '')}/api/otp/request`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: await ctx.request.text(),
  });
  return new Response(await res.text(), { status: res.status, headers });
};
