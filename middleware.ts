import { NextRequest, NextResponse } from "next/server";
import { canonicalLocation } from "./lib/canonical";
export function middleware(request: NextRequest) {
  const target = canonicalLocation(request.url, request.headers.get("host"));
  return target ? NextResponse.redirect(target, 301) : NextResponse.next();
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
