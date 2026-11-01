import { paymentOrderAction } from "./payment-orders";
import type { Env } from "../types/env";
import type { Repository } from "./db";
import type { User } from "./security";
import { defaultRecharge, readRecharge, RECHARGE_KEY, validTronAddress } from "../lib/recharge";
function error(message: string, status = 400): never { throw Object.assign(Error(message), { status }); }
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const clean = (value: unknown, max: number) => typeof value === "string" && value.length <= max ? value.trim() : "";
export async function rechargeApi(req: Request, repo: Repository, user: User | null, admin: boolean, readBody: () => Promise<Record<string, unknown>>, env: Env) {
  if (!user) error("请先登录", 401);
  if (admin && user.role !== "owner") error("收款配置仅限所有者", 403);
  const parts = new URL(req.url).pathname.split("/").filter(Boolean), extra = parts[admin ? 3 : 2];

  const row = await repo.one<{value:string}>("SELECT value FROM system_settings WHERE key=?", RECHARGE_KEY);
  const settings = readRecharge(row?.value);
  if (req.method === "GET") {
    await repo.run("UPDATE recharge_orders SET status='expired' WHERE status='pending' AND expires_ms<? AND (?=1 OR user_id=?)",Date.now(),admin?1:0,user.id);
    const ready = settings.enabled && settings.qrConfirmed && settings.qrAssetId && await validTronAddress(settings.address) && await repo.one("SELECT 1 FROM game_assets WHERE id=? AND media_type IN ('image/png','image/jpeg','image/webp')", settings.qrAssetId);
    const orders=admin?await repo.all("SELECT r.*,u.username FROM recharge_orders r JOIN users u ON u.id=r.user_id ORDER BY r.created_ms DESC LIMIT 200"):await repo.all("SELECT * FROM recharge_orders WHERE user_id=? ORDER BY created_ms DESC LIMIT 100",user.id);
    const wallet=await repo.one("SELECT (balance*100+balance_fraction)/100.0 AS balance FROM virtual_points WHERE user_id=?",user.id);
    const monitor=admin?await repo.one("SELECT last_scan_ms,last_error,next_poll_ms,scanned FROM payment_monitor_state WHERE name='trc20'"):undefined;
    return reply({ settings: admin || ready ? settings : { ...defaultRecharge, revision: settings.revision },orders,wallet,monitor,provider:admin?{name:"TRONGrid",keyConfigured:!!env.TRONGRID_API_KEY}:undefined });
  }
  const data = await readBody();
  if (!admin || extra || req.method!=="PATCH") return reply(await paymentOrderAction(repo,env,user,admin,extra,req.method,data,settings));
  if (admin && req.method === "PATCH" && !extra) {
    const address = clean(data.address, 100), qrAssetId = clean(data.qrAssetId, 100) || null;
    if (typeof data.enabled !== "boolean" || typeof data.qrConfirmed !== "boolean") error("配置格式无效");
    if (data.revision !== settings.revision) error("配置已更新，请刷新后重新保存", 409);
    if (address && !await validTronAddress(address)) error("请输入有效的TRON/TRC20 Base58Check地址");
    if (qrAssetId && !await repo.one("SELECT 1 FROM game_assets WHERE id=? AND media_type IN ('image/png','image/jpeg','image/webp')", qrAssetId)) error("收款二维码必须关联已上传的图片");
    if (data.enabled && (!address || !qrAssetId || !data.qrConfirmed)) error("启用前请填写地址、上传二维码并确认二者一致");
    const next = { enabled: data.enabled, autoApproval: data.autoApproval === true, address, qrAssetId, instructions: clean(data.instructions, 1000), qrConfirmed: data.qrConfirmed, revision: settings.revision + 1 };
    const value = JSON.stringify(next), auditId = crypto.randomUUID();
    const results = await repo.batch([
      repo.statement("UPDATE system_settings SET value=? WHERE key=? AND value=?", value, RECHARGE_KEY, row?.value ?? ""),
      repo.statement("INSERT INTO audit_logs(id,actor_id,action,target,detail) SELECT ?,?,'recharge.settings',?,? WHERE EXISTS(SELECT 1 FROM system_settings WHERE key=? AND value=?)", auditId, user.id, RECHARGE_KEY, value, RECHARGE_KEY, value),
    ]);
    if (!results[0].meta.changes) error("配置已被其他管理员修改，请刷新", 409);
    return reply({ settings: next });
  }
  error("操作不支持", 405);
}
