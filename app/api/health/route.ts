export async function GET(request: Request) {
  const expected = process.env.HAIRHAEYO_HEALTH_TOKEN;
  const provided = request.headers.get("x-hairhaeyo-health");
  return new Response(null, {
    status: expected && provided === expected ? 204 : 403,
    headers: { "cache-control": "no-store" },
  });
}
