import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isValidOwnerSession, OWNER_SESSION_COOKIE } from "./lib/auth";

const publicFiles = new Set(["/favicon.ico", "/icon.svg", "/robots.txt", "/sitemap.xml"]);

export function isPublicPath(pathname: string): boolean {
  return pathname === "/login"
    || pathname === "/api/health"
    || pathname.startsWith("/_next/static/")
    || pathname.startsWith("/_next/image/")
    || publicFiles.has(pathname);
}

export function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();
  if (isValidOwnerSession(request.cookies.get(OWNER_SESSION_COOKIE)?.value)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/:path*"],
};
