import test from "node:test";
import assert from "node:assert/strict";
import { executeDeployment, deploymentEnvironment, deploymentSteps } from "../scripts/deploy-cloudflare.mjs";

test("build credentials stay in child environment and worker identity guards are preserved", () => {
  const env = deploymentEnvironment({ AURUM_CF_API_TOKEN: "fake-build-token", AURUM_CF_ACCOUNT_ID: "a".repeat(32), WRANGLER_CI_MATCH_TAG: "connected-worker-tag", WORKERS_CI_BRANCH: "main" });
  assert.equal(env.CLOUDFLARE_API_TOKEN, "fake-build-token");
  assert.equal(env.WRANGLER_CI_MATCH_TAG, "connected-worker-tag");
  assert.ok(!JSON.stringify(deploymentSteps).includes("fake-build-token"));
});
test("missing credentials and non-production branches cannot run resource mutations", () => {
  assert.throws(() => deploymentEnvironment({}), /Configure/);
  assert.throws(() => deploymentEnvironment({ WORKERS_CI_BRANCH: "preview" }), /restricted to main/);
});
test("failed checks stop before provisioning and always remove temporary secrets", async () => {
  const commands = [];
  let cleaned = false;
  await assert.rejects(executeDeployment({
    run: async (command, args) => { commands.push(args); return { status: command === "npm" && args[0] === "test" ? 1 : 0 }; },
    cleanup: () => { cleaned = true; },
  }), /Game rule checks/);
  assert.equal(commands.length, 3);
  assert.equal(cleaned, true);
});
test("successful workflow applies migrations before seed, deploys with secrets file and cleans up", async () => {
  const labels = [];
  let cleaned = false;
  await executeDeployment({ report: label => labels.push(label), run: async () => ({ status: 0 }), cleanup: () => { cleaned = true; } });
  assert.ok(labels.indexOf("Apply D1 migrations") < labels.indexOf("Initialize empty catalog or upgrade existing catalog"));
  assert.ok(deploymentSteps.find(([label]) => label === "Deploy website with Turnstile secret")[2].includes("--secrets-file"));
  assert.equal(cleaned, true);
});

test("post-upload acceptance failure is distinguished from a failed Worker upload", async () => {
  let cleaned = false;
  await assert.rejects(executeDeployment({
    run: async (_command, args) => ({ status: args.includes("scripts/smoke-production.mjs") ? 1 : 0 }),
    cleanup: () => { cleaned = true; },
  }), /Worker upload completed, but production acceptance failed/);
  assert.equal(cleaned, true);
});
