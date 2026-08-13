import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import LoginPage from "../app/login/page";
import {
  createOwnerSessionToken,
  hashOwnerPassword,
  isDemoMode,
  isValidOwnerSession,
  verifyOwnerPassword,
} from "./auth";
import { createSalonStore } from "./salon-store";

const productionSecret = "production-session-secret-at-least-32-characters";
const productionEnv = {
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

  it("keeps demo mode explicit and opt-in", () => {
    expect(isDemoMode({ HAIRHAEYO_DEMO_MODE: "1" })).toBe(true);
    expect(isDemoMode({ HAIRHAEYO_DEMO_MODE: "0" })).toBe(false);
    expect(isDemoMode({})).toBe(false);
  });

  it("asks for a new password until one is stored, then asks for the stored one", async () => {
    const directory = mkdtempSync(join(tmpdir(), "hairhaeyo-auth-"));
    const path = join(directory, "auth.sqlite");
    vi.stubEnv("HAIRHAEYO_DB_PATH", path);
    try {
      const firstRun = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));

      const store = createSalonStore(path);
      try { store.saveSettings({ ownerPasswordHash: hashOwnerPassword("owner-password", "owner-salt") }, "사용자"); } finally { store.close(); }
      const configured = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));

      expect(firstRun).toContain('name="newPassword"');
      expect(firstRun).toContain('name="confirmPassword"');
      expect(configured).toContain('name="password"');
      expect(configured).not.toContain('name="newPassword"');
      // 어떤 화면에서도 비밀번호나 해시가 마크업에 실려 나가지 않는다.
      expect(firstRun + configured).not.toContain("scrypt$");
      expect(firstRun + configured).not.toContain("owner-password");
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
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
