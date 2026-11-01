import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function provision({ config, accountId, api }) {
  if (!/^[a-f0-9]{32}$/i.test(accountId ?? "")) throw Error("A valid CLOUDFLARE_ACCOUNT_ID is required");
  const base = `/accounts/${accountId}`;
  const domains = config.routes.map(r => r.pattern);
  if (domains.some(d => !/^[a-z0-9.-]+$/.test(d))) throw Error("Only explicit custom domains are supported");
  const zone = await api(`/zones?name=${encodeURIComponent(domains[0])}&account.id=${accountId}`);
  if (!zone.result.some(z => z.name === domains[0] && z.status === "active")) throw Error("The target domain must be an active zone in this account");
  async function list(path) {
    const items = [];
    for (let page = 1; page <= 100; page++) {
      const data = await api(`${base}${path}?per_page=50&page=${page}`);
      items.push(...data.result);
      if (page >= (data.result_info?.total_pages ?? 1)) return items;
    }
    throw Error("Resource pagination exceeded safe limit");
  }
  const db = config.d1_databases.find(b => b.binding === "DB");
  const existing = (await list("/d1/database")).find(d => d.name === db.database_name);
  const database = existing ?? (await api(`${base}/d1/database`, { method: "POST", body: { name: db.database_name } })).result;
  if (!/^[a-f0-9-]{36}$/i.test(database.uuid ?? "")) throw Error("D1 did not return a valid database UUID");
  if (db.database_id !== "REPLACE_WITH_CREATED_D1_ID" && db.database_id !== database.uuid) throw Error("Existing DB binding differs from account resource; refusing to switch databases");
  const bucketName = config.r2_buckets.find(b => b.binding === "BUCKET").bucket_name;
  let cursor = "", foundBucket = false;
  for (let page = 0; page < 100; page++) {
    const data = await api(`${base}/r2/buckets?per_page=100&name_contains=${encodeURIComponent(bucketName)}${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`);
    foundBucket = data.result.buckets.some(b => b.name === bucketName);
    cursor = data.result.cursor ?? "";
    if (foundBucket || !cursor) break;
    if (page === 99) throw Error("R2 pagination exceeded safe limit");
  }
  if (!foundBucket) await api(`${base}/r2/buckets`, { method: "POST", body: { name: bucketName } });
  const widgets = await list("/challenges/widgets");
  const widgetName = `${config.name} production`;
  let widget;
  if (config.vars.TURNSTILE_SITE_KEY) {
    widget = (await api(`${base}/challenges/widgets/${encodeURIComponent(config.vars.TURNSTILE_SITE_KEY)}`)).result;
  } else {
    const matches = widgets.filter(w => w.name === widgetName);
    if (matches.length > 1) throw Error("Multiple matching Turnstile widgets; configure the intended site key explicitly");
    widget = matches.length
      ? (await api(`${base}/challenges/widgets/${encodeURIComponent(matches[0].sitekey)}`)).result
      : (await api(`${base}/challenges/widgets`, { method: "POST", body: { name: widgetName, domains, mode: "managed" } })).result;
  }
  if (!widget.secret || !widget.sitekey) throw Error("Turnstile did not return both public and secret keys");
  if (domains.some(d => !widget.domains.some(allowed => d === allowed || d.endsWith("." + allowed)))) throw Error("Turnstile widget does not allow the production domains");
  return { databaseId: database.uuid, siteKey: widget.sitekey, secret: widget.secret, bucketName };
}

async function main() {
  if (process.argv[2] !== "--remote") throw Error("Choose --remote explicitly to provision Cloudflare resources");
  if (!process.env.CLOUDFLARE_API_TOKEN) throw Error("CLOUDFLARE_API_TOKEN is missing");
  const { unstable_readConfig: readConfig } = await import("wrangler");
  const config = readConfig({ config: "wrangler.jsonc" });
  const api = async (path, { method = "GET", body } = {}) => {
    const response = await fetch("https://api.cloudflare.com/client/v4" + path, {
      method,
      headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      // Never log response bodies: widget responses can include secrets.
      throw Error(`Cloudflare ${method} ${path.split("?")[0]} failed (HTTP ${response.status}; codes ${(data.errors ?? []).map(e => e.code).join(",")})`);
    }
    return data;
  };
  const result = await provision({ config, accountId: process.env.CLOUDFLARE_ACCOUNT_ID, api });
  if (process.env.GITHUB_ACTIONS === "true") console.log(`::add-mask::${result.secret}`);
  for (const file of ["wrangler.jsonc", "wrangler.maintenance.jsonc"]) {
    let text = readFileSync(file, "utf8").replace(/"database_id":\s*"[^"]*"/, `"database_id": "${result.databaseId}"`);
    if (file === "wrangler.jsonc") text = text.replace(/"TURNSTILE_SITE_KEY":\s*"[^"]*"/, `"TURNSTILE_SITE_KEY": ${JSON.stringify(result.siteKey)}`);
    writeFileSync(file, text);
  }
  mkdirSync(".test-state", { recursive: true });
  const file = resolve(".test-state/deploy-secrets.json");
  writeFileSync(file, JSON.stringify({ TURNSTILE_SECRET_KEY: result.secret, ...(process.env.AURUM_TRONGRID_API_KEY ? { TRONGRID_API_KEY: process.env.AURUM_TRONGRID_API_KEY } : {}) }), { mode: 0o600 });
  chmodSync(file, 0o600);
  console.log(JSON.stringify({ provisioned: true, databaseId: result.databaseId, bucket: result.bucketName, turnstileConfigured: true, secretFile: ".test-state/deploy-secrets.json" }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
