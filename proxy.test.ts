import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { createOwnerSessionToken, OWNER_SESSION_COOKIE } from "./lib/auth";
import { isPublicPath, proxy } from "./proxy";

const demoEnv = { HAIRHAEYO_DEMO_MODE: "1" } as const;

describe("owner shell proxy", () => {
  beforeEach(() => vi.stubEnv("HAIRHAEYO_DEMO_MODE", "1"));
  afterEach(() => vi.unstubAllEnvs());

  it("exposes only the exact login and framework asset paths", () => {
    for (const pathname of [
      "/login",
      "/_next/static/chunks/app.js",
      "/_next/image/asset",
      "/favicon.ico",
      "/icon.svg",
      "/robots.txt",
      "/sitemap.xml",
    ]) expect(isPublicPath(pathname), pathname).toBe(true);

    for (const pathname of [
      "/",
      "/login/help",
      "/_next/static",
      "/reports/2026.07.31",
      "/customers/export.csv",
      "/unknown.svg",
    ]) expect(isPublicPath(pathname), pathname).toBe(false);
  });

  it("redirects protected requests, including dotted app paths, to login with the full next path", () => {
    const response = proxy(new NextRequest("http://localhost/reports/2026.07.31?view=day"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login?next=%2Freports%2F2026.07.31%3Fview%3Dday");
  });

  it("passes public paths and a protected request with a valid owner session", () => {
    const publicResponse = proxy(new NextRequest("http://localhost/icon.svg"));
    const token = createOwnerSessionToken(Date.now() + 60_000, demoEnv);
    const authenticatedResponse = proxy(new NextRequest("http://localhost/customers", {
      headers: { cookie: `${OWNER_SESSION_COOKIE}=${token}` },
    }));

    expect(publicResponse.headers.get("x-middleware-next")).toBe("1");
    expect(authenticatedResponse.headers.get("x-middleware-next")).toBe("1");
  });
});
