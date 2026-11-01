"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Save,
  Trash2,
  Upload,
  Search,
  ExternalLink,
  X,
} from "lucide-react";
import { api, DataTable, Empty } from "./Platform";
type Row = Record<string, unknown>;
const modules: Record<
  string,
  { title: string; fields: Record<string, string>; key?: string }
> = {
  games: {
    title: "游戏管理",
    fields: {
      name: "名称",
      slug: "英文标识",
      description: "介绍",
      category_id: "分类ID",
      cover_asset_id: "封面素材ID",
      banner_asset_id: "横幅素材ID",
      status: "状态(planned/published/offline)",
      version: "版本",
      sort: "排序",
      featured: "推荐(0/1)",
      hot: "热门(0/1)",
      program_path: "自有程序路径",
      config: "配置JSON",
      rules: "规则",
    },
  },
  categories: {
    title: "分类管理",
    fields: {
      name: "名称",
      slug: "英文标识",
      icon: "图标素材ID",
      sort: "排序",
    },
  },
  integrations: {
    title: "自有程序管理",
    fields: {
      game_id: "游戏ID",
      version: "版本",
      status: "状态",
      program_path: "本项目程序路径",
      rules: "玩法文档",
      pending_rules: "待确认规则",
    },
  },
  events: {
    title: "活动管理",
    fields: {
      title: "标题",
      content: "内容",
      asset_id: "图片素材ID",
      starts_at: "开始时间(ISO)",
      ends_at: "结束时间(ISO)",
      status: "状态(draft/published)",
    },
  },
  announcements: {
    title: "公告管理",
    fields: {
      title: "标题",
      content: "内容",
      sort: "排序",
      status: "状态(draft/published)",
    },
  },
  messages: {
    title: "消息管理",
    fields: {
      user_id: "接收用户ID(留空为系统消息)",
      title: "标题",
      content: "内容",
    },
  },
  settings: { title: "系统设置", key: "key", fields: { value: "设置值" } },
  admins: {
    title: "管理员管理",
    key: "user_id",
    fields: { role: "角色(owner/editor/support)" },
  },
  users: { title: "用户管理", fields: {} },
  assets: { title: "素材管理", fields: {} },
  statistics: { title: "数据统计", fields: {} },
};
export default function Admin({
  path,
  user,
  notify,
}: {
  path: string;
  user: { id: string; role?: string } | null;
  notify: (s: string) => void;
}) {
  const module = path.split("/")[2] ?? "statistics",
    config = modules[module];
  const [rows, setRows] = useState<Row[]>([]),
    [stats, setStats] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<Row | null>(null),
    [creating, setCreating] = useState(false),
    [saving, setSaving] = useState(false),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [revision, setRevision] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api("admin/" + module);
      if (module === "statistics") setStats(data);
      else setRows(data.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [module]);
  useEffect(() => {
    setRows([]);
    setStats(null);
    setEditing(null);
    if (user?.role) void load();
  }, [load, user?.role]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditing(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  if (!user?.role)
    return (
      <Empty
        text="后台仅对授权管理员开放，请使用管理员账号登录。"
        action={
          <Link className="gold" href="/login">
            前往登录
          </Link>
        }
      />
    );
  if (!config) return <Empty text="管理模块不存在" />;
  const key = config.key ?? "id";
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data: Row = Object.fromEntries(new FormData(e.currentTarget));
    for (const k of ["sort", "featured", "hot"])
      if (data[k] !== undefined) data[k] = Number(data[k]);
    for (const k of [
      "user_id",
      "asset_id",
      "starts_at",
      "ends_at",
      "cover_asset_id",
      "banner_asset_id",
      "category_id",
    ])
      if (data[k] === "") data[k] = null;
    setSaving(true);
    try {
      await api(
        "admin/" + module + (creating ? "" : "/" + editing![key]),
        creating ? "POST" : "PATCH",
        data,
      );
      notify("已保存到数据库");
      setEditing(null);
      await load();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function remove(row: Row) {
    if (!window.confirm("确认删除这条记录？此操作会写入审计日志。")) return;
    try {
      await api("admin/" + module + "/" + row[key], "DELETE");
      notify("记录已删除");
      await load();
    } catch (e) {
      notify((e as Error).message);
    }
  }
  const filtered = rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="eyebrow">海盈国际 · 管理中心</div>
      <div className="section-heading">
        <h1>{config.title}</h1>
        {module === "statistics" && user.role === "owner" && (
          <button
            className="outline"
            onClick={async () => {
              try {
                const result = await api("admin/maintenance", "POST", {});
                notify(
                  `已清理${result.sessions}个过期会话、${result.rateLimits}条过期限流记录`,
                );
              } catch (error) {
                notify((error as Error).message);
              }
            }}
          >
            清理过期会话
          </button>
        )}
        {Object.keys(config.fields).length > 0 && (
          <button
            className="gold"
            onClick={() => {
              setCreating(true);
              setEditing({});
            }}
          >
            <Plus size={17} />
            新增记录
          </button>
        )}
      </div>
      <div className="admin-nav">
        <Link href="/admin" className={path === "/admin" ? "selected" : ""}>
          总览
        </Link>
        {Object.entries(modules).map(([slug, v]) => (
          <Link
            className={path === "/admin/" + slug ? "selected" : ""}
            key={slug}
            href={"/admin/" + slug}
          >
            {v.title}
          </Link>
        ))}
      </div>
      {module === "integrations" && (
        <p className="notice">
          此处管理自有程序的版本文档和素材关联。执行规则随源码发布；运行测试只开放当前已编译的0.2.0版本。
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {module === "statistics" && stats && (
        <>
          <div className="stat-grid">
            {[
              ["总用户", (stats.users as Row)?.total],
              ["今日新增", (stats.users as Row)?.today ?? 0],
              ["游戏总数", (stats.games as Row)?.total],
              ["累计游戏次数", (stats.plays as Row)?.total],
              ["累计消耗", (stats.plays as Row)?.consumed],
              ["累计奖励", (stats.plays as Row)?.rewarded],
            ].map(([label, value]) => (
              <div className="panel" key={String(label)}>
                <small>{String(label)}</small>
                <strong>{Number(value ?? 0).toLocaleString()}</strong>
              </div>
            ))}
          </div>
          <h2>每日积分与游戏统计</h2>
          <DataTable
            rows={stats.daily as Row[]}
            columns={{ day: "日期", plays: "游戏次数", net: "积分净变化" }}
          />
          <h2>每周游戏与积分</h2>
          <DataTable
            rows={stats.weekly as Row[]}
            columns={{ period: "年度周", plays: "游戏次数", net: "积分净变化" }}
          />
          <h2>每月游戏与积分</h2>
          <DataTable
            rows={stats.monthly as Row[]}
            columns={{ period: "月份", plays: "游戏次数", net: "积分净变化" }}
          />
          <h2>用户增长</h2>
          <DataTable
            rows={stats.growth as Row[]}
            columns={{ day: "日期", users: "新增用户" }}
          />
          <h2>热门游戏</h2>
          <DataTable
            rows={stats.popular as Row[]}
            columns={{ name: "游戏", plays: "次数" }}
          />
          <h2>最近注册</h2>
          <DataTable
            rows={stats.recentUsers as Row[]}
            columns={{
              username: "用户名",
              status: "状态",
              created_at: "注册时间",
            }}
          />
          <h2>最近游戏记录</h2>
          <DataTable
            rows={stats.recentRecords as Row[]}
            columns={{
              username: "用户",
              game_name: "游戏",
              stake: "消耗",
              reward: "奖励",
              created_at: "时间",
            }}
          />
          <h2>管理审计日志</h2>
          <DataTable
            rows={stats.logs as Row[]}
            columns={{
              created_at: "时间",
              actor_id: "管理员",
              action: "操作",
              target: "目标",
              detail: "详情",
            }}
          />
        </>
      )}
      {module !== "statistics" && (
        <>
          <div className="admin-toolbar">
            <label className="catalog-search">
              <Search size={17} />
              <input
                aria-label="搜索管理记录"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索名称、ID或内容"
              />
            </label>
            <button className="outline" onClick={() => void load()}>
              刷新数据
            </button>
          </div>
          {module === "assets" && (
            <section className="panel">
              <h2>上传素材</h2>
              <p>
                最多20个文件，每个8MB，总计不超过32MB。支持PNG/JPEG/WebP/OGG/MP3，服务端验证内容签名。图片裁切压缩可使用下方工具，正式文件存入R2。
              </p>
              <label>
                替换版本的前序素材ID（可选）
                <input
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                  placeholder="上传替换版本后，在游戏编辑中切换素材ID"
                />
              </label>
              <label className="upload-zone">
                <Upload />
                选择一个或多个文件
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,audio/ogg,audio/mpeg"
                  onChange={async (e) => {
                    if (!e.target.files?.length) return;
                    const form = new FormData();
                    Array.from(e.target.files).forEach((f) =>
                      form.append("files", f),
                    );
                    if (revision) form.append("predecessorId", revision);
                    setSaving(true);
                    try {
                      const response = await fetch("/api/admin/assets", {
                        method: "POST",
                        body: form,
                      });
                      const result = (await response.json()) as {
                        error: string;
                        ids: string[];
                      };
                      if (!response.ok) throw new Error(result.error);
                      notify("已上传至R2：" + result.ids.join(", "));
                      await load();
                    } catch (e) {
                      notify((e as Error).message);
                    } finally {
                      setSaving(false);
                      e.target.value = "";
                    }
                  }}
                  disabled={saving}
                />
              </label>
              <ImageProcessor notify={notify} />
            </section>
          )}
          {filtered.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{key}</th>
                    <th>名称 / 内容</th>
                    <th>状态 / 版本</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={String(row[key])}>
                      <td>
                        <code>{String(row[key])}</code>
                      </td>
                      <td>
                        {module === "assets" ? (
                          <>
                            <a
                              href={"/api/assets/" + row.id}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {String(row.original_name).replace(/[-_]ai(?=\.)/gi, "")}{" "}
                              <ExternalLink size={13} />
                            </a>
                            <small>
                              {String(row.media_type)} · {String(row.size)}{" "}
                              bytes
                            </small>
                          </>
                        ) : (
                          String(
                            row.name ??
                              row.title ??
                              row.username ??
                              row.game_id ??
                              row.value ??
                              row.role ??
                              "—",
                          )
                        )}
                      </td>
                      <td>
                        {String(
                          row.status ?? row.role ?? "v" + (row.version ?? "—"),
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          {module === "users" ? (
                            <>
                              <button
                                onClick={() => setSelected(String(row.id))}
                              >
                                详情与记录
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await api(
                                      "admin/users/" + row.id,
                                      "PATCH",
                                      {
                                        status:
                                          row.status === "active"
                                            ? "blocked"
                                            : "active",
                                      },
                                    );
                                    await load();
                                    notify("用户状态已更新");
                                  } catch (e) {
                                    notify((e as Error).message);
                                  }
                                }}
                              >
                                {row.status === "active" ? "封禁" : "解封"}
                              </button>
                              {user.role === "owner" && (
                                <button
                                  onClick={async () => {
                                    const input =
                                      window.prompt(
                                        "调整积分（正数增加，负数扣除）",
                                      );
                                    if (input === null) return;
                                    const delta = Number(input);
                                    if (
                                      !Number.isSafeInteger(delta) ||
                                      !delta
                                    ) {
                                      notify("请输入非零整数");
                                      return;
                                    }
                                    const reason =
                                      window.prompt("填写调整原因");
                                    if (!reason) return;
                                    try {
                                      await api(
                                        "admin/users/" + row.id,
                                        "PATCH",
                                        { delta, reason },
                                      );
                                      await load();
                                      notify("积分调整完成");
                                    } catch (e) {
                                      notify((e as Error).message);
                                    }
                                  }}
                                >
                                  调整积分
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {module !== "assets" && (
                                <button
                                  onClick={() => {
                                    setCreating(false);
                                    setEditing(row);
                                  }}
                                >
                                  编辑
                                </button>
                              )}
                              {module === "games" && (
                                <Link href={"/game/" + row.id}>预览</Link>
                              )}
                              {module === "integrations" &&
                                row.version === "0.2.0" && (
                                  <Link href={"/play/" + row.game_id}>
                                    运行测试
                                  </Link>
                                )}
                              <button
                                className="danger"
                                onClick={() => void remove(row)}
                              >
                                <Trash2 size={13} />
                                删除
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="暂无符合条件的记录" />
          )}
        </>
      )}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <section
            className="modal admin-editor"
            role="dialog"
            aria-modal="true"
            aria-label="编辑管理记录"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close" onClick={() => setEditing(null)}>
              <X />
            </button>
            <h2>
              {creating ? "新增" : "编辑"} · {config.title}
            </h2>
            <form onSubmit={save}>
              {creating && (
                <label>
                  {key}
                  <input
                    name={key}
                    required
                    placeholder={key === "id" ? "唯一英文ID" : "用户ID或设置键"}
                  />
                </label>
              )}
              {Object.entries(config.fields).map(([field, label]) => (
                <label key={field}>
                  {label}
                  {[
                    "content",
                    "rules",
                    "description",
                    "config",
                    "pending_rules",
                    "value",
                  ].includes(field) ? (
                    <textarea
                      name={field}
                      rows={field === "config" ? 5 : 3}
                      defaultValue={String(editing[field] ?? "")}
                    />
                  ) : (
                    <input
                      name={field}
                      defaultValue={String(
                        editing[field] ??
                          (["sort", "featured", "hot"].includes(field)
                            ? 0
                            : ""),
                      )}
                    />
                  )}
                </label>
              ))}
              <button className="gold full" disabled={saving}>
                <Save size={17} />
                {saving ? "正在保存…" : "保存到数据库"}
              </button>
            </form>
          </section>
        </div>
      )}
      {selected && (
        <UserRecords id={selected} close={() => setSelected(null)} />
      )}
    </>
  );
}
function UserRecords({ id, close }: { id: string; close: () => void }) {
  const [records, setRecords] = useState<Row[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api("admin/users/" + id)
      .then((data) => setRecords(data.records ?? []))
      .catch((e) => setError(e.message));
  }, [id]);
  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={close}>
          ×
        </button>
        <h2>用户详情 · {id}</h2>
        {error && <p className="form-error">{error}</p>}
        <DataTable
          rows={records}
          columns={{
            game_id: "游戏",
            stake: "消耗",
            reward: "奖励",
            created_at: "时间",
            result: "结果",
          }}
        />
      </div>
    </div>
  );
}
function ImageProcessor({ notify }: { notify: (s: string) => void }) {
  const [preview, setPreview] = useState(""),
    [source, setSource] = useState<File | null>(null),
    [ratio, setRatio] = useState("4:3");
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function process() {
    if (!source) return;
    try {
      const bitmap = await createImageBitmap(source),
        [a, b] = ratio.split(":").map(Number),
        target = a / b;
      let sw = bitmap.width,
        sh = bitmap.height;
      if (sw / sh > target) sw = sh * target;
      else sh = sw / target;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(1920, sw);
      canvas.height = Math.round(canvas.width / target);
      canvas
        .getContext("2d")!
        .drawImage(
          bitmap,
          (bitmap.width - sw) / 2,
          (bitmap.height - sh) / 2,
          sw,
          sh,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.85),
      );
      bitmap.close();
      if (!blob) throw new Error("处理失败");
      setPreview(URL.createObjectURL(blob));
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = source.name.replace(/\.[^.]+$/, "") + "-cropped.webp";
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      notify("已裁切并压缩为WebP，请通过上方上传保存到R2");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <details className="image-processor">
      <summary>图片居中裁切与压缩工具</summary>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => setSource(e.target.files?.[0] ?? null)}
      />
      <select
        aria-label="图片裁切比例"
        value={ratio}
        onChange={(e) => setRatio(e.target.value)}
      >
        <option>4:3</option>
        <option>16:9</option>
        <option>1:1</option>
        <option>12:5</option>
      </select>
      <button
        className="outline"
        disabled={!source}
        onClick={() => void process()}
      >
        裁切、压缩并下载
      </button>
      {preview && <img src={preview} alt="裁切后预览" />}
    </details>
  );
}
