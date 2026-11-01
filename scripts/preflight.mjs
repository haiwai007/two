import { unstable_readConfig as readConfig } from "wrangler";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
const configPath = process.argv[2] ?? "wrangler.jsonc",
  config = readConfig({ config: configPath }),
  blockers = [];
if (
  !config.d1_databases?.some(
    (b) => b.binding === "DB" && /^[a-f0-9-]{36}$/.test(b.database_id ?? ""),
  )
)
  blockers.push("DB binding requires a real D1 database_id");
if (!config.r2_buckets?.some((b) => b.binding === "BUCKET" && b.bucket_name))
  blockers.push("BUCKET R2 binding missing");
if (config.vars?.REQUIRE_TURNSTILE !== "true")
  blockers.push("Production Turnstile must be enabled");
if (!config.vars?.TURNSTILE_SITE_KEY)
  blockers.push("Turnstile site key missing");
if (!process.env.CLOUDFLARE_ACCOUNT_ID)
  blockers.push("Select the target CLOUDFLARE_ACCOUNT_ID");
const auth = spawnSync(
  process.execPath,
  ["node_modules/wrangler/bin/wrangler.js", "whoami"],
  { encoding: "utf8", env: process.env },
);
if (
  auth.status !== 0 ||
  /not authenticated|not logged in/i.test(auth.stdout + auth.stderr)
)
  blockers.push("Wrangler is not authenticated");
let suppliedSecret = false;
if (process.env.CLOUDFLARE_SECRETS_FILE) {
  try {
    suppliedSecret = Boolean(JSON.parse(readFileSync(process.env.CLOUDFLARE_SECRETS_FILE, "utf8")).TURNSTILE_SECRET_KEY);
  } catch { blockers.push("Deployment secrets JSON is missing or invalid"); }
}
if (!suppliedSecret && !blockers.includes("Wrangler is not authenticated") && process.env.CLOUDFLARE_ACCOUNT_ID) {
  const secrets = spawnSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "secret", "list", "--config", configPath], { encoding: "utf8", env: process.env });
  try {
    const names = JSON.parse(secrets.stdout);
    if (secrets.status !== 0 || !Array.isArray(names) || !names.some(item => item.name === "TURNSTILE_SECRET_KEY")) blockers.push("Worker TURNSTILE_SECRET_KEY secret missing or unreadable");
  } catch { blockers.push("Unable to verify Worker secret names"); }
}
console.log(
  JSON.stringify(
    {
      ready: blockers.length === 0,
      config: configPath,
      blockers,
      notice: "No secrets printed; no resource was created or deployed",
    },
    null,
    2,
  ),
);
process.exitCode = blockers.length ? 1 : 0;
