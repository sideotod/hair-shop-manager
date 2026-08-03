"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  applyNaverBookingMails,
  discoverNaverBookingMails,
  naverMailMetadata,
  seoulTimestamp,
  testNaverMailConnection as testConnection,
  type NaverMailConnectionInput,
} from "../lib/naver-mail";
import { createSalonStore } from "../lib/salon-store";
import { deleteWindowsCredential, readWindowsCredential, writeWindowsCredential } from "../lib/windows-credential";

const actor = "원장" as const;
const credentialTarget = "Hairhaeyo:NaverBookingMail";
type NaverMailSyncDependencies = {
  createStore: typeof createSalonStore;
  readCredential: typeof readWindowsCredential;
  discover: typeof discoverNaverBookingMails;
};
const naverMailSyncDependencies: NaverMailSyncDependencies = {
  createStore: createSalonStore,
  readCredential: readWindowsCredential,
  discover: discoverNaverBookingMails,
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validate(input: NaverMailConnectionInput) {
  if (!/^[^@\s]+@naver\.com$/i.test(input.email)) throw new Error("네이버 메일 주소를 확인하세요.");
  if (!input.password) throw new Error("애플리케이션 비밀번호를 입력하세요.");
  return input;
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "네이버 메일 주소를 확인하세요." || message === "애플리케이션 비밀번호를 입력하세요." || message.includes("Windows Credential Manager")) return message;
  return "네이버 메일 연결을 확인하세요. 메일 주소와 애플리케이션 비밀번호를 다시 확인하세요.";
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/customers");
  revalidatePath("/settings");
}

function finish(notice: string): never {
  refresh();
  redirect(`/bookings?notice=${encodeURIComponent(notice)}`);
}

function fail(error: unknown): never {
  redirect(`/bookings?error=${encodeURIComponent(safeError(error))}`);
}

function recordSync(store: ReturnType<typeof createSalonStore>, status: string, result: string, details: Record<string, string | number | boolean> = {}) {
  store.save("naver-syncs", `naver-mail-sync-${randomUUID()}`, { status, result, attemptedAt: seoulTimestamp(), provider: "naver", actor, ...details }, actor);
}

export async function testNaverMailConnection(input: NaverMailConnectionInput) {
  return testConnection(validate(input));
}

export async function connectNaverMail(formData: FormData) {
  try {
    const input = validate({ email: text(formData, "email"), password: text(formData, "applicationPassword") });
    await testNaverMailConnection(input);
    await writeWindowsCredential(credentialTarget, input.email, input.password);
    const store = createSalonStore();
    try {
      const current = naverMailMetadata(store.getSettings());
      store.saveSettings({ naverMail: { ...current, email: input.email, provider: "naver", connected: true } }, actor);
      recordSync(store, "connected", "connection-test-passed", { email: input.email });
    } catch (error) {
      await deleteWindowsCredential(credentialTarget).catch(() => undefined);
      throw error;
    } finally {
      store.close();
    }
  } catch (error) {
    fail(error);
  }
  finish("네이버 예약 메일 연결 테스트에 성공했습니다.");
}

export async function synchronizeNaverBookings(initial: boolean, dependencies: NaverMailSyncDependencies = naverMailSyncDependencies) {
  const store = dependencies.createStore();
  try {
    const metadata = naverMailMetadata(store.getSettings());
    if (!metadata.connected) return { skipped: true, changed: 0, cancelled: 0, highestUid: metadata.lastSyncUid };
    const credential = await dependencies.readCredential(credentialTarget);
    if (!credential) throw new Error("Windows Credential Manager에서 네이버 예약 자격 증명을 찾지 못했습니다.");
    try {
      const mails = await dependencies.discover({ email: metadata.email || credential.username, password: credential.secret, afterUid: initial ? 0 : metadata.lastSyncUid });
      const result = applyNaverBookingMails(store, mails);
      const lastSyncUid = Math.max(metadata.lastSyncUid, result.highestUid);
      store.saveSettings({ naverMail: { email: metadata.email || credential.username, provider: "naver", connected: true, lastSyncUid, lastSyncAt: seoulTimestamp() } }, actor);
      recordSync(store, "success", initial ? "initial-import" : "incremental-sync", { changed: result.changed, cancelled: result.cancelled, lastSyncUid });
      return { skipped: false, ...result, highestUid: lastSyncUid };
    } catch (error) {
      recordSync(store, "error", initial ? "initial-import-failed" : "incremental-sync-failed", { message: safeError(error), lastSyncUid: metadata.lastSyncUid });
      throw error;
    }
  } finally {
    store.close();
  }
}

export async function importInitialNaverBookings() {
  let changed = 0;
  try {
    const result = await synchronizeNaverBookings(true);
    changed = result.changed;
  } catch (error) {
    fail(error);
  }
  finish(`초기 예약 ${changed}건을 불러왔습니다.`);
}

export async function syncNewNaverBookings() {
  let changed = 0;
  try {
    const result = await synchronizeNaverBookings(false);
    changed = result.changed;
  } catch (error) {
    fail(error);
  }
  finish(`신규 예약 ${changed}건을 동기화했습니다.`);
}

export async function disconnectNaverMail() {
  try {
    await deleteWindowsCredential(credentialTarget);
    const store = createSalonStore();
    try {
      const current = naverMailMetadata(store.getSettings());
      store.saveSettings({ naverMail: { ...current, connected: false } }, actor);
      recordSync(store, "disconnected", "credential-deleted");
    } finally {
      store.close();
    }
  } catch (error) {
    fail(error);
  }
  finish("네이버 예약 메일 연결을 해제했습니다.");
}

export function createStartupNaverSync(sync: () => Promise<void>) {
  let done = false;
  let pending: Promise<void> | undefined;
  return async () => {
    if (done) return;
    if (!pending) {
      // ponytail: single-process startup sync; use a DB lease if multi-process desktop instances are introduced.
      pending = sync().then(() => { done = true; }).catch(() => undefined).finally(() => { pending = undefined; });
    }
    await pending;
  };
}

const runStartupSync = createStartupNaverSync(async () => { await synchronizeNaverBookings(false); });
export async function runStartupNaverSync() { await runStartupSync(); }
