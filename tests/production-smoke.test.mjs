import test from "node:test";
import assert from "node:assert/strict";
import { checkProduction } from "../scripts/smoke-production.mjs";
const origin = "https://h6688.win";
function goodFetch(url, options) {
  assert.match(options.headers["User-Agent"], /^AURUM-Deployment-Check\//);
  const path = new URL(url).pathname;
  if (url.startsWith("https://www.")) return new Response(null, { status: 301, headers: { location: origin + "/games?q=smoke" } });
  if (path === "/api/health") return Response.json({ database: true, storage: true });
  if (path === "/api/config") return Response.json({ requireTurnstile: true, turnstileSiteKey: "public-test-key" });
  if (path === "/api/games") return Response.json({ games: [{ cover_asset_id: "test-cover" }] });
  if (path.startsWith("/api/assets/")) return new Response(new Uint8Array([1]), { headers: { "content-type": "image/webp" } });
  return new Response("<html>test</html>", { headers: { "content-type": "text/html" } });
}
const quiet = { report: () => {} };
test("temporary DNS failure retries and then checks actual service responses", async () => {
  let calls = 0;
  const waits = [];
  const result = await checkProduction({ ...quiet, sleep: async ms => waits.push(ms), fetchImpl: async (url, options) => {
    if (calls++ < 2) throw new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } });
    return goodFetch(url, options);
  } });
  assert.equal(result.productionSmoke, "passed");
  assert.deepEqual(waits, [10000, 10000]);
});
test("persistent DNS failure never becomes a successful acceptance", async () => {
  let calls = 0;
  await assert.rejects(checkProduction({ ...quiet, attempts: 3, sleep: async () => {}, fetchImpl: async () => { calls++; throw new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } }); } }), /DNS is not ready.*HTTPS acceptance has not passed/);
  assert.equal(calls, 3);
});
test("Cloudflare 1010 is reported as a security rejection without blind retries", async () => {
  let calls = 0;
  await assert.rejects(checkProduction({ ...quiet, sleep: async () => assert.fail("403 must not retry"), fetchImpl: async () => { calls++; return new Response("error code: 1010", { status: 403 }); } }), /HTTP 403 \/ Cloudflare 1010/);
  assert.equal(calls, 1);
});
test("a reachable site with Turnstile disabled fails acceptance", async () => {
  await assert.rejects(checkProduction({ ...quiet, fetchImpl: async (url, options) => url.endsWith("/api/config") ? Response.json({ requireTurnstile: false }) : goodFetch(url, options) }));
});
test("www must redirect to the exact primary domain and preserve the query", async () => {
  await assert.rejects(checkProduction({ ...quiet, fetchImpl: async (url, options) => url.startsWith("https://www.") ? new Response(null, { status: 301, headers: { location: origin + "/" } }) : goodFetch(url, options) }));
});
