/** Credential-onboarding endpoint only. No wallet or database is connected yet.
 * Waija requires HTTP 200 even for processing/authentication errors.
 * Keep every request rejected until signed, idempotent wallet handling is deployed.
 */
export function callbackNotReady(_request?: Request) {
  return Response.json({ error: 2, balance: 0 }, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, private, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Cloudflare-CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function callbackHead() {
  const response = callbackNotReady();
  return new Response(null, { status: response.status, headers: response.headers });
}
