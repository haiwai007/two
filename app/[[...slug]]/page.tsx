import Platform from "../../components/Platform";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
const pages = new Set([
  "",
  "games",
  "games/slots",
  "search",
  "login",
  "register",
  "profile",
  "profile/favorites",
  "profile/history",
  "profile/records",
  "profile/points",
  "profile/security",
  "leaderboard",
  "events",
  "announcements",
  "messages",
  "download",
  "admin",
  "admin/games",
  "admin/categories",
  "admin/assets",
  "admin/integrations",
  "admin/users",
  "admin/events",
  "admin/announcements",
  "admin/messages",
  "admin/statistics",
  "admin/settings",
  "admin/admins",
]);
export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const segments = (await params).slug ?? [],
    path = segments.join("/");
  const dynamicGame =
    segments.length === 2 &&
    ["game", "play"].includes(segments[0]) &&
    /^[a-z0-9-]{1,100}$/.test(segments[1]);
  const category =
    segments.length === 3 &&
    segments[0] === "games" &&
    segments[1] === "category" &&
    /^[a-z0-9-]{1,100}$/.test(segments[2]);
  if (!pages.has(path) && !dynamicGame && !category) notFound();
  return <Platform />;
}
