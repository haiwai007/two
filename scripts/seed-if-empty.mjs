import { spawnSync } from "node:child_process";
import { unstable_readConfig as readConfig } from "wrangler";
const scope = process.argv[2],
  configPath = process.argv[3] ?? "wrangler.jsonc";
if (!["--local", "--remote"].includes(scope))
  throw Error("Choose --local or --remote explicitly");
const cfg = readConfig({ config: configPath }),
  name = cfg.d1_databases.find((b) => b.binding === "DB").database_name;
function run(args, json = false) {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      name,
      scope,
      "--config",
      configPath,
      ...args,
    ],
    { encoding: "utf8", env: process.env },
  );
  if (result.status !== 0)
    throw Error("D1 operation failed; inspect Wrangler logs");
  if (!json) {
    console.log("D1 operation completed");
    return;
  }
  const text = result.stdout;
  const start = text.indexOf("[");
  return JSON.parse(text.slice(start));
}
const state = run(
  ["--command", "SELECT COUNT(*) AS total FROM games", "--json"],
  true,
);
if (state[0].results[0].total === 0) {
  run(["--file", "seed.sql"]);
  console.log("Seeded a fresh catalog");
} else console.log("Existing catalog preserved; no initial seed replayed");
run(["--file", "scripts/catalog-v02.sql"]);
