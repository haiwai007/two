import { spawnSync } from "node:child_process";
const [scope, userId] = process.argv.slice(2);
if (
  !["--local", "--remote"].includes(scope) ||
  !/^[a-f0-9-]{36}$/.test(userId ?? "")
)
  throw new Error(
    "Usage: node scripts/bootstrap-admin.mjs --local|--remote EXISTING_USER_UUID",
  );
const sql = `INSERT INTO admin_users(user_id,role) VALUES('${userId}','owner');`;
const result = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "execute",
    "aurum-db",
    scope,
    "--command",
    sql,
  ],
  { stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
