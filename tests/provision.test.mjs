import test from "node:test";
import assert from "node:assert/strict";
import { provision } from "../scripts/provision-cloudflare.mjs";
const accountId = "a".repeat(32), databaseId = "12345678-1234-1234-1234-123456789abc";
const config = {
  name: "aurum-original-games",
  routes: [{ pattern: "h6688.win" }, { pattern: "www.h6688.win" }],
  d1_databases: [{ binding: "DB", database_name: "aurum-db", database_id: "REPLACE_WITH_CREATED_D1_ID" }],
  r2_buckets: [{ binding: "BUCKET", bucket_name: "aurum-assets" }],
  vars: { TURNSTILE_SITE_KEY: "" },
};
function fixture({ existing = false, zone = true, mismatch = false, duplicate = false, domains = ["h6688.win"] } = {}) {
  const writes = [];
  const widget = { name: "aurum-original-games production", sitekey: "public-test-key", secret: "fake-test-secret", domains };
  const api = async (path, options = {}) => {
    if (options.method === "POST") {
      writes.push(path);
      if (path.endsWith("/d1/database")) return { result: { uuid: databaseId } };
      if (path.endsWith("/r2/buckets")) return { result: { name: "aurum-assets" } };
      if (path.endsWith("/challenges/widgets")) return { result: widget };
      throw Error("unexpected write");
    }
    if (path.startsWith("/zones?")) return { result: zone ? [{ name: "h6688.win", status: "active" }] : [] };
    if (path.includes("/d1/database?")) return { result: existing ? [{ name: "aurum-db", uuid: mismatch ? "87654321-1234-1234-1234-123456789abc" : databaseId }] : [] };
    if (path.includes("/r2/buckets?")) return { result: { buckets: existing ? [{ name: "aurum-assets" }] : [] } };
    if (path.includes("/challenges/widgets?")) return { result: duplicate ? [widget, widget] : existing ? [widget] : [] };
    if (path.endsWith("/challenges/widgets/public-test-key")) return { result: widget };
    throw Error("unexpected request: " + path);
  };
  return { api, writes };
}
test("first deployment provisions three resources and returns secret separately", async () => {
  const { api, writes } = fixture();
  const result = await provision({ config, accountId, api });
  assert.equal(result.databaseId, databaseId);
  assert.equal(result.secret, "fake-test-secret");
  assert.equal(writes.length, 3);
});
test("retry reuses existing resources without creating duplicates or rotating secrets", async () => {
  const { api, writes } = fixture({ existing: true });
  assert.equal((await provision({ config, accountId, api })).siteKey, "public-test-key");
  assert.equal(writes.length, 0);
});
test("unavailable domain fails before any writes", async () => {
  const { api, writes } = fixture({ zone: false });
  await assert.rejects(provision({ config, accountId, api }), /active zone/);
  assert.equal(writes.length, 0);
});
test("explicit database binding cannot silently switch to another database", async () => {
  const { api, writes } = fixture({ existing: true, mismatch: true });
  await assert.rejects(provision({ config: { ...config, d1_databases: [{ ...config.d1_databases[0], database_id: databaseId }] }, accountId, api }), /refusing to switch/);
  assert.equal(writes.length, 0);
});
test("ambiguous widget names and wrong allowed domains are rejected", async () => {
  await assert.rejects(provision({ config, accountId, api: fixture({ existing: true, duplicate: true }).api }), /Multiple matching/);
  await assert.rejects(provision({ config, accountId, api: fixture({ existing: true, domains: ["other.example"] }).api }), /does not allow/);
});
