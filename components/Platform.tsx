"use client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  House,
  Gamepad2,
  Flame,
  Sparkles,
  Heart,
  Trophy,
  Gift,
  Bell,
  ChevronRight,
  ArrowUpRight,
  UserRound,
  LogOut,
  Shield,
  Menu,
  X,
  Coins,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  Star,
  LayoutDashboard,
} from "lucide-react";
import initialCatalog from "../lib/catalog.json";
import { formatTimestamp } from "../lib/time";
import GamePlayer from "./GamePlayer";
import Admin from "./Admin";
export type Game = (typeof initialCatalog)[number];
type Member = {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role?: string;
  balance: number;
};
export async function api<T = any>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch("/api/" + path, {
    keepalive: method !== "GET" && path.startsWith("favorites/"),
    method,
    headers: method === "GET" ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "服务暂不可用");
  return result;
}
export function Cover({
  game,
  banner = false,
}: {
  game: Game;
  banner?: boolean;
}) {
  const id = banner ? game.banner_asset_id : game.cover_asset_id;
  return (
    <img
      src={id ? "/api/assets/" + id : "/assets/" + game.slug + ".svg"}
      onError={(e) => {
        const fallback =
          "/optimized/" + game.slug + (banner ? "-banner" : "-cover") + ".webp";
        if (!e.currentTarget.src.endsWith(fallback))
          e.currentTarget.src = fallback;
      }}
      alt={game.name}
      loading="lazy"
    />
  );
}
const mainNav = [
  { href: "/", label: "探索首页", icon: House },
  { href: "/games", label: "游戏大厅", icon: Gamepad2 },
  { href: "/games?sort=hot", label: "热门精选", icon: Flame },
  { href: "/profile/favorites", label: "我的收藏", icon: Heart },
];
const moreNav = [
  { href: "/leaderboard", label: "积分排行榜", icon: Trophy },
  { href: "/events", label: "活动中心", icon: Gift },
  { href: "/announcements", label: "公告中心", icon: Bell },
];
export default function Platform() {
  const path = usePathname() ?? "/",
    router = useRouter(),
    searchParams = useSearchParams(),
    sortQuery = searchParams.get("sort");
  const [games, setGames] = useState<Game[]>(initialCatalog),
    [categories, setCategories] = useState<
      { id: string; slug: string; name: string; icon?: string }[]
    >([{ id: "slots", slug: "slots", name: "老虎机电子游戏" }]),
    [user, setUser] = useState<Member | null>(null),
    [connected, setConnected] = useState(false),
    [catalogLoaded, setCatalogLoaded] = useState(false),
    [loaded, setLoaded] = useState(false),
    [toast, setToast] = useState(""),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("recommended"),
    [visibleCount, setVisibleCount] = useState(18),
    [filter, setFilter] = useState("all"),
    [favorites, setFavorites] = useState<string[]>([]),
    [savingFavorites, setSavingFavorites] = useState<string[]>([]),
    [siteSettings, setSiteSettings] = useState<Record<string, string>>({}),
    [homeEvents, setHomeEvents] = useState<Record<string, unknown>[]>([]),
    [announcement, setAnnouncement] = useState(
      "30款原创 HTML5 演示开放体验，探索各不相同的玩法。",
    );
  const notify = useCallback((message: string) => setToast(message), []);
  const refresh = useCallback(async () => {
    try {
      const data = await api("auth/me");
      setUser(data.user);
      if (data.user) {
        const f = await api("favorites");
        setFavorites(f.games.map((g: Game) => g.id));
      }
    } catch {
      setUser(null);
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    api("site")
      .then((data) => {
        setSiteSettings(
          Object.fromEntries(
            data.settings.map((v: { key: string; value: string }) => [
              v.key,
              v.value,
            ]),
          ),
        );
        setHomeEvents(data.events ?? []);
        if (data.announcements[0]) setAnnouncement(data.announcements[0].title);
      })
      .catch(() => {});
    void refresh();
    api("games")
      .then((data) => {
        setGames(data.games);
        setCategories(data.categories);
        setConnected(true);
      })
      .catch(() => setConnected(false))
      .finally(() => setCatalogLoaded(true));
  }, [refresh]);
  useEffect(() => {
    setMobile(false);
    setQuery("");
    if (typeof window !== "undefined")
      setSort(
        new URLSearchParams(window.location.search).get("sort") ??
          "recommended",
      );
  }, [path, sortQuery]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  const toggleFavorite = async (game: Game) => {
    if (!user) {
      notify("登录后可以收藏游戏");
      router.push("/login");
      return;
    }
    if (savingFavorites.includes(game.id)) return;
    const wasSaved = favorites.includes(game.id);
    setSavingFavorites((prev) => [...prev, game.id]);
    try {
      await api("favorites/" + game.id, wasSaved ? "DELETE" : "POST");
      setFavorites((prev) =>
        wasSaved
          ? prev.filter((id) => id !== game.id)
          : prev.includes(game.id)
            ? prev
            : [...prev, game.id],
      );
      notify(wasSaved ? "已取消收藏" : "已收藏");
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setSavingFavorites((prev) => prev.filter((id) => id !== game.id));
    }
  };
  const gameId = path.split("/")[2],
    selected = games.find((g) => g.id === gameId),
    isHome = path === "/",
    isLobby =
      ["/games", "/games/slots", "/search"].includes(path) ||
      path.startsWith("/games/category/");
  const categorySlug = path.startsWith("/games/category/")
    ? path.split("/")[3]
    : path === "/games/slots"
      ? "slots"
      : null;
  const filtered = useMemo(
    () =>
      games
        .filter(
          (g) =>
            (!categorySlug ||
              g.category_id ===
                categories.find((c) => c.slug === categorySlug)?.id) &&
            (g.name + g.slug).toLowerCase().includes(query.toLowerCase()) &&
            (filter !== "playable" || g.status === "published"),
        )
        .sort((a, b) =>
          sort === "hot"
            ? b.hot - a.hot
            : sort === "new"
              ? b.sort - a.sort
              : b.featured - a.featured || a.sort - b.sort,
        ),
    [games, query, sort, filter, categorySlug, categories],
  );
  const cards = (items: Game[]) => (
    <div className="game-grid">
      {items.map((game) => (
        <article className="game-card" key={game.id}>
          <Link className="game-art" href={"/game/" + game.id}>
            <Cover game={game} />
            <span
              className={
                "game-tag " + (game.status === "published" ? "live" : "")
              }
            >
              {game.status === "published" ? "可玩 · 原创" : "筹备中"}
            </span>
            <span className="card-play">
              <Gamepad2 size={23} />
              探索游戏
            </span>
          </Link>
          <button
            className={
              "favorite " + (favorites.includes(game.id) ? "saved" : "")
            }
            aria-label={"收藏" + game.name}
            disabled={savingFavorites.includes(game.id)}
            aria-busy={savingFavorites.includes(game.id)}
            onClick={() => void toggleFavorite(game)}
          >
            <Heart
              size={15}
              fill={favorites.includes(game.id) ? "currentColor" : "none"}
            />
          </button>
          <div className="game-caption">
            <Link href={"/game/" + game.id}>
              <h3>{game.name}</h3>
            </Link>
            <span>
              {game.status === "published"
                ? "ORIGINAL · 原创演示"
                : "COMING SOON"}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
  return (
    <div
      className="app-shell"
      style={
        siteSettings.theme_color
          ? ({ "--gold": siteSettings.theme_color } as React.CSSProperties)
          : undefined
      }
    >
      <aside className={"sidebar " + (mobile ? "opened" : "")}>
        <Link href="/" className="brand">
          <div className="brand-mark">
            {siteSettings.logo_asset_id ? (
              <img
                src={"/api/assets/" + siteSettings.logo_asset_id}
                alt="网站Logo"
              />
            ) : (
              <>
                A<span>✦</span>
              </>
            )}
          </div>
          <div>
            {siteSettings.site_name ?? "AURUM"}
            <small>星 曜 游 戏</small>
          </div>
        </Link>
        <button
          className="sidebar-close icon-button"
          aria-label="关闭导航"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="nav-label">发现精彩</div>
        <nav>
          {mainNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              className={
                path === href.split("?")[0] && href !== "/games?sort=hot"
                  ? "active"
                  : ""
              }
              href={href}
            >
              <Icon size={19} />
              {label}
              {href === "/games" && <small>{games.length}</small>}
            </Link>
          ))}
        </nav>
        <div className="nav-label second">更多探索</div>
        <nav>
          {moreNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              className={path === href ? "active" : ""}
              href={href}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note">
            <Shield size={23} />
            <strong>专注原创 · 自主开发</strong>
            <p>每一个世界，都有独特的故事</p>
            <span>HTML5 / 自有引擎与服务端</span>
          </div>
          <div className="side-footer">
            <span className="status-dot" />
            仅虚拟积分体验<small>© 2026 AURUM</small>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="关闭菜单"
          onClick={() => setMobile(false)}
        />
      )}
      <div
        className="workspace"
        style={
          siteSettings.background_asset_id
            ? {
                backgroundImage: `linear-gradient(#090b14de,#090b14f5),url(/api/assets/${siteSettings.background_asset_id})`,
                backgroundSize: "cover",
                backgroundAttachment: "fixed",
              }
            : undefined
        }
      >
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu icon-button"
              aria-label="导航菜单"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              星曜游戏 <ChevronRight size={13} />
              <b>
                {isHome
                  ? "发现你的下一个精彩"
                  : isLobby
                    ? "游戏大厅"
                    : path.startsWith("/admin")
                      ? "管理控制台"
                      : "探索更多"}
              </b>
            </span>
          </div>
          <div className="header-actions">
            <Link className="icon-button" href="/search" aria-label="搜索游戏">
              <Search size={19} />
            </Link>
            <Link
              className="icon-button"
              href="/messages"
              aria-label="消息中心"
            >
              <Bell size={19} />
            </Link>
            <span className="header-divider" />
            {user ? (
              <>
                <Link href="/profile/points" className="balance">
                  <Coins size={16} />
                  {user.balance.toLocaleString()}
                </Link>
                <Link href="/profile" className="user-link">
                  <UserRound size={18} />
                  {user.username}
                </Link>
                {user.role && (
                  <Link
                    className="icon-button"
                    href="/admin"
                    aria-label="后台管理"
                  >
                    <LayoutDashboard size={18} />
                  </Link>
                )}
                <button
                  className="icon-button"
                  aria-label="退出登录"
                  onClick={() =>
                    void api("auth/logout", "POST", {})
                      .then(() => {
                        setUser(null);
                        setFavorites([]);
                        router.push("/");
                      })
                      .catch((e) => notify(e.message))
                  }
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <>
                <Link className="text-button" href="/login">
                  登录
                </Link>
                <Link className="gold small" href="/register">
                  免费注册
                  <ArrowUpRight size={14} />
                </Link>
              </>
            )}
          </div>
        </header>
        <main
          className={
            path.startsWith("/play/")
              ? "main-content game-content"
              : "main-content"
          }
        >
          {!connected && loaded && (
            <div className="service-banner">
              开发预览：业务 API
              暂不可用，当前展示本地游戏目录。登录、游戏与后台需连接 D1 后使用。
            </div>
          )}
          {(isHome || isLobby) && (
            <>
              {isHome && (
                <>
                  <section className="hero">
                    <img
                      className="hero-image"
                      src={
                        siteSettings.banner_asset_id
                          ? "/api/assets/" + siteSettings.banner_asset_id
                          : "/optimized/hero-ai.webp"
                      }
                      alt="首页推荐横幅"
                    />
                    <div className="hero-shade" />
                    <div className="hero-copy">
                      <div className="eyebrow">
                        <span />A NEW WORLD OF PLAY
                      </div>
                      <h1>
                        非凡世界
                        <br />
                        由你<span>开启。</span>
                      </h1>
                      <p>
                        沉浸原创幻想，探索每一次未知。
                        <br />
                        你的下一场精彩，现在开始。
                      </p>
                      <Link className="gold hero-cta" href="/games">
                        探索游戏大厅
                        <ArrowRight size={17} />
                      </Link>
                      <div className="hero-meta">
                        <span>01</span>
                        <div />
                        <small>原创世界 · 无限可能</small>
                      </div>
                    </div>
                    <div className="hero-caption">
                      <span>本期推荐</span>
                      <strong>龙腾四海</strong>
                      <small>原创东方奇幻 · 243 路玩法</small>
                    </div>
                    <span className="art-note">AI 原创临时美术</span>
                  </section>
                  <div className="announcement-strip">
                    <Bell size={16} />
                    <b>星曜公告</b>
                    <span>{announcement}</span>
                    <Link href="/announcements">
                      查看公告
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </>
              )}
              <section className="catalog-section">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow muted">CURATED FOR YOU</div>
                    <h2>
                      {isHome ? "发现心动好游戏" : "游戏大厅"}
                      <span>{games.length} 款精选</span>
                    </h2>
                  </div>
                  <div className="catalog-search">
                    <Search size={17} />
                    <input
                      aria-label="搜索游戏"
                      placeholder="搜索你喜欢的游戏"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        aria-label="清空搜索"
                        onClick={() => setQuery("")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="filter-row">
                  <div className="category-tabs">
                    <button
                      className={filter === "all" ? "selected" : ""}
                      onClick={() => setFilter("all")}
                    >
                      <Gamepad2 size={16} />
                      全部游戏
                    </button>
                    <button
                      className={filter === "playable" ? "selected" : ""}
                      onClick={() => setFilter("playable")}
                    >
                      <Sparkles size={16} />
                      即刻畅玩
                      <span>
                        {games.filter((g) => g.status === "published").length}
                      </span>
                    </button>
                    {categories.map((c) => (
                      <Link
                        className={
                          categorySlug === c.slug
                            ? "category-link selected"
                            : "category-link"
                        }
                        href={"/games/category/" + c.slug}
                        key={c.id}
                      >
                        {c.icon && (
                          <img
                            className="category-icon"
                            src={"/api/assets/" + c.icon}
                            alt=""
                          />
                        )}
                        {c.name}
                      </Link>
                    ))}
                  </div>
                  <label className="sort-select">
                    <SlidersHorizontal size={14} />
                    <select
                      aria-label="游戏排序"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="recommended">推荐排序</option>
                      <option value="hot">热门排序</option>
                      <option value="new">最新排序</option>
                    </select>
                  </label>
                </div>
                {filtered.length ? (
                  cards(filtered.slice(0, isHome ? 12 : visibleCount))
                ) : (
                  <Empty text="没有找到匹配的游戏，试试其他关键词。" />
                )}
                {!isHome && filtered.length > visibleCount && (
                  <button
                    className="view-all"
                    onClick={() => setVisibleCount((n) => n + 18)}
                  >
                    加载更多 · 已显示{visibleCount}/{filtered.length}
                  </button>
                )}
                {isHome && (
                  <Link className="view-all" href="/games">
                    发现全部 {games.length} 款游戏
                    <ArrowRight size={16} />
                  </Link>
                )}
              </section>
              {isHome && homeEvents.length > 0 && (
                <section className="home-events">
                  <div className="section-heading">
                    <h2>探索更多精彩</h2>
                    <Link href="/events">活动中心 →</Link>
                  </div>
                  <div className="events-grid">
                    {homeEvents.map((event) => (
                      <Link key={String(event.id)} href="/events">
                        <img
                          src={"/api/assets/" + event.asset_id}
                          alt={String(event.title)}
                        />
                        <div>
                          <h3>{String(event.title)}</h3>
                          <p>{String(event.content)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              {isHome && (
                <section className="features-row">
                  <div>
                    <Shield />
                    <h3>自主开发</h3>
                    <p>独立规则，自有游戏服务</p>
                  </div>
                  <div>
                    <Sparkles />
                    <h3>多元玩法</h3>
                    <p>五线 · 243 路 · 集群连消</p>
                  </div>
                  <div>
                    <Gamepad2 />
                    <h3>随时畅玩</h3>
                    <p>适配手机、平板与电脑</p>
                  </div>
                </section>
              )}
            </>
          )}
          {path.startsWith("/game/") &&
            (selected ? (
              <>
                <Link className="back-link" href="/games">
                  ← 返回游戏大厅
                </Link>
                <section className="detail">
                  <div className="detail-art">
                    <Cover game={selected} banner />
                    <span className="game-tag live">
                      {selected.status === "published"
                        ? "原创演示"
                        : "开发筹备中"}
                    </span>
                  </div>
                  <div className="detail-copy">
                    <div className="eyebrow">AURUM ORIGINALS</div>
                    <h1>{selected.name}</h1>
                    <p>{selected.description}</p>
                    <div className="detail-badges">
                      <span>HTML5</span>
                      <span>老虎机电子游戏</span>
                      <span>v{selected.version}</span>
                    </div>
                    {selected.status === "published" ? (
                      <Link className="gold" href={"/play/" + selected.id}>
                        开始游戏
                        <ArrowRight size={18} />
                      </Link>
                    ) : (
                      <p className="notice">玩法与美术正在筹备，暂未开放。</p>
                    )}
                    <button
                      className="outline"
                      onClick={() => void toggleFavorite(selected)}
                    >
                      <Heart size={17} />
                      {favorites.includes(selected.id)
                        ? "取消收藏"
                        : "收藏游戏"}
                    </button>
                    <p className="disclaimer">仅虚拟积分 · 无现金价值</p>
                  </div>
                </section>
                <section className="panel">
                  <h2>玩法介绍</h2>
                  <p>{selected.rules}</p>
                  <p>
                    本项目为原创演示。授权游戏的正式素材、界面及规则参数待提供和核验。
                  </p>
                </section>
                <div className="section-heading">
                  <h2>继续探索</h2>
                  <Link href="/games">全部游戏 →</Link>
                </div>
                {cards(games.filter((g) => g.id !== selected.id).slice(0, 6))}
              </>
            ) : (
              <Empty text="游戏不存在" />
            ))}
          {path.startsWith("/play/") &&
            (selected?.status === "published" && loaded && catalogLoaded ? (
              <GamePlayer
                key={selected.id + ":" + (user?.id ?? "guest")}
                id={selected.id}
                name={selected.name}
                rules={selected.rules}
                backgroundAssetId={selected.banner_asset_id}
                balance={user?.balance ?? null}
                userId={user?.id}
                onBalance={(n) =>
                  setUser((prev) =>
                    prev && prev.id === user?.id
                      ? { ...prev, balance: n }
                      : prev,
                  )
                }
                notify={notify}
              />
            ) : (
              <Empty
                text={
                  selected?.status === "published"
                    ? "正在加载会员与游戏配置…"
                    : "这款游戏尚未开放，请返回大厅选择可玩的原创演示。"
                }
              />
            ))}
          {(path === "/login" || path === "/register") && (
            <Auth
              bannerAssetId={siteSettings.banner_asset_id}
              register={path === "/register"}
              onSuccess={async () => {
                await refresh();
                router.push("/profile");
              }}
              notify={notify}
            />
          )}
          {path.startsWith("/profile") &&
            (user ? (
              <Profile
                path={path}
                user={user}
                notify={notify}
                refresh={refresh}
              />
            ) : (
              <Empty
                text={loaded ? "登录后查看你的个人中心" : "正在检查登录状态…"}
                action={
                  <Link className="gold" href="/login">
                    前往登录
                  </Link>
                }
              />
            ))}
          {["/leaderboard", "/events", "/announcements", "/messages"].includes(
            path,
          ) && <ContentPage path={path} notify={notify} />}
          {path === "/download" && (
            <Empty
              text="目前没有发布官方安装包，请直接通过浏览器体验。"
              action={
                <Link href="/games" className="gold">
                  进入游戏大厅
                </Link>
              }
            />
          )}
          {path.startsWith("/admin") && (
            <Admin path={path} user={user} notify={notify} />
          )}
          {!isHome &&
            !isLobby &&
            ![
              "/login",
              "/register",
              "/download",
              "/leaderboard",
              "/events",
              "/announcements",
              "/messages",
            ].includes(path) &&
            !["/game/", "/play/", "/profile", "/admin"].some((prefix) =>
              path.startsWith(prefix),
            ) && (
              <Empty
                text="页面不存在"
                action={
                  <Link href="/" className="gold">
                    返回首页
                  </Link>
                }
              />
            )}
        </main>
        <footer className="footer">
          <div>
            <span className="footer-brand">AURUM</span>
            <span>原创世界，非凡体验。</span>
          </div>
          <p>
            仅提供虚拟积分体验 · 无充值、提现或现金兑换 · 原创演示非授权原版复刻
          </p>
          <small>© 2026 AURUM 星曜游戏 · 所有素材状态以资源清单为准</small>
        </footer>
      </div>
      <nav className="mobile-bottom">
        {[
          { href: "/", label: "首页", icon: House },
          { href: "/games", label: "游戏", icon: Gamepad2 },
          { href: "/profile/favorites", label: "收藏", icon: Heart },
          { href: "/profile", label: "我的", icon: UserRound },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={path === href ? "active" : ""}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            className="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {toast}
            <button aria-label="关闭通知" onClick={() => setToast("")}>
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export function Empty({
  text,
  action,
}: {
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Gamepad2 size={38} />
      <p>{text}</p>
      {action}
    </div>
  );
}
function Auth({
  bannerAssetId,
  register,
  onSuccess,
  notify,
}: {
  bannerAssetId?: string;
  register: boolean;
  onSuccess: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const widgetRef = useRef<string | undefined>(undefined);
  const [challenge, setChallenge] = useState<"loading" | "disabled" | "pending" | "ready" | "error">("loading");
  const [challengeRetry, setChallengeRetry] = useState(0);
  const [busy, setBusy] = useState(false),
    [token, setToken] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let widget: string | undefined;
    let cancelled = false;
    const el = document.getElementById("auth-turnstile-widget");
    setToken("");
    setChallenge("loading");
    setError("");
    api("config")
      .then((config) => {
        if (cancelled) return;
        if (!config.requireTurnstile) { setChallenge("disabled"); return; }
        setChallenge("pending");
        if (!config.turnstileSiteKey) {
          setChallenge("error");
          setError("尚未配置人机验证，注册和登录暂不可用。");
          return;
        }
        const render = () => {
          if (cancelled || !el) return;
          const w = window as unknown as {
            turnstile: {
              render: (el: HTMLElement, options: unknown) => string;
              remove: (id: string) => void;
            };
          };
          widget = w.turnstile.render(el, {
            sitekey: config.turnstileSiteKey,
            theme: "dark",
            callback: (value: string) => {
              if (cancelled) return;
              setToken(value); setChallenge(value ? "ready" : "pending");
              setError(current => ["请先完成人机验证", "人机验证已过期，请", "人机验证加载", "人机验证超时", "当前域名未获"].some(prefix => current.startsWith(prefix)) ? "" : current);
            },
            "expired-callback": () => {
              if (cancelled) return;
              setToken(""); setChallenge("pending"); setError("人机验证已过期，请重新完成验证");
            },
            "error-callback": (code: string) => {
              if (cancelled) return;
              setToken(""); setChallenge("error");
              setError(code === "110200" ? "当前域名未获人机验证授权，请联系管理员（110200）" : "人机验证加载或执行失败，请点击重试" + (/^[0-9]{3,6}$/.test(String(code)) ? `（${code}）` : ""));
            },
            "timeout-callback": () => {
              if (cancelled) return;
              setToken(""); setChallenge("error"); setError("人机验证超时，请点击重试");
            },
          });
          widgetRef.current = widget;
        };
        if (typeof (window as unknown as { turnstile?: { render?: unknown } }).turnstile?.render === "function") render();
        else {
          const script = document.createElement("script");
          script.src =
            "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
          script.async = true;
          script.onload = render;
          script.onerror = () => { if (!cancelled) { setChallenge("error"); setError("人机验证加载失败，请点击重试"); } };
          document.head.appendChild(script);
        }
      })
      .catch(() => { if (!cancelled) { setChallenge("error"); setError("业务服务暂不可用，请稍后重试"); } });
    return () => {
      cancelled = true;
      widgetRef.current = undefined;
      if (widget !== undefined)
        (
          window as unknown as { turnstile?: { remove: (id: string) => void } }
        ).turnstile?.remove(widget);
    };
  }, [register, challengeRetry]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    if (register && form.get("password") !== form.get("confirm")) {
      setError("两次密码不一致");
      return;
    }
    if (challenge !== "disabled" && (challenge !== "ready" || !token)) {
      setError("请先完成人机验证，再提交表单");
      return;
    }
    setBusy(true);
    try {
      await api("auth/" + (register ? "register" : "login"), "POST", {
        ...Object.fromEntries(form),
        agreement: form.get("agreement") === "on",
        turnstile: token,
      });
      await onSuccess();
      notify(register ? "注册成功，已获得10,000体验积分" : "欢迎回来");
    } catch (e) {
      setError((e as Error).message);
      setToken("");
      if (challenge !== "disabled") setChallenge("pending");
      const challengeApi = (window as unknown as { turnstile?: { reset: (id: string) => void } }).turnstile;
      if (widgetRef.current !== undefined) challengeApi?.reset(widgetRef.current);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-layout">
      <div className="auth-art">
        <img
          src={
            bannerAssetId
              ? "/api/assets/" + bannerAssetId
              : "/optimized/hero-ai.webp"
          }
          alt="原创金龙"
        />
        <div>
          <div className="eyebrow">YOUR NEXT ADVENTURE</div>
          <h1>
            每一次探索
            <br />
            都值得期待。
          </h1>
          <p>加入星曜，开启你的原创游戏旅程。</p>
        </div>
      </div>
      <div className="auth-form">
        <span className="eyebrow">WELCOME TO AURUM</span>
        <h1>{register ? "创建你的账号" : "欢迎回来"}</h1>
        <p>
          {register ? "注册即获 10,000 虚拟体验积分" : "登录，继续你的精彩故事"}
        </p>
        <form onSubmit={submit}>
          {register ? (
            <>
              <label>
                用户名
                <input
                  name="username"
                  required
                  minLength={3}
                  maxLength={32}
                  autoComplete="username"
                  placeholder="3–32位字母、文字或数字"
                />
              </label>
              <label>
                邮箱
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="输入邮箱地址"
                />
              </label>
            </>
          ) : (
            <label>
              用户名或邮箱
              <input
                name="identity"
                required
                autoComplete="username"
                placeholder="输入用户名或邮箱"
              />
            </label>
          )}
          <label>
            密码
            <input
              name="password"
              type="password"
              minLength={10}
              maxLength={128}
              required
              autoComplete={register ? "new-password" : "current-password"}
              placeholder="至少10位密码"
            />
          </label>
          {register && (
            <>
              <label>
                确认密码
                <input
                  name="confirm"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  placeholder="再次输入密码"
                />
              </label>
              <label className="checkbox">
                <input name="agreement" type="checkbox" required />
                我确认积分无现金价值，并同意仅用于原创游戏体验。
              </label>
            </>
          )}
          <div id="auth-turnstile-widget" />
          <p className="muted" role="status" aria-live="polite">
            {challenge === "loading" ? "正在加载人机验证…" : challenge === "pending" ? "请完成人机验证后提交" : challenge === "ready" ? "人机验证已完成" : ""}
          </p>
          {challenge === "error" && <button type="button" className="secondary full" onClick={() => setChallengeRetry(n => n + 1)}>重试人机验证</button>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="gold full" disabled={busy || !["disabled", "ready"].includes(challenge)}>
            {busy ? "正在处理…" : register ? "创建账号" : "登录账号"}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "已有账号？" : "还没有账号？"}
          <Link href={register ? "/login" : "/register"}>
            {register ? "立即登录" : "免费注册"}
          </Link>
        </p>
        <div className="secure-note">
          <Shield size={14} />
          安全会话 · 密码加密存储
        </div>
      </div>
    </section>
  );
}
function Profile({
  path,
  user,
  notify,
  refresh,
}: {
  path: string;
  user: Member;
  notify: (s: string) => void;
  refresh: () => Promise<void>;
}) {
  const [data, setData] = useState<{
      records: Record<string, unknown>[];
      points: Record<string, unknown>[];
      favorites: Game[];
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("profile")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [path]);
  const tabs = [
    ["/profile", "个人资料"],
    ["/profile/favorites", "收藏游戏"],
    ["/profile/history", "最近游戏"],
    ["/profile/records", "游戏记录"],
    ["/profile/points", "积分明细"],
    ["/profile/security", "账号安全"],
  ];
  return (
    <>
      <div className="profile-heading">
        <div className="avatar">
          {user.avatar ? (
            <img src={"/api/assets/" + user.avatar} alt="用户头像" />
          ) : (
            <UserRound size={34} />
          )}
        </div>
        <div>
          <span className="eyebrow">MY AURUM</span>
          <h1>{user.username}</h1>
          <p>ID · {user.id}</p>
        </div>
        <div className="points-summary">
          <small>可用虚拟积分</small>
          <strong>{user.balance.toLocaleString()}</strong>
        </div>
      </div>
      <div className="subnav">
        {tabs.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={path === href ? "selected" : ""}
          >
            {label}
          </Link>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      {path === "/profile" && (
        <section className="panel">
          <h2>个人资料</h2>
          {user.role && (
            <Link className="outline" href="/admin">
              管理控制台
            </Link>
          )}
          <p>邮箱：{user.email}</p>
          <label className="avatar-upload">
            上传头像（PNG/JPEG/WebP，最大2MB）
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.append("file", file);
                try {
                  const response = await fetch("/api/profile/avatar", {
                    method: "POST",
                    body: form,
                  });
                  const data = (await response.json()) as { error?: string };
                  if (!response.ok) throw new Error(data.error);
                  await refresh();
                  notify("头像已更新");
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            />
          </label>
          <form
            className="compact-form"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("profile", "PATCH", {
                  username: new FormData(e.currentTarget).get("username"),
                });
                await refresh();
                notify("个人资料已更新");
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <label>
              用户名
              <input
                name="username"
                defaultValue={user.username}
                required
                minLength={3}
                maxLength={32}
              />
            </label>
            <button className="gold">保存资料</button>
          </form>
        </section>
      )}
      {path === "/profile/security" && (
        <section className="panel">
          <h2>修改密码</h2>
          <form
            className="compact-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              if (form.get("password") !== form.get("confirm")) {
                notify("两次密码不一致");
                return;
              }
              try {
                await api("profile/security", "POST", Object.fromEntries(form));
                await refresh();
                notify("密码已更新，所有会话已退出，请重新登录");
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <label>
              当前密码
              <input
                name="oldPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              新密码
              <input
                name="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </label>
            <label>
              确认新密码
              <input
                name="confirm"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </label>
            <button className="gold">更新密码并退出所有会话</button>
          </form>
        </section>
      )}
      {path === "/profile/favorites" &&
        (data?.favorites.length ? (
          <div className="game-grid">
            {data.favorites.map((g) => (
              <article className="game-card" key={g.id}>
                <Link className="game-art" href={"/game/" + g.id}>
                  <Cover game={g} />
                </Link>
                <div className="game-caption">
                  <h3>{g.name}</h3>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty text="还没有收藏游戏，去大厅发现喜欢的游戏。" />
        ))}
      {["/profile/history", "/profile/records", "/profile/points"].includes(
        path,
      ) && (
        <DataTable
          rows={
            (path === "/profile/points"
              ? data?.points
              : path === "/profile/history"
                ? data?.records.filter(
                    (r, i, rows) =>
                      rows.findIndex((other) => other.game_id === r.game_id) ===
                      i,
                  )
                : data?.records) ?? []
          }
          columns={
            path === "/profile/points"
              ? {
                  created_at: "时间",
                  type: "类型",
                  delta: "积分变化",
                  before_balance: "原余额",
                  after_balance: "新余额",
                }
              : {
                  created_at: "时间",
                  game_name: "游戏",
                  stake: "消耗",
                  reward: "奖励",
                  id: "记录编号",
                }
          }
        />
      )}
      {path === "/profile/records" &&
        data?.records.map((record) => (
          <details className="record-detail" key={String(record.id)}>
            <summary>
              {String(record.game_name)} · 记录 {String(record.id)}
            </summary>
            <p>
              消耗：{String(record.stake)} / 奖励：{String(record.reward)} /
              净变化：{Number(record.reward) - Number(record.stake)}
            </p>
            <pre>{String(record.result)}</pre>
          </details>
        ))}
    </>
  );
}
export function DataTable({
  rows,
  columns,
}: {
  rows: Record<string, unknown>[];
  columns: Record<string, string>;
}) {
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {Object.values(columns).map((v) => (
              <th key={v}>{v}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.id ?? i)}>
              {Object.keys(columns).map((k) => (
                <td key={k}>
                  {k.endsWith("_at") && row[k]
                    ? formatTimestamp(row[k])
                    : typeof row[k] === "object"
                      ? JSON.stringify(row[k])
                      : String(row[k] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty text="暂无记录" />
  );
}
function ContentPage({
  path,
  notify,
}: {
  path: string;
  notify: (s: string) => void;
}) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    setItems([]);
    setError("");
    api(path.slice(1))
      .then((data) => setItems(data.items))
      .catch((e) => setError(e.message));
  }, [path]);
  const titles: Record<string, string> = {
    "/leaderboard": "积分排行榜",
    "/events": "活动中心",
    "/announcements": "公告中心",
    "/messages": "消息中心",
  };
  return (
    <>
      <div className="eyebrow">EXPLORE AURUM</div>
      <h1>{titles[path]}</h1>
      {error ? (
        <p className="form-error">{error}</p>
      ) : path === "/leaderboard" ? (
        <DataTable
          rows={items.map((r, i) => ({ rank: i + 1, ...r }))}
          columns={{ rank: "排名", username: "玩家", score: "累计游戏奖励" }}
        />
      ) : items.length ? (
        items.map((item) => (
          <article className="panel content-card" key={String(item.id)}>
            {Boolean(item.asset_id) && (
              <img
                src={"/api/assets/" + item.asset_id}
                alt={String(item.title)}
              />
            )}
            <h2>{String(item.title)}</h2>
            <p className="preserve-lines">{String(item.content)}</p>
            {Boolean(item.starts_at) && (
              <small>
                {formatTimestamp(item.starts_at)} —{" "}
                {item.ends_at ? formatTimestamp(item.ends_at) : "长期"}
              </small>
            )}
          </article>
        ))
      ) : (
        <Empty text="暂无已发布内容" />
      )}
    </>
  );
}
