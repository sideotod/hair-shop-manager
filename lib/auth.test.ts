import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import LoginPage from "../app/login/page";
import {
  configuredOwnerPasswordHash,
  createOwnerSessionToken,
  hashOwnerPassword,
  isDemoMode,
  isValidOwnerSession,
  SEEDED_OWNER_PASSWORD_HASH,
  verifyOwnerPassword,
} from "./auth";

const productionSecret = "production-session-secret-at-least-32-characters";
const productionEnv = {
  HAIRHAEYO_OWNER_PASSWORD_HASH: hashOwnerPassword("production-password", "production-owner-salt"),
  HAIRHAEYO_SESSION_SECRET: productionSecret,
  NODE_ENV: "production",
} as const;

describe("owner authentication", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("verifies the seeded owner password with scrypt and rejects wrong or malformed hashes", () => {
    const storedHash = hashOwnerPassword("hairhaeyo", "00112233445566778899aabbccddeeff");

    expect(verifyOwnerPassword("hairhaeyo", storedHash)).toBe(true);
    expect(verifyOwnerPassword("wrong-password", storedHash)).toBe(false);
    expect(verifyOwnerPassword("hairhaeyo", "invalid-hash")).toBe(false);
  });

  it("accepts a current signed owner session and rejects tampered or expired sessions", () => {
    const now = Date.parse("2026-07-31T03:00:00.000Z");
    const token = createOwnerSessionToken(now + 60_000, productionEnv);
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    const forged = createOwnerSessionToken(now + 60_000, {
      ...productionEnv,
      HAIRHAEYO_SESSION_SECRET: "different-production-secret-at-least-32-characters",
    });

    expect(isValidOwnerSession(token, now, productionEnv)).toBe(true);
    expect(isValidOwnerSession(tampered, now, productionEnv)).toBe(false);
    expect(isValidOwnerSession(forged, now, productionEnv)).toBe(false);
    expect(isValidOwnerSession(token, now + 60_001, productionEnv)).toBe(false);
    expect(isValidOwnerSession(undefined, now, productionEnv)).toBe(false);
  });

  it("enables seeded credentials only when demo mode is explicitly enabled", () => {
    expect(isDemoMode({ HAIRHAEYO_DEMO_MODE: "1" })).toBe(true);
    expect(isDemoMode({ HAIRHAEYO_DEMO_MODE: "0" })).toBe(false);
    expect(configuredOwnerPasswordHash({ HAIRHAEYO_DEMO_MODE: "1" })).toBe(SEEDED_OWNER_PASSWORD_HASH);
    expect(configuredOwnerPasswordHash(productionEnv)).toBe(productionEnv.HAIRHAEYO_OWNER_PASSWORD_HASH);
    expect(() => configuredOwnerPasswordHash({ NODE_ENV: "production" })).toThrow(/HAIRHAEYO_OWNER_PASSWORD_HASH/);
  });

  it("requires the configured owner password hash in production even when demo mode is flagged", () => {
    const productionDemoEnv = { ...productionEnv, HAIRHAEYO_DEMO_MODE: "1" } as const;

    expect(() => configuredOwnerPasswordHash({ HAIRHAEYO_DEMO_MODE: "1", NODE_ENV: "production" })).toThrow(/HAIRHAEYO_OWNER_PASSWORD_HASH/);
    expect(configuredOwnerPasswordHash(productionDemoEnv)).toBe(productionEnv.HAIRHAEYO_OWNER_PASSWORD_HASH);
  });

  it("shows the seeded password on the login page only in demo mode", async () => {
    vi.stubEnv("HAIRHAEYO_DEMO_MODE", "1");
    const demoHtml = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));
    vi.stubEnv("HAIRHAEYO_DEMO_MODE", "0");
    const productionHtml = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(demoHtml).toContain("로컬 데모 원장 비밀번호");
    expect(demoHtml).toContain("hairhaeyo");
    expect(productionHtml).not.toContain("로컬 데모 원장 비밀번호");
    expect(productionHtml).not.toContain("hairhaeyo</strong>");
  });

  it("requires a safe production session secret and fails closed when it is unavailable", () => {
    const now = Date.parse("2026-07-31T03:00:00.000Z");

    expect(() => createOwnerSessionToken(now + 60_000, { NODE_ENV: "production" })).toThrow(/HAIRHAEYO_SESSION_SECRET/);
    expect(() => createOwnerSessionToken(now + 60_000, { HAIRHAEYO_SESSION_SECRET: "too-short", NODE_ENV: "production" })).toThrow(/32/);
    expect(isValidOwnerSession("123.invalid", now, { NODE_ENV: "production" })).toBe(false);
    expect(isValidOwnerSession(createOwnerSessionToken(now + 60_000, productionEnv), now, { NODE_ENV: "production" })).toBe(false);
  });

  it("requires the configured session secret in production even when demo mode is flagged", () => {
    const now = Date.parse("2026-07-31T03:00:00.000Z");
    const productionDemoEnv = { ...productionEnv, HAIRHAEYO_DEMO_MODE: "1" } as const;

    expect(() => createOwnerSessionToken(now + 60_000, { HAIRHAEYO_DEMO_MODE: "1", NODE_ENV: "production" })).toThrow(/HAIRHAEYO_SESSION_SECRET/);
    expect(isValidOwnerSession(createOwnerSessionToken(now + 60_000, productionDemoEnv), now, productionDemoEnv)).toBe(true);
  });
});
