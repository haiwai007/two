import { Repository, environment } from "./db";
import { calculate } from "../game-engine/rules";
import {
  current,
  checkOrigin,
  fail,
  loginSession,
  logout,
  passwordHash,
  passwordVerify,
  rate,
  textField,
  turnstile,
  type User,
} from "./security";
const uid = () => crypto.randomUUID();
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
const adminTables: Record<
  string,
  { table: string; key: string; fields: string[] }
> = {
  games: {
    table: "games",
    key: "id",
    fields: [
      "name",
      "slug",
      "description",
      "category_id",
      "cover_asset_id",
      "banner_asset_id",
      "status",
      "version",
      "sort",
      "featured",
      "hot",
      "program_path",
      "config",
      "rules",
    ],
  },
  categories: {
    table: "game_categories",
    key: "id",
    fields: ["name", "slug", "icon", "sort"],
  },
  events: {
    table: "events",
    key: "id",
    fields: ["title", "content", "asset_id", "starts_at", "ends_at", "status"],
  },
  announcements: {
    table: "announcements",
    key: "id",
    fields: ["title", "content", "sort", "status"],
  },
  messages: {
    table: "messages",
    key: "id",
    fields: ["user_id", "title", "content"],
  },
  integrations: {
    table: "game_integrations",
    key: "id",
    fields: [
      "game_id",
      "version",
      "status",
      "program_path",
      "rules",
      "pending_rules",
    ],
  },
  settings: { table: "system_settings", key: "key", fields: ["value"] },
  admins: { table: "admin_users", key: "user_id", fields: ["role"] },
};
function boundedStream(req: Request, max: number) {
  let size = 0;
  return req.body?.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength;
        if (size > max) fail("请求总大小超过限制", 413);
        controller.enqueue(chunk);
      },
    }),
  );
}
async function formBody(req: Request, max = 32 * 1024 * 1024) {
  return new Response(boundedStream(req, max), {
    headers: { "Content-Type": req.headers.get("content-type") ?? "" },
  }).formData();
}
async function body(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 65536)
    fail("请求过大", 413);
  const raw = await new Response(boundedStream(req, 65536)).text();
  if (raw.length > 65536) fail("请求过大", 413);
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    fail("JSON格式不正确");
  }
}
export async function handle(req: Request) {
  try {
    checkOrigin(req);
    const env = await environment(),
      repo = new Repository(env.DB);
    const url = new URL(req.url),
      parts = url.pathname.replace(/^\/api\/?/, "").split("/"),
      [resource, id, action] = parts,
      method = req.method;
    const user = await current(req, repo),
      ip = req.headers.get("CF-Connecting-IP") ?? "local";
    const requireUser = () => {
      if (!user) fail("请先登录", 401);
      return user as User;
    };
    const requireAdmin = (owner = false) => {
      const u = requireUser();
      if (!u.role || (owner && u.role !== "owner")) fail("没有管理权限", 403);
      return u;
    };
    const audit = (action: string, target: string, detail: unknown) =>
      repo.statement(
        "INSERT INTO audit_logs(id,actor_id,action,target,detail) VALUES(?,?,?,?,?)",
        uid(),
        user!.id,
        action,
        target,
        JSON.stringify(detail),
      );
    if (resource === "health")
      return json({
        status: "ok",
        database: !!(await repo.one("SELECT 1 AS ok")),
        storage: !!env.BUCKET,
      });
    if (resource === "config")
      return json({
        turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? "",
        requireTurnstile: env.REQUIRE_TURNSTILE !== "false",
      });
    if (resource === "auth") {
      if (id === "me") return json({ user });
      if (id === "logout" && method === "POST") {
        await logout(req, repo);
        return json({ ok: true }, 200, {
          "Set-Cookie":
            "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure",
        });
      }
      if ((id === "login" || id === "register") && method === "POST") {
        await rate(repo, `${id}:${ip}`, id === "login" ? 10 : 4, 600);
        const data = await body(req);
        await turnstile(env, data.turnstile, ip);
        const password = textField(data.password, "密码", 128);
        if (password.length < 10) fail("密码至少10位");
        if (id === "register") {
          const setting = await repo.one<{ value: string }>(
            "SELECT value FROM system_settings WHERE key=?",
            "registration_enabled",
          );
          if (setting?.value === "false") fail("注册暂未开放", 403);
          const username = textField(data.username, "用户名", 32),
            email = textField(data.email, "邮箱", 254).toLowerCase();
          if (
            !/^[\p{L}\p{N}_-]{3,32}$/u.test(username) ||
            !/^\S+@\S+\.\S+$/.test(email) ||
            data.agreement !== true
          )
            fail("请检查用户名、邮箱并同意用户协议");
          const userId = uid(),
            hash = await passwordHash(password);
          try {
            await repo.batch([
              repo.statement(
                "INSERT INTO users(id,username,email,password_hash) VALUES(?,?,?,?)",
                userId,
                username,
                email,
                hash,
              ),
              repo.statement(
                "INSERT INTO virtual_points(user_id) VALUES(?)",
                userId,
              ),
              repo.statement(
                "INSERT INTO point_records(id,user_id,type,delta,before_balance,after_balance) VALUES(?,?,'initial',10000,0,10000)",
                uid(),
                userId,
              ),
            ]);
          } catch {
            fail("用户名或邮箱已被使用", 409);
          }
          return json({ ok: true }, 201, {
            "Set-Cookie": await loginSession(
              repo,
              userId,
              url.protocol === "https:",
            ),
          });
        }
        const identity = textField(data.identity, "用户名或邮箱", 254);
        const row = await repo.one<{
          id: string;
          password_hash: string;
          status: string;
        }>(
          "SELECT id,password_hash,status FROM users WHERE username=? OR email=?",
          identity,
          identity,
        );
        // Derive even for unknown users to limit account enumeration through timing.
        const dummy =
          "pbkdf2$100000$00000000000000000000000000000000$" + "0".repeat(64);
        const valid = await passwordVerify(
          password,
          row?.password_hash ?? dummy,
        );
        if (!row || !valid || row.status !== "active")
          fail("账号或密码不正确", 401);
        return json({ ok: true }, 200, {
          "Set-Cookie": await loginSession(
            repo,
            row.id,
            url.protocol === "https:",
          ),
        });
      }
    }
    if (resource === "site" && method === "GET")
      return json({
        settings: await repo.all(
          "SELECT key,value FROM system_settings WHERE key IN ('site_name','logo_asset_id','banner_asset_id','background_asset_id','theme_color')",
        ),
        announcements: await repo.all(
          "SELECT id,title,content FROM announcements WHERE status='published' ORDER BY sort LIMIT 3",
        ),
        events: await repo.all(
          "SELECT * FROM events WHERE status='published' AND (starts_at IS NULL OR datetime(starts_at)<=datetime('now')) AND (ends_at IS NULL OR datetime(ends_at)>datetime('now')) LIMIT 3",
        ),
      });
    if (resource === "games" && method === "GET") {
      if (id) {
        const game = await repo.one(
          "SELECT * FROM games WHERE id=? AND status<>?",
          id,
          "offline",
        );
        if (!game) fail("游戏不存在", 404);
        return json({ game });
      }
      return json({
        games: await repo.all(
          "SELECT * FROM games WHERE status<>'offline' ORDER BY sort,created_at DESC",
        ),
        categories: await repo.all(
          "SELECT * FROM game_categories ORDER BY sort",
        ),
      });
    }
    if (resource === "assets" && id && method === "GET") {
      const asset = await repo.one<{ storage_key: string; media_type: string }>(
        "SELECT storage_key,media_type FROM game_assets WHERE id=?",
        id,
      );
      if (!asset) fail("素材不存在", 404);
      if (asset.storage_key.startsWith("bundled/"))
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/assets/" + asset.storage_key.slice(8),
            "Cache-Control": "public,max-age=300",
          },
        });
      if (asset.storage_key.startsWith("placeholder/"))
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/assets/" + asset.storage_key.slice(12),
            "Cache-Control": "public,max-age=300",
          },
        });
      const cache =
          typeof caches !== "undefined"
            ? (caches as CacheStorage & { default: Cache }).default
            : undefined,
        cacheKey = new Request(url.origin + url.pathname);
      const cached = await cache?.match(cacheKey);
      if (cached) return cached;
      const object = await env.BUCKET.get(asset.storage_key);
      if (!object) fail("素材文件不存在", 404);
      const response = new Response(object.body, {
        headers: {
          "Content-Type": asset.media_type,
          ETag: object.httpEtag,
          "Cache-Control": "public,max-age=31536000,immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
      try {
        await cache?.put(cacheKey, response.clone());
      } catch {}
      return response;
    }
    if (resource === "favorites") {
      const u = requireUser();
      if (method === "GET")
        return json({
          games: await repo.all(
            "SELECT g.* FROM favorites f JOIN games g ON g.id=f.game_id WHERE f.user_id=? ORDER BY f.created_at DESC",
            u.id,
          ),
        });
      if (!id) fail("缺少游戏ID");
      if (method === "POST") {
        await repo.run(
          "INSERT OR IGNORE INTO favorites(user_id,game_id) VALUES(?,?)",
          u.id,
          id,
        );
        return json({ ok: true });
      }
      if (method === "DELETE") {
        await repo.run(
          "DELETE FROM favorites WHERE user_id=? AND game_id=?",
          u.id,
          id,
        );
        return json({ ok: true });
      }
    }
    if (resource === "play" && id && method === "POST") {
      const u = requireUser();
      await rate(repo, `play:${u.id}`, 120, 60);
      const data = await body(req),
        key = textField(data.requestKey, "请求ID", 100);
      if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key)) fail("无效请求ID");
      const previous = await repo.one<{
        game_id: string;
        stake: number;
        result: string;
      }>(
        "SELECT game_id,stake,result FROM game_records WHERE user_id=? AND request_key=?",
        u.id,
        key,
      );
      if (previous) {
        if (previous.game_id !== id || previous.stake !== data.stake)
          fail("请求ID已用于不同操作", 409);
        return json({
          round: JSON.parse(previous.result),
          user: await current(req, repo),
          replayed: true,
        });
      }
      const game = await repo.one<{ status: string }>(
        "SELECT status FROM games WHERE id=?",
        id,
      );
      if (game?.status !== "published") fail("游戏暂未开放", 409);
      if (
        typeof data.stake !== "number" ||
        ![10, 20, 50, 100].includes(data.stake)
      )
        fail("积分消耗必须为10、20、50或100");
      const result = calculate(id, data.stake),
        recordId = uid();
      try {
        await repo.run(
          "INSERT INTO game_records(id,user_id,game_id,request_key,stake,reward,result) VALUES(?,?,?,?,?,?,?)",
          recordId,
          u.id,
          id,
          key,
          Number(data.stake),
          result.reward,
          JSON.stringify(result),
        );
      } catch (error) {
        const duplicate = await repo.one<{
          game_id: string;
          stake: number;
          result: string;
        }>(
          "SELECT game_id,stake,result FROM game_records WHERE user_id=? AND request_key=?",
          u.id,
          key,
        );
        if (duplicate) {
          if (duplicate.game_id !== id || duplicate.stake !== data.stake)
            fail("请求ID冲突", 409);
          return json({
            round: JSON.parse(duplicate.result),
            user: await current(req, repo),
            replayed: true,
          });
        }
        if (String(error).includes("insufficient")) fail("积分不足", 409);
        throw error;
      }
      return json({ round: result, user: await current(req, repo), recordId });
    }
    if (resource === "profile") {
      const u = requireUser();
      if (method === "GET") {
        const records = await repo.all(
          "SELECT r.*,g.name AS game_name FROM game_records r JOIN games g ON g.id=r.game_id WHERE r.user_id=? ORDER BY r.created_at DESC LIMIT 100",
          u.id,
        );
        return json({
          user: u,
          records,
          points: await repo.all(
            "SELECT * FROM point_records WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
            u.id,
          ),
          favorites: await repo.all(
            "SELECT g.* FROM favorites f JOIN games g ON g.id=f.game_id WHERE f.user_id=?",
            u.id,
          ),
        });
      }
      if (id === "avatar" && method === "POST") {
        await rate(repo, `avatar:${u.id}`, 10, 600);
        const form = await formBody(req);
        const file = form.get("file");
        if (
          !(file instanceof File) ||
          file.size < 1 ||
          file.size > 2 * 1024 * 1024
        )
          fail("头像大小须小于2MB");
        const bytes = new Uint8Array(await file.arrayBuffer());
        const png =
            bytes[0] === 137 &&
            bytes[1] === 80 &&
            bytes[2] === 78 &&
            bytes[3] === 71,
          jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
          webp =
            String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
        const type = png
          ? "image/png"
          : jpg
            ? "image/jpeg"
            : webp
              ? "image/webp"
              : null;
        if (!type || type !== file.type) fail("头像只支持PNG/JPEG/WebP");
        const assetId = uid(),
          key = `avatars/${u.id}/${assetId}`;
        await env.BUCKET.put(key, bytes, {
          httpMetadata: { contentType: type },
        });
        try {
          await repo.batch([
            repo.statement(
              "INSERT INTO game_assets(id,storage_key,media_type,size,original_name) VALUES(?,?,?,?,?)",
              assetId,
              key,
              type,
              file.size,
              file.name.slice(0, 200),
            ),
            repo.statement(
              "UPDATE users SET avatar=? WHERE id=?",
              assetId,
              u.id,
            ),
          ]);
        } catch (error) {
          await env.BUCKET.delete(key);
          throw error;
        }
        return json({ ok: true, avatar: assetId });
      }
      if (id === "security" && method === "POST") {
        const data = await body(req);
        await rate(repo, `password:${u.id}`, 5, 600);
        const row = await repo.one<{ password_hash: string }>(
          "SELECT password_hash FROM users WHERE id=?",
          u.id,
        );
        if (
          !(await passwordVerify(
            textField(data.oldPassword, "原密码", 128),
            row!.password_hash,
          ))
        )
          fail("原密码错误");
        const next = textField(data.password, "新密码", 128);
        if (next.length < 10) fail("新密码至少10位");
        await repo.batch([
          repo.statement(
            "UPDATE users SET password_hash=? WHERE id=?",
            await passwordHash(next),
            u.id,
          ),
          repo.statement("DELETE FROM sessions WHERE user_id=?", u.id),
        ]);
        return json({ ok: true }, 200, {
          "Set-Cookie":
            "session=; Path=/; HttpOnly; Max-Age=0; Secure; SameSite=Lax",
        });
      }
      if (method === "PATCH") {
        const data = await body(req),
          username = textField(data.username, "用户名", 32);
        if (!/^[\p{L}\p{N}_-]{3,32}$/u.test(username)) fail("用户名格式不正确");
        await repo.run(
          "UPDATE users SET username=? WHERE id=?",
          username,
          u.id,
        );
        return json({ ok: true });
      }
    }
    if (resource === "leaderboard" && method === "GET")
      return json({
        items: await repo.all(
          "SELECT u.username,l.score FROM leaderboard l JOIN users u ON u.id=l.user_id WHERE u.status='active' ORDER BY l.score DESC LIMIT 100",
        ),
      });
    if (
      ["events", "announcements", "messages"].includes(resource) &&
      method === "GET"
    ) {
      if (resource === "messages") {
        const u = requireUser();
        return json({
          items: await repo.all(
            "SELECT * FROM messages WHERE user_id IS NULL OR user_id=? ORDER BY created_at DESC LIMIT 100",
            u.id,
          ),
        });
      }
      return json({
        items: await repo.all(
          `SELECT * FROM ${resource} WHERE status='published' ${resource === "events" ? "AND (starts_at IS NULL OR datetime(starts_at)<=datetime('now')) AND (ends_at IS NULL OR datetime(ends_at)>datetime('now'))" : ""}`,
        ),
      });
    }
    if (resource === "admin") {
      const actor = requireAdmin(id === "admins" || id === "settings");
      if (id === "statistics" || !id)
        return json({
          users: await repo.one(
            "SELECT COUNT(*) AS total,SUM(date(created_at,'+8 hours')=date('now','+8 hours')) AS today FROM users",
          ),
          games: await repo.one("SELECT COUNT(*) AS total FROM games"),
          plays: await repo.one(
            "SELECT COUNT(*) AS total,COALESCE(SUM(stake),0) AS consumed,COALESCE(SUM(reward),0) AS rewarded FROM game_records",
          ),
          recentUsers: await repo.all(
            "SELECT id,username,created_at,status FROM users ORDER BY created_at DESC LIMIT 10",
          ),
          recentRecords: await repo.all(
            "SELECT r.*,u.username,g.name AS game_name FROM game_records r JOIN users u ON u.id=r.user_id JOIN games g ON g.id=r.game_id ORDER BY r.created_at DESC LIMIT 20",
          ),
          daily: await repo.all(
            "SELECT date(created_at,'+8 hours') AS day,COUNT(*) AS plays,SUM(reward-stake) AS net FROM game_records GROUP BY date(created_at,'+8 hours') ORDER BY day DESC LIMIT 30",
          ),
          weekly: await repo.all(
            "SELECT strftime('%Y-%W',created_at,'+8 hours') AS period,COUNT(*) AS plays,SUM(reward-stake) AS net FROM game_records GROUP BY period ORDER BY period DESC LIMIT 12",
          ),
          monthly: await repo.all(
            "SELECT strftime('%Y-%m',created_at,'+8 hours') AS period,COUNT(*) AS plays,SUM(reward-stake) AS net FROM game_records GROUP BY period ORDER BY period DESC LIMIT 12",
          ),
          growth: await repo.all(
            "SELECT date(created_at,'+8 hours') AS day,COUNT(*) AS users FROM users GROUP BY day ORDER BY day DESC LIMIT 30",
          ),
          popular: await repo.all(
            "SELECT g.name,COUNT(*) AS plays FROM game_records r JOIN games g ON g.id=r.game_id GROUP BY r.game_id ORDER BY plays DESC LIMIT 10",
          ),
          logs: await repo.all(
            "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50",
          ),
        });
      if (id === "users") {
        if (method === "GET" && !action)
          return json({
            items: await repo.all(
              "SELECT u.id,u.username,u.email,u.status,u.created_at,p.balance FROM users u JOIN virtual_points p ON p.user_id=u.id WHERE u.username LIKE ? ORDER BY u.created_at DESC LIMIT 200",
              "%" + (url.searchParams.get("q") ?? "").slice(0, 100) + "%",
            ),
          });
        if (method === "PATCH" && action) {
          const data = await body(req);
          if (actor.role === "editor") fail("没有用户管理权限", 403);
          if (data.delta !== undefined) {
            if (actor.role !== "owner") fail("仅所有者可以调整积分", 403);
            const delta = Number(data.delta);
            if (
              !Number.isSafeInteger(delta) ||
              Math.abs(delta) > 1000000 ||
              !delta
            )
              fail("积分调整值无效");
            const wallet = await repo.one<{ balance: number }>(
              "SELECT balance FROM virtual_points WHERE user_id=?",
              action,
            );
            if (!wallet || wallet.balance + delta < 0) fail("余额不合法");
            await repo.batch([
              repo.statement(
                "INSERT INTO point_records(id,user_id,type,delta,before_balance,after_balance) VALUES(?,?,'admin',?,?,?)",
                uid(),
                action,
                delta,
                wallet.balance,
                wallet.balance + delta,
              ),
              audit("points.adjust", action, {
                delta,
                reason: textField(data.reason, "调整原因", 500),
              }),
            ]);
          } else {
            if (action === actor.id) fail("不能封禁当前管理员");
            if (!["active", "blocked"].includes(String(data.status)))
              fail("状态无效");
            const targetAdmin = await repo.one(
              "SELECT 1 FROM admin_users WHERE user_id=?",
              action,
            );
            if (targetAdmin) fail("请先由所有者移除该管理员角色");
            await repo.batch([
              repo.statement(
                "UPDATE users SET status=? WHERE id=?",
                data.status,
                action,
              ),
              repo.statement("DELETE FROM sessions WHERE user_id=?", action),
              audit("user.status", action, data),
            ]);
          }
          return json({ ok: true });
        }
        if (method === "GET" && action)
          return json({
            records: await repo.all(
              "SELECT * FROM game_records WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
              action,
            ),
          });
      }
      if (id === "assets") {
        if (method === "GET")
          return json({
            items: await repo.all(
              "SELECT * FROM game_assets ORDER BY created_at DESC LIMIT 500",
            ),
          });
        if (method === "POST") {
          if (actor.role === "support") fail("没有素材管理权限", 403);
          const form = await formBody(req),
            files = form.getAll("files");
          if (!files.length || files.length > 20) fail("每次上传1至20个文件");
          const saved = [];
          for (const file of files) {
            if (
              !(file instanceof File) ||
              file.size > 8 * 1024 * 1024 ||
              file.size === 0
            )
              fail("文件大小应为1字节至8MB");
            const bytes = new Uint8Array(await file.arrayBuffer());
            const png =
              bytes[0] === 137 &&
              bytes[1] === 80 &&
              bytes[2] === 78 &&
              bytes[3] === 71;
            const jpg =
              bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
            const webp =
              String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
              String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
            const ogg = String.fromCharCode(...bytes.slice(0, 4)) === "OggS";
            const mp3 =
              String.fromCharCode(...bytes.slice(0, 3)) === "ID3" ||
              (bytes[0] === 255 && (bytes[1] & 224) === 224);
            const type = png
              ? "image/png"
              : jpg
                ? "image/jpeg"
                : webp
                  ? "image/webp"
                  : ogg
                    ? "audio/ogg"
                    : mp3
                      ? "audio/mpeg"
                      : null;
            if (!type || type !== file.type)
              fail("仅接受内容签名匹配的PNG/JPEG/WebP/OGG/MP3");
            const predecessor = String(form.get("predecessorId") ?? "");
            const old = predecessor
              ? await repo.one<{ version: number; game_id: string }>(
                  "SELECT version,game_id FROM game_assets WHERE id=?",
                  predecessor,
                )
              : null;
            if (predecessor && !old) fail("前序素材不存在");
            const assetId = uid(),
              key = `media/${assetId}`;
            await env.BUCKET.put(key, bytes, {
              httpMetadata: { contentType: type },
            });
            try {
              await repo.batch([
                repo.statement(
                  "INSERT INTO game_assets(id,storage_key,media_type,size,original_name,game_id,version,predecessor_id) VALUES(?,?,?,?,?,?,?,?)",
                  assetId,
                  key,
                  type,
                  file.size,
                  file.name.slice(0, 200),
                  old?.game_id ?? null,
                  (old?.version ?? 0) + 1,
                  predecessor || null,
                ),
                audit("asset.upload", assetId, { key }),
              ]);
            } catch (error) {
              await env.BUCKET.delete(key);
              throw error;
            }
            saved.push(assetId);
          }
          return json({ ids: saved }, 201);
        }
        if (method === "DELETE" && action) {
          if (actor.role === "support") fail("没有素材管理权限", 403);
          const asset = await repo.one<{ storage_key: string }>(
            "SELECT storage_key FROM game_assets WHERE id=?",
            action,
          );
          if (!asset) fail("素材不存在", 404);
          const referenced = await repo.one<{ total: number }>(
            "SELECT (SELECT COUNT(*) FROM system_settings WHERE value=?)+(SELECT COUNT(*) FROM game_categories WHERE icon=?)+(SELECT COUNT(*) FROM users WHERE avatar=?) AS total",
            action,
            action,
            action,
          );
          if (referenced?.total)
            fail("素材仍用于网站设置、分类或头像，请先替换关联", 409);

          await repo.batch([
            repo.statement("DELETE FROM game_assets WHERE id=?", action),
            audit("asset.delete", action, {}),
          ]);
          if (!asset!.storage_key.startsWith("placeholder/"))
            await env.BUCKET.delete(asset!.storage_key);
          return json({ ok: true });
        }
      }
      const def = adminTables[id];
      if (def) {
        if (method === "GET")
          return json({
            items: await repo.all(`SELECT * FROM ${def.table} LIMIT 500`),
          });
        if (actor.role === "support") fail("没有编辑权限", 403);
        if (id === "admins" && action === actor.id)
          fail("不能修改自己的管理员权限");
        if (method === "DELETE" && action) {
          if (id === "games") {
            const count = await repo.one<{ total: number }>(
              "SELECT COUNT(*) AS total FROM game_records WHERE game_id=?",
              action,
            );
            if (count?.total) fail("已有游戏记录，请使用下架保留积分账本", 409);
            await repo.batch([
              repo.statement("DELETE FROM favorites WHERE game_id=?", action),
              repo.statement(
                "DELETE FROM game_integrations WHERE game_id=?",
                action,
              ),
              repo.statement(
                "UPDATE game_assets SET game_id=NULL WHERE game_id=?",
                action,
              ),
              repo.statement("DELETE FROM games WHERE id=?", action),
              audit("games.delete", action, {}),
            ]);
            return json({ ok: true });
          }
          if (id === "categories") {
            const used = await repo.one<{ total: number }>(
              "SELECT COUNT(*) AS total FROM games WHERE category_id=?",
              action,
            );
            if (used?.total) fail("分类仍被游戏使用，请先调整关联", 409);
          }
          await repo.batch([
            repo.statement(
              `DELETE FROM ${def.table} WHERE ${def.key}=?`,
              action,
            ),
            audit(`${id}.delete`, action, {}),
          ]);
          return json({ ok: true });
        }
        if (method === "POST" || method === "PATCH") {
          const data = await body(req),
            keys = def.fields.filter((k) => data[k] !== undefined);
          if (!keys.length) fail("没有可保存字段");
          for (const k of keys) {
            if (
              typeof data[k] !== "string" &&
              typeof data[k] !== "number" &&
              data[k] !== null
            )
              fail("字段类型错误");
            if (
              typeof data[k] === "string" &&
              (data[k] as string).length > 10000
            )
              fail("字段过长");
          }
          if (
            id === "games" &&
            data.status === "published" &&
            !["golden-god", "dragon-world", "phoenix-legend"].includes(
              action ?? String(data.id),
            )
          )
            fail("游戏尚未实现，不能发布");
          if (id === "games" && data.config) {
            try {
              JSON.parse(String(data.config));
            } catch {
              fail("游戏配置必须为JSON");
            }
          }
          if (
            id === "admins" &&
            !["owner", "editor", "support"].includes(String(data.role))
          )
            fail("角色无效");
          const target = action ?? textField(data[def.key] ?? uid(), "ID", 100);
          const statement =
            method === "POST"
              ? repo.statement(
                  `INSERT INTO ${def.table}(${def.key},${keys.join(",")}) VALUES(${[target, ...keys].map(() => "?").join(",")})`,
                  target,
                  ...keys.map((k) => data[k]),
                )
              : repo.statement(
                  `UPDATE ${def.table} SET ${keys.map((k) => k + "=?").join(",")} WHERE ${def.key}=?`,
                  ...keys.map((k) => data[k]),
                  target,
                );
          await repo.batch([
            statement,
            audit(
              `${id}.${method.toLowerCase()}`,
              target,
              Object.fromEntries(keys.map((k) => [k, data[k]])),
            ),
          ]);
          return json({ ok: true, id: target });
        }
      }
    }
    return json({ error: "接口不存在" }, 404);
  } catch (error) {
    const e = error as Error & { status?: number };
    if (!e.status && e.message?.includes("UNIQUE constraint"))
      return json({ error: "唯一标识已存在" }, 409);
    if (!e.status && e.message?.includes("FOREIGN KEY constraint"))
      return json({ error: "该记录仍有关联引用，请先调整关联" }, 409);
    if (!e.status && e.message?.includes("CHECK constraint"))
      return json({ error: "字段值未通过数据约束" }, 400);
    if (!e.status)
      console.error(
        JSON.stringify({
          level: "error",
          event: "api",
          message: e.message,
          requestId: req.headers.get("CF-Ray"),
        }),
      );
    return json(
      {
        error: e.status
          ? e.message
          : "服务暂不可用，请检查资源绑定和服务端日志",
      },
      e.status ?? 503,
    );
  }
}
