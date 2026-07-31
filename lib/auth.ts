import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

export const DEMO_OWNER_PASSWORD = "hairhaeyo";
export const OWNER_SESSION_COOKIE = "hairhaeyo-owner-session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const SESSION_SECRET = process.env.HAIRHAEYO_SESSION_SECRET ?? "hairhaeyo-local-owner-session";

export function hashOwnerPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyOwnerPassword(password: string, storedHash: string): boolean {
  const [algorithm, salt, expectedHex, extra] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex || extra || !/^[0-9a-f]+$/i.test(expectedHex)) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const SEEDED_OWNER_PASSWORD_HASH = hashOwnerPassword(DEMO_OWNER_PASSWORD, "hairhaeyo-owner-demo");

function sessionSignature(expiresAt: string) {
  return createHmac("sha256", SESSION_SECRET).update(expiresAt).digest("hex");
}

export function createOwnerSessionToken(expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000) {
  const expiry = String(expiresAt);
  return `${expiry}.${sessionSignature(expiry)}`;
}

export function isValidOwnerSession(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [expiry, signature, extra] = token.split(".");
  if (extra || !/^\d+$/.test(expiry ?? "") || !/^[0-9a-f]{64}$/i.test(signature ?? "") || Number(expiry) < now) return false;

  const expected = Buffer.from(sessionSignature(expiry), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createOwnerSession() {
  (await cookies()).set(OWNER_SESSION_COOKIE, createOwnerSessionToken(), {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearOwnerSession() {
  (await cookies()).delete(OWNER_SESSION_COOKIE);
}
