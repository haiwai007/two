import test from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstile } from "../server/turnstile.ts";
const env = { REQUIRE_TURNSTILE: "true", TURNSTILE_SECRET_KEY: "fake-unit-secret" };
const quiet = { log: () => {} };
const provider = (body: unknown, status = 200) => (async () => Response.json(body, { status })) as typeof fetch;
test("empty, whitespace and oversized tokens never call the provider", async () => {
  for (const token of [undefined, "", "  ", "x".repeat(2049)]) {
    await assert.rejects(verifyTurnstile(env, token, "local", { ...quiet, fetchImpl: async () => { assert.fail("provider should not be called"); } }), { status: 400 });
  }
});
test("missing and rejected secrets are configuration errors, never accepted", async () => {
  await assert.rejects(verifyTurnstile({ REQUIRE_TURNSTILE: "true" }, "unit-token", "local", quiet), { status: 503 });
  await assert.rejects(verifyTurnstile(env, "unit-token", "local", { ...quiet, fetchImpl: provider({ success: false, "error-codes": ["invalid-input-secret"] }) }), { status: 503 });
});
test("expired or reused tokens receive a useful failure and are never retried automatically", async () => {
  let calls = 0;
  await assert.rejects(verifyTurnstile(env, "unit-token", "local", { ...quiet, fetchImpl: (async () => { calls++; return Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] }); }) as typeof fetch }), /已过期或已使用/);
  assert.equal(calls, 1);
});
test("a valid result must belong to the current hostname", async () => {
  await verifyTurnstile(env, "unit-token", "203.0.113.1", { ...quiet, hostname: "h6688.win", fetchImpl: provider({ success: true, hostname: "h6688.win" }) });
  await assert.rejects(verifyTurnstile(env, "unit-token", "local", { ...quiet, hostname: "h6688.win", fetchImpl: provider({ success: true, hostname: "other.example" }) }), { status: 403 });
});
test("local sentinel IP is omitted rather than sent as a malformed remoteip", async () => {
  await verifyTurnstile(env, "unit-token", "local", { ...quiet, fetchImpl: (async (_url, init) => {
    const data = init!.body as URLSearchParams;
    assert.equal(data.has("remoteip"), false);
    assert.equal(data.get("response"), "unit-token");
    return Response.json({ success: true });
  }) as typeof fetch });
});
test("network failures and malformed provider responses fail closed", async () => {
  await assert.rejects(verifyTurnstile(env, "unit-token", "local", { ...quiet, fetchImpl: async () => { throw Error("offline"); } }), { status: 503 });
  await assert.rejects(verifyTurnstile(env, "unit-token", "local", { ...quiet, fetchImpl: provider({}, 503) }), { status: 503 });
  await assert.rejects(verifyTurnstile(env, "unit-token", "local", { ...quiet, fetchImpl: async () => new Response("not json") }), { status: 503 });
});
test("diagnostics never contain secrets, tokens or arbitrary provider strings", async () => {
  const logs: unknown[] = [];
  await assert.rejects(verifyTurnstile(env, "private-unit-token", "local", { log: detail => logs.push(detail), fetchImpl: provider({ success: false, "error-codes": ["private-unit-token", "invalid-input-response"] }) }));
  const output = JSON.stringify(logs);
  assert.ok(!output.includes("fake-unit-secret"));
  assert.ok(!output.includes("private-unit-token"));
  assert.match(output, /invalid-input-response/);
});
