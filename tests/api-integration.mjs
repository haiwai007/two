import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const origin = process.env.TEST_ORIGIN ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw new Error("This test only runs against a local development database");
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
  {
    stdio: "pipe",
    env: {
      ...process.env,
      XDG_CONFIG_HOME: "/workspace/work/config",
      WRANGLER_SEND_METRICS: "false",
    },
  },
);
let cookie = "";
const checks = [];
async function request(
  path,
  method = "GET",
  data,
  expected = 200,
  customOrigin = origin,
) {
  const response = await fetch(origin + "/api/" + path, {
    method,
    headers: {
      Origin: customOrigin,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const value = await response.json();
  assert.equal(response.status, expected, JSON.stringify(value));
  if (response.headers.get("set-cookie"))
    cookie = response.headers.get("set-cookie").split(";")[0];
  return value;
}
const ok = (s) => {
  checks.push(s);
  console.log("PASS", s);
};
await request("health");
ok("D1 and R2 bindings available");
await request(
  "play/golden-god",
  "POST",
  { stake: 10, requestKey: crypto.randomUUID() },
  401,
);
ok("anonymous play rejected");
await request("auth/login", "POST", {}, 403, "https://evil.example");
ok("cross-origin writes rejected");
const suffix = Date.now().toString(36),
  password = crypto.randomUUID() + "-Password",
  username = "qa_" + suffix;
await request(
  "auth/register",
  "POST",
  { username, email: username + "@example.test", password, agreement: true },
  201,
);
let me = (await request("auth/me")).user;
assert.equal(me.balance, 10000);
ok("registration creates secure session and initial ledger");
const catalog = await request("games");
assert.equal(catalog.games.length, 30);
await request("favorites/golden-god", "POST", {});
assert.equal((await request("favorites")).games.length, 1);
await request("favorites/golden-god", "DELETE", {});
assert.equal((await request("favorites")).games.length, 0);
ok("catalog and favorites persist");
let expected = 10000;
for (const id of ["golden-god", "dragon-world", "phoenix-legend"]) {
  const key = crypto.randomUUID(),
    body = { stake: 10, requestKey: key };
  const first = await request("play/" + id, "POST", body);
  expected += first.round.reward - 10;
  assert.equal(first.user.balance, expected);
  const second = await request("play/" + id, "POST", body);
  assert.equal(second.replayed, true);
  assert.deepEqual(second.round, first.round);
  assert.equal(second.user.balance, expected);
}
ok("all three independent games settle and retry idempotently");
await request(
  "play/divine-dragon",
  "POST",
  { stake: 10, requestKey: crypto.randomUUID() },
  409,
);
await request(
  "play/golden-god",
  "POST",
  { stake: -10, requestKey: crypto.randomUUID() },
  400,
);
ok("planned games and invalid stakes rejected");
const profile = await request("profile");
assert.equal(profile.records.length, 3);
assert.equal(profile.points.length, 4);
ok("round history and initial/game ledgers match");
await request("admin/statistics", "GET", undefined, 403);
ok("normal member cannot access admin");
execFileSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "execute",
    "aurum-db",
    "--local",
    "--command",
    `INSERT INTO admin_users(user_id,role) VALUES('${me.id}','owner')`,
  ],
  {
    stdio: "pipe",
    env: {
      ...process.env,
      XDG_CONFIG_HOME: "/workspace/work/config",
      WRANGLER_SEND_METRICS: "false",
    },
  },
);
const stat = await request("admin/statistics");
assert.ok(stat.users.total >= 1);
const announcement = await request("admin/announcements", "POST", {
  title: "QA announcement",
  content: "persisted",
  status: "draft",
});
await request("admin/announcements/" + announcement.id, "PATCH", {
  content: "updated",
});
await request("admin/announcements/" + announcement.id, "DELETE");
ok("admin statistics and audited content CRUD");
await request("admin/users/" + me.id, "PATCH", {
  delta: 50,
  reason: "local QA",
});
assert.equal((await request("auth/me")).user.balance, expected + 50);
const records = await request("admin/users/" + me.id);
assert.equal(records.records.length, 3);
ok("admin points adjustment and member records");
const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=",
    "base64",
  ),
  form = new FormData();
