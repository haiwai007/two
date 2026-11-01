import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "AURUM 星曜 · 原创游戏",
  description: "独立开发的HTML5游戏与虚拟积分体验",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
