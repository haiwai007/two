import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const origin = "https://h6688.win";
const output = ".test-state/production-qa";
mkdirSync(output, { recursive: true });
const headers = { "User-Agent": "AURUM-Production-QA/0.2 (+https://github.com/haiwai007/two)" };
const report = { origin, checkedAt: new Date().toISOString(), mode: "anonymous read-only", assets: [], layouts: [], browserErrors: [], blockedWrites: [], limitations: ["No production registration, login, point mutation or admin operation", "Chromium viewports are not physical device or Safari validation"] };
async function request(path, method = "GET") {
  return fetch(origin + path, { method, headers, signal: AbortSignal.timeout(25000) });
}
const response = await request("/api/games");
assert.equal(response.status, 200);
const { games } = await response.json();
assert.equal(games.length, 30);
for (const path of ["/api/profile", "/api/admin/statistics"]) {
  const r = await request(path);
  assert.ok([401, 403].includes(r.status), `${path} exposed to an anonymous visitor: ${r.status}`);
}
const assets = [...new Set(games.flatMap(g => [g.cover_asset_id, g.banner_asset_id]))];
let cursor = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (cursor < assets.length) {
    const assetId = assets[cursor++];
    const r = await request("/api/assets/" + encodeURIComponent(assetId), "HEAD");
    assert.equal(r.status, 200, assetId);
    assert.match(r.headers.get("content-type") ?? "", /^image\//, assetId);
    report.assets.push({ assetId, status: r.status });
  }
}));
const proxyServer = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  proxy: proxyServer ? { server: proxyServer } : undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader"],
});
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }, { width: 820, height: 1180 }]) {
    const context = await browser.newContext({ viewport });
    await context.route("**/*", route => {
      const req = route.request();
      if (new URL(req.url()).origin === origin && !["GET", "HEAD"].includes(req.method())) {
        report.blockedWrites.push({ method: req.method(), url: req.url() });
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", error => report.browserErrors.push({ viewport: viewport.width, message: error.message }));
    for (const path of ["/", "/games", "/login", "/register", "/profile", "/admin", "/play/golden-god"]) {
      const nav = await page.goto(origin + path, { waitUntil: "domcontentloaded", timeout: 45000 });
      assert.equal(nav.status(), 200, path);
      await page.locator(".topbar").waitFor();
      if (path === "/login" || path === "/register") {
        await page.waitForFunction(() => typeof window.turnstile?.render === "function" && (document.getElementById("auth-turnstile-widget")?.childElementCount ?? 0) > 0, undefined, { timeout: 25000 });
      }
      if (path === "/games") {
        await page.locator(".game-card").first().waitFor();
        assert.equal(await page.locator(".game-card").count(), 18);
        await page.getByRole("button", { name: /加载更多/ }).click();
        await page.locator(".game-card").nth(29).waitFor();
        assert.equal(await page.locator(".game-card").count(), 30);
        await page.getByRole("textbox", { name: "搜索游戏" }).fill("神秘宝库");
        await page.waitForFunction(() => document.querySelectorAll(".game-card").length === 1);
        await page.getByRole("textbox", { name: "搜索游戏" }).fill("");
      }
      if (path === "/play/golden-god") {
        await page.locator(".game-stage canvas").waitFor({ timeout: 30000 });
        await page.getByRole("button", { name: "开始游戏", exact: true }).click();
        await page.getByText("请先登录后体验游戏", { exact: true }).waitFor();
      }
      const dimensions = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }));
      assert.ok(dimensions.documentWidth <= dimensions.width + 1, `${viewport.width}px ${path} overflows: ${dimensions.documentWidth}`);
      report.layouts.push({ viewport: viewport.width, path, ...dimensions });
      if (path === "/games") {
        await page.locator(".game-card").nth(29).waitFor();
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let top = 0; top < height; top += viewport.height) {
          await page.evaluate(y => window.scrollTo(0, y), top);
          await page.waitForTimeout(150);
        }
        await page.waitForFunction(() => [...document.querySelectorAll(".game-card img")].every(img => img.complete && img.naturalWidth > 0));
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      if (path === "/games" || path === "/play/golden-god") await page.screenshot({ path: `${output}/${viewport.width}-${path.startsWith("/play") ? "game" : "lobby"}.png`, fullPage: true });
    }
    await context.close();
  }
  assert.deepEqual(report.browserErrors, []);
  assert.deepEqual(report.blockedWrites, []);
  report.result = "passed";
} catch (error) {
  report.result = "failed";
  report.error = error.message;
  throw error;
} finally {
  await browser.close();
  writeFileSync(output + "/report.json", JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ result: report.result, assets: report.assets.length, layouts: report.layouts.length, browserErrors: report.browserErrors.length, blockedWrites: report.blockedWrites.length, report: output + "/report.json" }));
