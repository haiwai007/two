import { test, expect, request as createRequest } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const defs = JSON.parse(
  fs.readFileSync("lib/game-definitions.json", "utf8"),
) as { id: string; name: string }[];
let cookies: Awaited<
  ReturnType<
    Awaited<ReturnType<typeof createRequest.newContext>>["storageState"]
  >
>["cookies"];
test.beforeAll(async ({ baseURL }) => {
  execFileSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "aurum-db",
      "--local",
      "--command",
      "DELETE FROM rate_limits",
    ],
    { stdio: "pipe" },
  );
  const api = await createRequest.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL! },
  });
  const username = "browser_" + Date.now().toString(36);
  const password = crypto.randomUUID() + "Pass";
  const registered = await api.post("/api/auth/register", {
    data: {
      username,
      email: username + "@example.test",
      password,
      agreement: true,
    },
  });
  expect(registered.status()).toBe(201);
  const { user } = await (await api.get("/api/auth/me")).json();
  execFileSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "aurum-db",
      "--local",
      "--command",
      `INSERT INTO admin_users(user_id,role) VALUES('${user.id}','owner')`,
    ],
    { stdio: "pipe" },
  );
  cookies = (await api.storageState()).cookies;
  await api.dispose();
});
test.beforeEach(async ({ context }) => {
  await context.addCookies(cookies);
});
test("lobby search, favorites and pagination use real data", async ({
  page,
}) => {
  await page.goto("/games");
  await expect(page.locator(".user-link")).toBeVisible();
  await expect(page.locator(".game-card")).toHaveCount(18);
  await page.getByRole("button", { name: /加载更多/ }).click();
  await expect(page.locator(".game-card")).toHaveCount(30);
  await page.getByRole("textbox", { name: "搜索游戏" }).fill("神秘宝库");
  await expect(page.locator(".game-card")).toHaveCount(1);
  const favoriteResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/favorites/mysterious-vault") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "收藏神秘宝库" }).click();
  expect((await favoriteResponse).status()).toBe(200);
  await page.goto("/profile/favorites");
  await expect(page.locator(".game-card")).toHaveCount(1);
  await expect(page.locator(".game-caption")).toContainText("神秘宝库");
});
for (const def of defs)
  test(
    def.id + ": Canvas loads and a server round completes",
    async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("/play/" + def.id);
      await expect(page.locator(".game-stage canvas")).toBeVisible();
      const spin = page.getByRole("button", { name: "开始游戏", exact: true });
      await expect(spin).toBeEnabled();
      const response = page.waitForResponse(
        (r) =>
          r.url().includes("/api/play/" + def.id) &&
          r.request().method() === "POST",
      );
      await spin.click();
      const actual = await response;
      expect(actual.status()).toBe(200);
      const result = await actual.json();
      expect(result.round.gameVersion).toBe("0.2.0");
      await expect(spin).toBeEnabled({ timeout: 20000 });
      expect(errors).toEqual([]);
      await page.getByRole("button", { name: "游戏规则", exact: true }).click();
      await expect(page.getByRole("dialog")).toContainText("原创演示规则");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    },
  );
