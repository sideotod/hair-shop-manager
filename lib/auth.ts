import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

export const DEMO_OWNER_PASSWORD = "hairhaeyo";
export const OWNER_SESSION_COOKIE = "hairhaeyo-owner-session";
export type AuthEnvironment = Readonly<Record<string, string | undefined>>;

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const MIN_SESSION_SECRET_LENGTH = 32;
const DEMO_SESSION_SECRET = "hairhaeyo-explicit-demo-session-secret";
const TEST_SESSION_SECRET = "hairhaeyo-isolated-test-session-secret";

export function isDemoMode(env: AuthEnvironment = process.env) {
  return env.HAIRHAEYO_DEMO_MODE === "1";
}

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

export function configuredOwnerPasswordHash(env: AuthEnvironment = process.env) {
  if (env.NODE_ENV !== "production" && isDemoMode(env)) return SEEDED_OWNER_PASSWORD_HASH;
  const configured = env.HAIRHAEYO_OWNER_PASSWORD_HASH?.trim();
  if (!configured) throw new Error("HAIRHAEYO_OWNER_PASSWORD_HASH is required outside demo mode");
  if (!/^scrypt\$[^$]+\$[0-9a-f]+$/i.test(configured)) throw new Error("HAIRHAEYO_OWNER_PASSWORD_HASH must be a valid scrypt hash");
  return configured;
}

function configuredSessionSecret(env: AuthEnvironment) {
  const configured = env.HAIRHAEYO_SESSION_SECRET?.trim();
  if (configured && configured.length >= MIN_SESSION_SECRET_LENGTH) return configured;
  if (configured) throw new Error(`HAIRHAEYO_SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters`);
  if (env.NODE_ENV !== "production" && isDemoMode(env)) return DEMO_SESSION_SECRET;
  if (env.NODE_ENV === "test") return TEST_SESSION_SECRET;
  throw new Error("HAIRHAEYO_SESSION_SECRET is required outside demo and test modes");
}

function sessionSignature(expiresAt: string, env: AuthEnvironment) {
  return createHmac("sha256", configuredSessionSecret(env)).update(expiresAt).digest("hex");
}

export function createOwnerSessionToken(expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000, env: AuthEnvironment = process.env) {
  const expiry = String(expiresAt);
  return `${expiry}.${sessionSignature(expiry, env)}`;
}

export function isValidOwnerSession(token: string | undefined, now = Date.now(), env: AuthEnvironment = process.env): boolean {
  if (!token) return false;
  const [expiry, signature, extra] = token.split(".");
  if (extra || !/^\d+$/.test(expiry ?? "") || !/^[0-9a-f]{64}$/i.test(signature ?? "") || Number(expiry) < now) return false;

  try {
    const expected = Buffer.from(sessionSignature(expiry, env), "hex");
    const actual = Buffer.from(signature, "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
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
