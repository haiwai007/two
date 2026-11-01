import { Repository } from "./db";
import type { Env } from "../types/env";
export { verifyTurnstile as turnstile } from "./turnstile";
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join(
    "",
  );
const unhex = (s: string) =>
  Uint8Array.from(s.match(/../g) ?? [], (x) => parseInt(x, 16));
export async function passwordHash(
  password: string,
  salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer),
  iterations = 100000,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: unhex(salt), iterations },
    key,
    256,
  );
  return `pbkdf2$${iterations}$${salt}$${hex(bits)}`;
}
export async function passwordVerify(password: string, stored: string) {
  const [scheme, count, salt] = stored.split("$");
  if (scheme !== "pbkdf2" || !salt || Number(count) !== 100000) return false;
  const actual = await passwordHash(password, salt, Number(count));
  let different = actual.length ^ stored.length;
  for (let i = 0; i < actual.length; i++)
    different |= actual.charCodeAt(i) ^ (stored.charCodeAt(i) || 0);
  return different === 0;
}
export function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
export function checkOrigin(req: Request) {
  if (!["GET", "HEAD"].includes(req.method)) {
    const origin = req.headers.get("origin"),
      url = new URL(req.url),
      host = req.headers.get("host") ?? url.host,
      protocol =
        req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
        url.protocol.slice(0, -1);
    if (origin !== protocol + "://" + host) fail("来源验证失败", 403);
    if (
      req.method !== "DELETE" &&
      !req.headers.get("content-type")?.includes("application/json") &&
      !req.headers.get("content-type")?.includes("multipart/form-data")
    )
      fail("无效内容格式", 415);
  }
}
export async function rate(
  repo: Repository,
  key: string,
  max: number,
  seconds: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const row = await repo.one<{ count: number }>(
    "INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING count",
    key,
    now + seconds,
    now,
    now,
    now + seconds,
  );
  if ((row?.count ?? max + 1) > max) fail("请求过于频繁，请稍后重试", 429);
}
export type User = {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  status: string;
  role?: string;
  balance: number;
};
export async function current(
  req: Request,
  repo: Repository,
): Promise<User | null> {
  const cookie = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!cookie) return null;
  const digest = hex(await crypto.subtle.digest("SHA-256", enc.encode(cookie)));
  return repo.one<User>(
    `SELECT u.id,u.username,u.email,u.avatar,u.status,a.role,p.balance FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN admin_users a ON a.user_id=u.id JOIN virtual_points p ON p.user_id=u.id WHERE s.id=? AND s.expires_at>? AND u.status='active'`,
    digest,
    Date.now(),
  );
}
export async function loginSession(
  repo: Repository,
  userId: string,
  secure: boolean,
) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const digest = hex(await crypto.subtle.digest("SHA-256", enc.encode(token)));
  await repo.run(
    "INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)",
    digest,
    userId,
    Date.now() + 7 * 86400000,
  );
  return `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure ? "; Secure" : ""}`;
}
export async function logout(req: Request, repo: Repository) {
  const token = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (token)
    await repo.run(
      "DELETE FROM sessions WHERE id=?",
      hex(await crypto.subtle.digest("SHA-256", enc.encode(token))),
    );
}
export function textField(value: unknown, name: string, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail(`${name}格式不正确`);
  return (value as string).trim();
}
