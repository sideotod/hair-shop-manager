import { describe, expect, it } from "vitest";

import {
  createOwnerSessionToken,
  hashOwnerPassword,
  isValidOwnerSession,
  verifyOwnerPassword,
} from "./auth";

describe("owner authentication", () => {
  it("verifies the seeded owner password with scrypt and rejects wrong or malformed hashes", () => {
    const storedHash = hashOwnerPassword("hairhaeyo", "00112233445566778899aabbccddeeff");

    expect(verifyOwnerPassword("hairhaeyo", storedHash)).toBe(true);
    expect(verifyOwnerPassword("wrong-password", storedHash)).toBe(false);
    expect(verifyOwnerPassword("hairhaeyo", "invalid-hash")).toBe(false);
  });

  it("accepts a current signed owner session and rejects tampered or expired sessions", () => {
    const now = Date.parse("2026-07-31T03:00:00.000Z");
    const token = createOwnerSessionToken(now + 60_000);
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    expect(isValidOwnerSession(token, now)).toBe(true);
    expect(isValidOwnerSession(tampered, now)).toBe(false);
    expect(isValidOwnerSession(token, now + 60_001)).toBe(false);
    expect(isValidOwnerSession(undefined, now)).toBe(false);
  });
});
