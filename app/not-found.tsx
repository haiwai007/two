import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty" style={{ margin: "15vh auto", maxWidth: 600 }}>
      <span className="eyebrow">海盈国际</span>
      <h1>404 · 页面不存在</h1>
      <p>这个入口不可用，请返回游戏大厅继续探索。</p>
      <Link className="gold" href="/games">
        返回游戏大厅
      </Link>
    </main>
  );
}