form.append("files", new Blob([image], { type: "image/png" }), "qa.png");
await request("admin/assets/home-banner", "DELETE", undefined, 409);
ok("referenced site artwork cannot be deleted");
const upload = await fetch(origin + "/api/admin/assets", {
  method: "POST",
  headers: { Origin: origin, Cookie: cookie },
  body: form,
});
const asset = await upload.json();
assert.equal(upload.status, 201, JSON.stringify(asset));
const downloaded = await fetch(origin + "/api/assets/" + asset.ids[0]);
assert.equal(downloaded.status, 200);
assert.equal((await downloaded.arrayBuffer()).byteLength, image.length);
await request("admin/assets/" + asset.ids[0], "DELETE");
ok("R2 image upload, retrieval and deletion");
// Exercise each remaining database-backed admin CRUD module with temporary rows.
for (const [module, data, change, key] of [
  [
    "categories",
    {
      id: "qa-cat-" + suffix,
      name: "QA 神话主题",
      slug: "qa-cat-" + suffix,
      sort: 99,
    },
    { name: "QA updated" },
    "id",
  ],
  [
    "events",
    { title: "QA event", content: "temporary", status: "draft" },
    { content: "updated" },
    "id",
  ],
  [
    "messages",
    { user_id: me.id, title: "QA message", content: "temporary" },
    { content: "updated" },
    "id",
  ],
  [
    "settings",
    { key: "qa_setting_" + suffix, value: "initial" },
    { value: "updated" },
    "key",
  ],
  [
    "games",
    {
      id: "qa-game-" + suffix,
      name: "QA original",
      slug: "qa-game-" + suffix,
      description: "Temporary catalog entry",
      category_id: "slots",
      status: "planned",
      version: "0.0.1",
      program_path: "/games/qa",
      config: "{}",
      rules: "Unconfirmed",
    },
    { description: "updated" },
    "id",
  ],
  [
    "integrations",
    {
      game_id: "golden-god",
      version: "qa-" + suffix,
      status: "draft",
      program_path: "/games/golden-god",
      rules: "QA temporary",
    },
    { pending_rules: "QA review" },
    "id",
  ],
]) {
  const added = await request("admin/" + module, "POST", data);
  const rowId = data[key] ?? added.id;
  await request("admin/" + module + "/" + rowId, "PATCH", change);
  const list = await request("admin/" + module);
  assert.ok(list.items.some((row) => row[key] === rowId));
  await request("admin/" + module + "/" + rowId, "DELETE");
  ok(module + " create, edit, list and delete persist");
}
const ownerCookie = cookie,
  secondary = "qa2_" + suffix;
await request(
  "auth/register",
  "POST",
  {
    username: secondary,
    email: secondary + "@example.test",
    password,
    agreement: true,
  },
  201,
);
const secondaryUser = (await request("auth/me")).user,
  secondaryCookie = cookie;
cookie = ownerCookie;
await request("admin/admins", "POST", {
  user_id: secondaryUser.id,
  role: "support",
});
cookie = secondaryCookie;
await request("admin/settings", "GET", undefined, 403);
await request("admin/games/golden-god", "PATCH", { name: "unauthorized" }, 403);
cookie = ownerCookie;
await request("admin/admins/" + secondaryUser.id, "PATCH", { role: "editor" });
cookie = secondaryCookie;
await request("admin/users/" + me.id, "PATCH", { status: "blocked" }, 403);
cookie = ownerCookie;
await request("admin/admins/" + secondaryUser.id, "DELETE");
ok("administrator CRUD and owner/editor/support boundaries");
await request("admin/users/" + secondaryUser.id, "PATCH", {
  status: "blocked",
});
cookie = secondaryCookie;
assert.equal((await request("auth/me")).user, null);
cookie = ownerCookie;
await request("admin/users/" + secondaryUser.id, "PATCH", { status: "active" });
ok("member block and unblock invalidate sessions");
await request("profile/security", "POST", {
  oldPassword: password,
  password: password + "new",
});
assert.equal((await request("auth/me")).user, null);
await request("auth/login", "POST", {
  identity: username,
  password: password + "new",
});
assert.equal((await request("auth/me")).user.id, me.id);
await request("auth/logout", "POST", {});
assert.equal((await request("auth/me")).user, null);
ok("password rotation invalidates sessions; login and logout work");
console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));

const bundled = await fetch(origin + "/api/assets/cover-golden-god", {
  redirect: "manual",
});
assert.ok([200, 302].includes(bundled.status));
if (bundled.status === 302)
  assert.equal(bundled.headers.get("location"), "/assets/golden-god-cover.png");
else assert.equal(bundled.headers.get("content-type"), "image/png");
console.log("PASS bundled/R2 artwork retrieval");
const head = await fetch(origin + "/api/assets/cover-golden-god", {
  method: "HEAD",
  redirect: "manual",
});
assert.equal(head.status, bundled.status);
console.log("PASS asset HEAD response");
console.log(
  "API integration complete: " +
    (checks.length + 2) +
    " checks passed; real-domain www redirect remains a production check.",
);
