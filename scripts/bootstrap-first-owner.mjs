import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function bootstrapFirstOwner({ userId, expiresAt, query, now = Date.now() }) {
  if (!userId) return { firstOwner: "not-configured-no-changes" };
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId)) throw Error("Invalid first-owner account identifier");
  if (!Number.isFinite(Date.parse(expiresAt))) throw Error("Invalid first-owner initialization window");
  if (now >= Date.parse(expiresAt)) return { firstOwner: "expired-no-changes" };
  const owners = (await query("SELECT user_id FROM admin_users WHERE role='owner' LIMIT 100")).rows;
  if (owners.length && !owners.some(owner => owner.user_id === userId)) throw Error("A different owner already exists; no permissions changed");
  const target = await query("SELECT id,status FROM users WHERE id=? LIMIT 1", [userId]);
  if (target.rows[0]?.status !== "active") throw Error("The requested active account was not found; no permissions changed");
  const inserted = await query(`INSERT INTO admin_users(user_id,role)
    SELECT id,'owner' FROM users WHERE id=? AND status='active'
    AND NOT EXISTS(SELECT 1 FROM admin_users WHERE role='owner')
    AND NOT EXISTS(SELECT 1 FROM admin_users WHERE user_id=?)`, [userId, userId]);
  const ready = await query("SELECT a.role FROM admin_users a JOIN users u ON u.id=a.user_id WHERE a.user_id=? AND u.status='active'", [userId]);
  if (ready.rows[0]?.role !== "owner") throw Error("Owner initialization was not applied; existing roles are preserved");
  const auditId = "first-owner-bootstrap";
  await query(`INSERT OR IGNORE INTO audit_logs(id,actor_id,action,target,detail)
    VALUES(?,?,'admin.bootstrap',?,'{"method":"cloudflare-build","mode":"first-owner-only"}')`, [auditId, userId, userId]);
  const audit = await query("SELECT id FROM audit_logs WHERE id=? AND action='admin.bootstrap' AND target=?", [auditId, userId]);
  if (!audit.rows.length) throw Error("Owner exists but bootstrap audit could not be confirmed");
  return { firstOwner: inserted.changes ? "created" : "confirmed", auditConfirmed: true };
}

async function main() {
  if (process.argv[2] !== "--remote") throw Error("Choose --remote explicitly");
  const { expiresAt } = JSON.parse(readFileSync("scripts/first-owner-window.json", "utf8"));
  const userId = process.env.AURUM_FIRST_OWNER_ID;
  if (!userId || Date.now() >= Date.parse(expiresAt)) {
    console.log(JSON.stringify(await bootstrapFirstOwner({ userId, expiresAt, query: async () => { throw Error("Unexpected database access"); } })));
    return;
  }
  const { unstable_readConfig: readConfig } = await import("wrangler");
  const config = readConfig({ config: "wrangler.jsonc" });
  const dbId = config.d1_databases.find(binding => binding.binding === "DB")?.database_id;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!/^[a-f0-9]{32}$/i.test(accountId ?? "") || !/^[a-f0-9-]{36}$/i.test(dbId ?? "") || !process.env.CLOUDFLARE_API_TOKEN) throw Error("Authenticated production DB binding required");
  const query = async (sql, params = []) => {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`, {
      method: "POST", headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }), signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    if (!response.ok || data.success !== true || !Array.isArray(data.result) || data.result.some(result => result.success === false)) throw Error(`First-owner D1 operation failed (HTTP ${response.status}); no response body or credentials logged`);
    return { rows: data.result.flatMap(result => result.results ?? []), changes: data.result.reduce((sum, result) => sum + (result.meta?.changes ?? 0), 0) };
  };
  console.log(JSON.stringify(await bootstrapFirstOwner({ userId, expiresAt, query })));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
