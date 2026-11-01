import { readFileSync, existsSync, writeFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { unstable_readConfig as readConfig } from "wrangler";
import { resolve } from "node:path";
// Run from project root. Only this explicit flag sends files to production R2/D1.
const scope = process.argv[2];
if (!["--local", "--remote"].includes(scope))
  throw new Error("Usage: node scripts/import-assets.mjs --local|--remote");
const configPath = process.argv.includes("--config")
  ? process.argv[process.argv.indexOf("--config") + 1]
  : "wrangler.jsonc";
const config = readConfig({ config: configPath });
const bucket = config.r2_buckets.find(
    (b) => b.binding === "BUCKET",
  ).bucket_name,
  dbName = config.d1_databases.find((b) => b.binding === "DB").database_name;
const root = process.cwd(),
  manifest = JSON.parse(readFileSync("docs/assets-manifest.json", "utf8"));
function wrangler(args) {
  const p = spawnSync(
    process.execPath,
    ["node_modules/wrangler/bin/wrangler.js", ...args, "--config", configPath],
    { stdio: "inherit", env: process.env },
  );
  if (p.status !== 0)
    throw new Error(
      "Wrangler failed; import stopped, previous keys remain intact",
    );
}
const updates = [];
for (const asset of manifest.assets) {
  if (asset.status !== "generated") continue;
  const file = resolve(root, asset.path);
  if (
    !file.startsWith(resolve(root, "public/assets") + "/") ||
    !existsSync(file)
  )
    throw new Error("Missing or invalid source: " + asset.path);
  const digest = createHash("sha256")
    .update(readFileSync(file))
    .digest("hex")
    .slice(0, 16);
  const key = "original/" + digest + "/" + asset.filename;
  wrangler([
    "r2",
    "object",
    "put",
    bucket + "/" + key,
    scope,
    "--file",
    file,
    "--content-type",
    "image/png",
  ]);
  const id = asset.assetId.replaceAll("'", "''");
  updates.push(
    `UPDATE game_assets SET storage_key='${key}',media_type='image/png',size=${statSync(file).size} WHERE id='${id}';`,
  );
}
const output = resolve(root, "scripts/imported-assets.sql");
writeFileSync(output, updates.join("\n") + "\n");
if (updates.length)
  wrangler(["d1", "execute", dbName, scope, "--file", output]);
console.log(
  "Asset import finished. Database now references versioned R2 keys.",
);
