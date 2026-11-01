type VerificationEnv = { REQUIRE_TURNSTILE?: string; TURNSTILE_SECRET_KEY?: string };
type VerifyOptions = { fetchImpl?: typeof fetch; hostname?: string; log?: (detail: Record<string, unknown>) => void };
function reject(message: string, status: number): never {
  throw Object.assign(new Error(message), { status });
}
export async function verifyTurnstile(env: VerificationEnv, token: unknown, ip: string, options: VerifyOptions = {}) {
  if (env.REQUIRE_TURNSTILE === "false") return;
  if (typeof token !== "string" || !token.trim() || token.length > 2048) reject("请先完成人机验证，再提交表单", 400);
  if (!env.TURNSTILE_SECRET_KEY) reject("人机验证服务尚未配置，请联系管理员", 503);
  const data = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  // remoteip is optional; a local/proxy sentinel is not a valid IP address.
  if (/^[0-9a-f.:]+$/i.test(ip) && /[.:]/.test(ip)) data.set("remoteip", ip);
  const log = options.log ?? (detail => console.warn(JSON.stringify(detail)));
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: data, signal: AbortSignal.timeout(10000),
    });
  } catch {
    log({ event: "turnstile.unavailable" });
    reject("人机验证服务暂时不可用，请稍后重试", 503);
  }
  if (!response.ok) {
    log({ event: "turnstile.provider_http_error", status: response.status });
    reject("人机验证服务暂时不可用，请稍后重试", 503);
  }
  let result: { success?: boolean; hostname?: string; "error-codes"?: string[] };
  try { result = await response.json(); }
  catch { reject("人机验证服务响应异常，请稍后重试", 503); }
  if (result.success !== true) {
    const known = new Set(["missing-input-secret", "invalid-input-secret", "missing-input-response", "invalid-input-response", "bad-request", "timeout-or-duplicate", "internal-error"]);
    const codes = Array.isArray(result["error-codes"]) ? result["error-codes"].map(code => known.has(code) ? code : "unknown") : [];
    // Only public error identifiers are logged. Never log tokens, secrets or request bodies.
    log({ event: "turnstile.rejected", codes });
    if (codes.some(code => code === "missing-input-secret" || code === "invalid-input-secret")) reject("人机验证配置异常，请联系管理员检查站点密钥", 503);
    if (codes.includes("internal-error")) reject("人机验证服务暂时不可用，请稍后重试", 503);
    if (codes.includes("timeout-or-duplicate")) reject("人机验证已过期或已使用，请重新完成验证", 403);
    reject("人机验证未通过，请重新完成验证后重试", 403);
  }
  if (options.hostname && result.hostname !== options.hostname) {
    log({ event: "turnstile.hostname_mismatch" });
    reject("人机验证域名不匹配，请刷新当前站点后重试", 403);
  }
}
