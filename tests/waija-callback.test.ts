import test from "node:test";
import assert from "node:assert/strict";
import { callbackNotReady, callbackHead } from "../server/waija-callback.ts";
test("onboarding returns Waija's processing error with HTTP 200 and never reports a wallet success", async () => {
  for (const action of ["balance", "debit", "credit", "rollback", "unknown"]) {
    // The endpoint deliberately has no request parsing, authentication bypass or wallet dependency.
    const response = callbackNotReady(new Request("https://h6688.win/api/waija/callback?"+new URLSearchParams({action,username:"onboarding-test",amount:"100",timestamp:String(Math.floor(Date.now()/1000)),key:"invalid",call_id:crypto.randomUUID()})));
    assert.equal(response.status, 200, action);
    assert.deepEqual(await response.json(), { error: 2, balance: 0 });
    assert.match(response.headers.get("Content-Type")!, /application\/json/);
    assert.match(response.headers.get("Cache-Control")!, /no-store/);
    assert.equal(response.headers.get("Cloudflare-CDN-Cache-Control"), "no-store");
    assert.equal(response.headers.get("Set-Cookie"), null);
  }
});
test("HEAD probes preserve status and cache protection without a response body", async () => {
  const response = callbackHead();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
  assert.match(response.headers.get("Cache-Control")!, /no-store/);
});