test("mobile routes and game controls stay within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of [
    "/",
    "/games",
    "/register",
    "/profile",
    "/admin",
    "/play/candy-world",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator(".user-link")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await expect(page.locator(".game-stage canvas")).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-game.png",
    fullPage: true,
  });
});
test("admin saves an announcement and the public page displays it", async ({
  page,
}) => {
  await page.goto("/admin/announcements");
  await page.getByRole("button", { name: "新增记录" }).click();
  const dialog = page.getByRole("dialog");
  const title = "browser-note-" + Date.now();
  await dialog.getByLabel("id", { exact: true }).fill(title);
  await dialog.getByLabel("标题", { exact: true }).fill(title);
  await dialog
    .getByLabel("内容", { exact: true })
    .fill("浏览器端数据库读写验证");
  await dialog
    .getByLabel("状态(draft/published)", { exact: true })
    .fill("published");
  await dialog.getByRole("button", { name: "保存到数据库" }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/announcements");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});

test("automatic play can be stopped during the first settled round", async ({
  page,
}) => {
  await page.goto("/play/fruit-party");
  await expect(
    page.getByRole("button", { name: "开始游戏", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "快速动画：关" }).click();
  let plays = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/play/fruit-party") && r.method() === "POST")
      plays++;
  });
  const settled = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/play/fruit-party") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "自动10局" }).click();
  expect((await settled).status()).toBe(200);
  await page.getByRole("button", { name: /停止自动/ }).click();
  await expect(
    page.getByRole("button", { name: "开始游戏", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("button", { name: "自动10局" })).toBeVisible();
  expect(plays).toBe(1);
});

test("lost settlement response retries the same key without another debit", async ({
  page,
}) => {
  const before = (await (await page.request.get("/api/profile")).json()).records
    .length;
  let first = true,
    firstKey = "";
  await page.route("**/api/play/golden-god", async (route) => {
    const key = route.request().postDataJSON().requestKey;
    const response = await route.fetch();
    if (first) {
      first = false;
      firstKey = key;
      expect(response.status()).toBe(200);
      await route.abort("failed");
    } else {
      expect(key).toBe(firstKey);
      expect((await response.json()).replayed).toBe(true);
      await route.fulfill({ response });
    }
  });
  await page.goto("/play/golden-god");
  await expect(
    page.getByRole("button", { name: "开始游戏", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "开始游戏", exact: true }).click();
  const retry = page.getByRole("button", { name: "重试本局", exact: true });
  await expect(retry).toBeEnabled();
  await retry.click();
  await expect(
    page.getByRole("button", { name: "开始游戏", exact: true }),
  ).toBeEnabled({ timeout: 20000 });
  const after = (await (await page.request.get("/api/profile")).json()).records
    .length;
  expect(after).toBe(before + 1);
});

test("register, validation, logout and login work through the visible forms", async ({
  page,
  context,
}) => {
  await context.clearCookies();
  const username = "form_" + Date.now().toString(36),
    password = "Browser-" + crypto.randomUUID();
  await page.goto("/register");
  await page.getByLabel("用户名", { exact: true }).fill(username);
  await page
    .getByLabel("邮箱", { exact: true })
    .fill(username + "@example.test");
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page
    .getByLabel("确认密码", { exact: true })
    .fill(password + "different");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "创建账号", exact: true }).click();
  await expect(page.locator(".auth-form").getByRole("alert")).toContainText(
    "两次密码不一致",
  );
  await page.getByLabel("确认密码", { exact: true }).fill(password);
  await page.getByRole("button", { name: "创建账号", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.locator(".user-link")).toContainText(username);
  const logout = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/logout") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "退出登录" }).click();
  await logout;
  await expect(page.getByRole("button", { name: "退出登录" })).toHaveCount(0);
  await page.goto("/login");
  await page.getByLabel("用户名或邮箱").fill(username);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.getByRole("button", { name: "登录账号" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.locator(".user-link")).toContainText(username);
});

test("another member does not inherit a saved pending round", async ({
  page,
  context,
  baseURL,
}) => {
  const owner = (await (await page.request.get("/api/auth/me")).json()).user;
  const key = crypto.randomUUID();
  await page.goto("/games");
  await page.evaluate(
    ({ id, key }) =>
      sessionStorage.setItem(
        "round:" + id + ":golden-god",
        JSON.stringify({ key, stake: 10 }),
      ),
    { id: owner.id, key },
  );
  await page.goto("/play/golden-god");
  await expect(
    page.getByRole("button", { name: "重试本局", exact: true }),
  ).toBeEnabled();
  const username = "switch_" + Date.now().toString(36);
  const response = await context.request.post("/api/auth/register", {
    headers: { Origin: baseURL! },
    data: {
      username,
      email: username + "@example.test",
      password: crypto.randomUUID() + "Password",
      agreement: true,
    },
  });
  expect(response.status()).toBe(201);
  await page.goto("/play/golden-god");
  await expect(
    page.getByRole("button", { name: "开始游戏", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      (id) => sessionStorage.getItem("round:" + id + ":golden-god"),
      owner.id,
    ),
  ).toContain(key);
});

test("mobile game spin, sound and fullscreen controls remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/play/phoenix-legend");
  const start = page.getByRole("button", { name: "开始游戏", exact: true });
  await expect(start).toBeEnabled();
  await page.getByRole("button", { name: "音效开关" }).click();
  await page.getByRole("button", { name: "全屏", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.keyboard.press("Escape");
  await start.click();
  await page.getByRole("button", { name: "跳过动画" }).click();
  await expect(start).toBeEnabled({ timeout: 20000 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("tablet lobby uses four columns and generated delivery pictures", async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/games");
  await expect(page.locator(".user-link")).toBeVisible();
  const columns = await page
    .locator(".game-grid")
    .first()
    .evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
    );
  expect(columns).toBe(4);
  const source = await page
    .locator(".game-art img")
    .first()
    .getAttribute("src");
  expect(source).toContain("/api/assets/webp-");
  await page.screenshot({
    path: "test-results/tablet-lobby.png",
    fullPage: true,
  });
});

test("avatar upload is rendered from the project storage", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.locator(".user-link")).toBeVisible();
  const sharp = (await import("sharp")).default;
  const png = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 225, g: 180, b: 100, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const uploaded = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/profile/avatar") &&
      r.request().method() === "POST",
  );
  await page
    .locator(".avatar-upload input")
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: png });
  expect((await uploaded).status()).toBe(200);
  await expect(page.locator(".avatar img")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".avatar img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(16);
});

test("new banner and symbol artwork are loaded from database bindings without code changes", async ({
  page,
  baseURL,
}) => {
  const origin = { Origin: baseURL! };
  const original = (
    await (await page.request.get("/api/games/golden-god")).json()
  ).game;
  const sharp = (await import("sharp")).default;
  const png = await sharp({
    create: {
      width: 80,
      height: 80,
      channels: 4,
      background: { r: 240, g: 180, b: 30, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const upload = await page.request.post("/api/admin/assets", {
    headers: origin,
    multipart: {
      files: { name: "symbol-fixture.png", mimeType: "image/png", buffer: png },
    },
  });
  expect(upload.status()).toBe(201);
  const assetId = (await upload.json()).ids[0];
  try {
    const config = {
      ...JSON.parse(original.config),
      symbolAssets: { 0: assetId },
    };
    const changed = await page.request.patch("/api/admin/games/golden-god", {
      headers: origin,
      data: { banner_asset_id: assetId, config: JSON.stringify(config) },
    });
    expect(changed.status()).toBe(200);
    const guarded = await page.request.delete("/api/admin/assets/" + assetId, {
      headers: origin,
    });
    expect(guarded.status()).toBe(409);
    await page.goto("/games");
    await expect(page.locator(".user-link")).toBeVisible();
    await page.locator('.game-art[href="/game/golden-god"]').click();
    await page.getByRole("link", { name: "开始游戏", exact: true }).click();
    const canvas = page.locator(".game-stage canvas");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute("data-symbol-textures", "1");
    const start = page.getByRole("button", { name: "开始游戏", exact: true });
    await expect(start).toBeEnabled();
    await start.click();
    await expect(start).toBeEnabled({ timeout: 20000 });
  } finally {
    await page.request.patch("/api/admin/games/golden-god", {
      headers: origin,
      data: {
        banner_asset_id: original.banner_asset_id,
        config: original.config,
      },
    });
    await page.request.delete("/api/admin/assets/" + assetId, {
      headers: origin,
    });
  }
});

test("failed login resets the single-use challenge before retry (client stub)", async ({ page }) => {
  await page.addInitScript(() => {
    let callback: (token: string) => void;
    let generation = 1;
    (window as any).turnstile = {
      render: (_el: unknown, options: any) => {
        callback = options.callback;
        callback("test-token-1");
        return "test-widget";
      },
      reset: () => callback("test-token-" + ++generation),
      remove: () => {},
    };
  });
  await page.route("**/api/config", route => route.fulfill({ json: { requireTurnstile: true, turnstileSiteKey: "client-test-only" } }));
  const tokens: string[] = [];
  await page.route("**/api/auth/login", route => {
    tokens.push(route.request().postDataJSON().turnstile);
    return route.fulfill({ status: 401, json: { error: "测试登录失败" } });
  });
  await page.goto("/login");
  await page.locator('input[name="identity"]').fill("challenge-test");
  await page.locator('input[name="password"]').fill("WrongPassword123!");
  await page.getByRole("button", { name: "登录账号", exact: true }).click();
  await expect.poll(() => tokens.length).toBe(1);
  await expect(page.locator(".form-error")).toContainText("测试登录失败");
  await page.getByRole("button", { name: "登录账号", exact: true }).click();
  await expect.poll(() => tokens.length).toBe(2);
  expect(tokens).toEqual(["test-token-1", "test-token-2"]);
});

test("cold auth page loads the real SDK script instead of mistaking a DOM id for it (client stub)", async ({ page }) => {
  let scriptLoads = 0;
  await page.route("**/api/config", route => route.fulfill({ json: { requireTurnstile: true, turnstileSiteKey: "client-test-only" } }));
  await page.route("**/turnstile/v0/api.js?*", route => {
    scriptLoads++;
    return route.fulfill({ contentType: "application/javascript", body: `window.turnstile={render:function(el,options){window.__challengeOptions=options;el.textContent='测试验证组件已加载';return 'cold-widget'},remove:function(){},reset:function(){}};` });
  });
  await page.goto("/register");
  await expect(page.getByText("测试验证组件已加载", { exact: true })).toBeVisible();
  expect(scriptLoads).toBe(1);
  const submit = page.getByRole("button", { name: "创建账号", exact: true });
  await expect(submit).toBeDisabled();
  await page.evaluate(() => (window as any).__challengeOptions.callback("cold-stub-token"));
  await expect(submit).toBeEnabled();
  await page.evaluate(() => (window as any).__challengeOptions["expired-callback"]());
  await expect(submit).toBeDisabled();
  await expect(page.locator(".form-error")).toContainText("已过期");
});

test("a form cannot submit before verification and widget errors can be retried (client stub)", async ({ page }) => {
  await page.addInitScript(() => {
    let renderCount = 0;
    (window as any).turnstile = {
      render: (_el: unknown, options: any) => { (window as any).__challengeOptions = options; renderCount++; if (renderCount > 1) options.callback("retried-stub-token"); return "guard-widget"; },
      remove: () => {}, reset: () => {},
    };
  });
  let submissions = 0;
  await page.route("**/api/config", route => route.fulfill({ json: { requireTurnstile: true, turnstileSiteKey: "client-test-only" } }));
  await page.route("**/api/auth/login", route => { submissions++; return route.fulfill({ status: 401, json: { error: "测试登录拒绝" } }); });
  await page.goto("/login");
  await page.locator('input[name="identity"]').fill("guard-test");
  await page.locator('input[name="password"]').fill("WrongPassword123!");
  const submit = page.getByRole("button", { name: "登录账号", exact: true });
  await expect(submit).toBeDisabled();
  await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.locator(".form-error")).toContainText("请先完成人机验证");
  expect(submissions).toBe(0);
  await page.evaluate(() => (window as any).__challengeOptions["error-callback"]("110200"));
  await expect(page.locator(".form-error")).toContainText("当前域名");
  await page.getByRole("button", { name: "重试人机验证", exact: true }).click();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect.poll(() => submissions).toBe(1);
});
