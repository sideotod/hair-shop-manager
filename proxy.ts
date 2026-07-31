import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isValidOwnerSession, OWNER_SESSION_COOKIE } from "./lib/auth";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login") return NextResponse.next();
  if (isValidOwnerSession(request.cookies.get(OWNER_SESSION_COOKIE)?.value)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
