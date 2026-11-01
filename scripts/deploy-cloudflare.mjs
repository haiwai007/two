import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const wrangler = (...args) => [process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...args]];
export const deploymentSteps = [
  ["Provisioning logic checks", process.execPath, ["tests/provision.test.mjs"]],
  ["Production smoke logic checks", process.execPath, ["tests/production-smoke.test.mjs"]],
  ["Game rule checks", "npm", ["test"]],
  ["Database integrity checks", "python3", ["tests/database_test.py"]],
  ["Create or reuse production resources", process.execPath, ["scripts/provision-cloudflare.mjs", "--remote"]],
  ["Production preflight", process.execPath, ["scripts/preflight.mjs", "wrangler.jsonc"]],
  ["Apply D1 migrations", ...wrangler("d1", "migrations", "apply", "aurum-db", "--remote")],
  ["Initialize empty catalog or upgrade existing catalog", process.execPath, ["scripts/seed-if-empty.mjs", "--remote", "wrangler.jsonc"]],
  ["Import original media", process.execPath, ["scripts/import-assets.mjs", "--remote"]],
  ["Apply optimized media metadata", ...wrangler("d1", "execute", "aurum-db", "--remote", "--file", "scripts/optimized-assets.sql")],
  ["Import delivery media", process.execPath, ["scripts/import-assets.mjs", "--remote", "--optimized"]],
  ["Deploy website with Turnstile secret", ...wrangler("deploy", "--secrets-file", ".test-state/deploy-secrets.json")],
  ["Read-only HTTPS smoke checks", process.execPath, ["scripts/smoke-production.mjs"]],
];

export function deploymentEnvironment(source) {
  if (source.WORKERS_CI_BRANCH && source.WORKERS_CI_BRANCH !== "main") throw Error("Production deployment is restricted to main");
  const env = {
    ...source,
    CLOUDFLARE_API_TOKEN: source.AURUM_CF_API_TOKEN || source.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_ACCOUNT_ID: source.AURUM_CF_ACCOUNT_ID || source.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_SECRETS_FILE: ".test-state/deploy-secrets.json",
    WRANGLER_SEND_METRICS: "false",
  };
  if (!env.CLOUDFLARE_API_TOKEN || !/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID ?? "")) throw Error("Configure the build-only AURUM_CF_API_TOKEN and AURUM_CF_ACCOUNT_ID credentials");
  return env;
}

export async function executeDeployment({ run, cleanup, report = () => {} }) {
  let websiteUploaded = false;
  try {
    for (const [label, command, args] of deploymentSteps) {
      report(label);
      const result = await run(command, args);
      if (result.status !== 0) throw Error(websiteUploaded ? `Worker upload completed, but production acceptance failed at: ${label}. The deployed version has not been rolled back; inspect the error above.` : `Deployment stopped: ${label}`);
      if (label === "Deploy website with Turnstile secret") {
        websiteUploaded = true;
        report("Worker upload completed; custom-domain HTTPS acceptance is still pending");
      }
    }
  } finally {
    await cleanup();
  }
}

async function main() {
  if (process.argv[2] === "--plan") {
    console.log(JSON.stringify({ provider: "Cloudflare Workers Builds or an authenticated CLI", worker: "aurum-original-games", buildCommand: "npm run cf:build", deployCommand: "npm run deploy:cloudflare", steps: deploymentSteps.map(([label]) => label), maintenanceWorker: "Connect a separate Worker build; the website build must retain its worker identity guards", remoteRequests: false }, null, 2));
    return;
  }
  if (process.argv[2] !== "--remote") throw Error("Choose --remote explicitly, or use --plan for a read-only plan");
  const env = deploymentEnvironment(process.env);
  await executeDeployment({
    report: label => console.log(`Deployment step: ${label}`),
    run: (command, args) => spawnSync(command, args, { env, stdio: "inherit", timeout: 15 * 60 * 1000 }),
    cleanup: () => rmSync(".test-state/deploy-secrets.json", { force: true }),
  });
  console.log("Website deployment and read-only checks passed. Membership, real Turnstile completion, admin and physical-device acceptance remain separate checks.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
