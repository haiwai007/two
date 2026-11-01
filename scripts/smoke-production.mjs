import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function connectionDiagnostic(error, base) {
  const code = error.cause?.code ?? error.code;
  if (["ENOTFOUND", "EAI_AGAIN"].includes(code)) return `DNS is not ready for ${new URL(base).hostname} (${code}). The Worker upload may already be complete; verify Custom Domains and authoritative DNS. HTTPS acceptance has not passed.`;
  return `Cannot reach ${base}: ${code ?? error.message}. HTTPS acceptance has not passed.`;
}

export async function checkProduction({ fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 13, interval = 10000, report = console.log } = {}) {
  const base = "https://h6688.win";
  // Identify this monitoring client honestly, as recommended by Cloudflare's 1010 guidance.
  const headers = { "User-Agent": "AURUM-Deployment-Check/0.2 (+https://github.com/haiwai007/two)" };
  async function get(path, options = {}) {
    let response;
    try {
      response = await fetchImpl(base + path, { ...options, headers, signal: AbortSignal.timeout(20000) });
    } catch (error) {
      const wrapped = new Error(connectionDiagnostic(error, base), { cause: error });
      wrapped.retryable = ["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(error.cause?.code ?? error.code) || error.name === "TimeoutError";
      throw wrapped;
    }
    if (response.status !== 200) {
      const body = await response.text();
      const cloudflareCode = /(?:error code:\s*|error\s+)(1\d{3})\b/i.exec(body)?.[1];
      const blocked = response.status === 403;
      const error = new Error(`${path}: HTTP ${response.status}${cloudflareCode ? ` / Cloudflare ${cloudflareCode}` : ""}${blocked ? ". Access is blocked; inspect Cloudflare Security Events and Browser Integrity Check. The application has not passed HTTPS acceptance." : ""}`);
      error.retryable = response.status >= 500;
      throw error;
    }
    return response;
  }
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const health = await (await get("/api/health")).json();
      assert.equal(health.database, true);
      assert.equal(health.storage, true);
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      if (!error.retryable || attempt === attempts - 1) break;
      report(`HTTPS readiness attempt ${attempt + 1}/${attempts} failed; retrying in ${interval / 1000}s: ${error.message}`);
      await sleep(interval);
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
  let redirect;
  try {
    redirect = await fetchImpl("https://www.h6688.win/games?q=smoke", { redirect: "manual", headers, signal: AbortSignal.timeout(20000) });
  } catch (error) { throw new Error(connectionDiagnostic(error, "https://www.h6688.win"), { cause: error }); }
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get("location"), base + "/games?q=smoke");
  return { productionSmoke: "passed", origin: base, catalogGames: catalog.games.length, database: true, storage: true, https: true, turnstileConfigured: true, wwwRedirect: true, limitation: "Read-only smoke checks; real challenge completion, member/admin workflows and physical devices require production acceptance" };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  checkProduction().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
