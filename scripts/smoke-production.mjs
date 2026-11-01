import assert from "node:assert/strict";
const base = "https://h6688.win";
async function get(path, options = {}) {
  const response = await fetch(base + path, { ...options, signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return response;
}
let lastError;
for (let attempt = 0; attempt < 6; attempt++) {
  try {
    const health = await (await get("/api/health")).json();
    assert.equal(health.database, true);
    assert.equal(health.storage, true);
    lastError = undefined;
    break;
  } catch (error) {
    lastError = error;
    if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
if (lastError) throw lastError;
for (const path of ["/", "/games", "/register", "/login", "/game/golden-god", "/play/golden-god"]) {
  assert.match((await get(path)).headers.get("content-type") ?? "", /text\/html/);
}
const config = await (await get("/api/config")).json();
assert.equal(config.requireTurnstile, true);
assert.ok(config.turnstileSiteKey);
const catalog = await (await get("/api/games")).json();
assert.ok(catalog.games.length > 0);
const cover = await get("/api/assets/" + encodeURIComponent(catalog.games[0].cover_asset_id));
assert.match(cover.headers.get("content-type") ?? "", /^image\//);
await cover.arrayBuffer();
const redirect = await fetch("https://www.h6688.win/games?q=smoke", { redirect: "manual", signal: AbortSignal.timeout(20000) });
assert.equal(redirect.status, 301);
assert.equal(redirect.headers.get("location"), base + "/games?q=smoke");
console.log(JSON.stringify({ productionSmoke: "passed", origin: base, catalogGames: catalog.games.length, database: true, storage: true, https: true, turnstileConfigured: true, wwwRedirect: true, limitation: "Read-only smoke checks; real challenge completion, member/admin workflows and physical devices require production acceptance" }));
