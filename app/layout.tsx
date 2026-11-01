import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "海盈国际 · 游戏平台",
  description: "海盈国际，精彩游戏与虚拟积分体验",
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
