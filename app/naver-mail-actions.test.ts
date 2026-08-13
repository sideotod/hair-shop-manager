import { beforeEach, describe, expect, it, vi } from "vitest";

import { connectNaverMail, synchronizeNaverBookings, testNaverMailConnection } from "./naver-mail-actions";
import { createStartupNaverSync, discoverNaverBookingMails, naverMailMetadata, testNaverMailConnection as testInboxConnection } from "../lib/naver-mail";
import { createSalonStore } from "../lib/salon-store";
import { deleteWindowsCredential, writeWindowsCredential } from "../lib/windows-credential";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }) }));

vi.mock("../lib/naver-mail", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/naver-mail")>(),
  discoverNaverBookingMails: vi.fn(),
  testNaverMailConnection: vi.fn(),
}));
vi.mock("../lib/salon-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/salon-store")>();
  return { ...actual, createSalonStore: vi.fn(actual.createSalonStore) };
});
vi.mock("../lib/windows-credential", () => ({
  deleteWindowsCredential: vi.fn(),
  readWindowsCredential: vi.fn(),
  writeWindowsCredential: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function connectionForm(secret = "naver-application-password") {
  const formData = new FormData();
  formData.set("email", "owner@naver.com");
  formData.set("applicationPassword", secret);
  return formData;
}

const discoveredMail = {
  uid: 12,
  receivedAt: "2026-08-03T05:00:00.000Z",
  reservationNumber: "NVR-CONNECT-12",
  customerName: "연결 고객",
  customerPhone: "01012345678",
  service: "커트",
  startsAt: "2026-08-04T14:30:00.000Z",
  endsAt: "2026-08-04T15:30:00.000Z",
  status: "confirmed" as const,
};

describe("Naver mail actions", () => {
  it("rejects stale connect submission before touching an existing credential", async () => {
    const store = createSalonStore(":memory:");
    const prior = { email: "owner@naver.com", provider: "naver" as const, connected: true, lastSyncUid: 12, lastSyncAt: "2026-08-03T10:00:00" };
    store.close = () => undefined;
    store.saveSettings({ naverMail: prior }, "사용자");
    vi.mocked(createSalonStore).mockReturnValueOnce(store);

    const redirectError = await connectNaverMail(connectionForm()).catch((error: Error) => error);

    expect(redirectError).toBeInstanceOf(Error);
    expect(testInboxConnection).not.toHaveBeenCalled();
    expect(writeWindowsCredential).not.toHaveBeenCalled();
    expect(deleteWindowsCredential).not.toHaveBeenCalled();
    expect(discoverNaverBookingMails).not.toHaveBeenCalled();
    expect(naverMailMetadata(store.getSettings())).toEqual(prior);
    store.close();
  });

  it("tests auth, stores the credential, imports initial mail, then persists the highest UID", async () => {
    const store = createSalonStore(":memory:");
    store.close = () => undefined;
    store.saveSettings({ naverMail: { email: "old@naver.com", provider: "naver", connected: false, lastSyncUid: 7, lastSyncAt: "2026-08-01T10:00:00" } }, "사용자");
    vi.mocked(createSalonStore).mockReturnValueOnce(store);
    vi.mocked(testInboxConnection).mockResolvedValueOnce({ connected: true });
    vi.mocked(discoverNaverBookingMails).mockResolvedValueOnce([discoveredMail]);
    vi.mocked(writeWindowsCredential).mockResolvedValueOnce(undefined);

    const redirectError = await connectNaverMail(connectionForm()).catch((error: Error) => error);

    expect(redirectError).toBeInstanceOf(Error);
    if (!(redirectError instanceof Error)) throw new Error("expected redirect");
    expect(redirectError.message).toContain("redirect:/bookings?notice=");
    expect(vi.mocked(testInboxConnection).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(writeWindowsCredential).mock.invocationCallOrder[0]);
    expect(vi.mocked(writeWindowsCredential).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(discoverNaverBookingMails).mock.invocationCallOrder[0]);
    expect(vi.mocked(discoverNaverBookingMails)).toHaveBeenCalledWith({ email: "owner@naver.com", password: "naver-application-password", afterUid: 0 });
    expect(naverMailMetadata(store.getSettings())).toMatchObject({ email: "owner@naver.com", connected: true, lastSyncUid: 12 });
    expect(naverMailMetadata(store.getSettings()).lastSyncAt).not.toBe("");
    expect(store.get("bookings", "naver-booking:NVR-CONNECT-12")).not.toBeNull();
    expect(JSON.stringify(store.snapshot())).not.toContain("naver-application-password");
    store.close();
  });

  it("deletes the credential and preserves disconnected checkpoint metadata when discovery fails", async () => {
    const store = createSalonStore(":memory:");
    const prior = { email: "old@naver.com", provider: "naver" as const, connected: false, lastSyncUid: 7, lastSyncAt: "2026-08-01T10:00:00" };
    const secret = "naver-application-password";
    store.close = () => undefined;
    store.saveSettings({ naverMail: prior }, "사용자");
    vi.mocked(createSalonStore).mockReturnValueOnce(store);
    vi.mocked(testInboxConnection).mockResolvedValueOnce({ connected: true });
    vi.mocked(writeWindowsCredential).mockResolvedValueOnce(undefined);
    vi.mocked(discoverNaverBookingMails).mockRejectedValueOnce(new Error(`search failed: ${secret}`));

    const redirectError = await connectNaverMail(connectionForm(secret)).catch((error: Error) => error);

    expect(redirectError).toBeInstanceOf(Error);
    if (!(redirectError instanceof Error)) throw new Error("expected redirect failure");
    expect(redirectError.message).toContain("redirect:/bookings?error=");
    expect(redirectError.message).not.toContain(secret);
    expect(deleteWindowsCredential).toHaveBeenCalledWith("Hairhaeyo:NaverBookingMail");
    expect(naverMailMetadata(store.getSettings())).toEqual(prior);
    expect(JSON.stringify(store.snapshot())).not.toContain(secret);
    store.close();
  });

  it("keeps the checkpoint and redacts raw IMAP errors before rethrowing", async () => {
    const store = createSalonStore(":memory:");
    const secret = "naver-application-password";
    store.close = () => undefined;
    store.saveSettings({ naverMail: { email: "owner@naver.com", provider: "naver", connected: true, lastSyncUid: 7, lastSyncAt: "2026-08-03T10:00:00" } }, "사용자");

    const syncError = await synchronizeNaverBookings(false, {
      createStore: () => store,
      readCredential: vi.fn().mockResolvedValue({ username: "owner@naver.com", secret }),
      discover: vi.fn().mockRejectedValue(new Error(`authentication failed: ${secret}`)),
    }).catch((error: Error) => error);

    expect(syncError).toBeInstanceOf(Error);
    if (!(syncError instanceof Error)) throw new Error("expected sync failure");
    expect(syncError.message).not.toContain(secret);
    expect(naverMailMetadata(store.getSettings()).lastSyncUid).toBe(7);
    expect(JSON.stringify(store.list("naver-syncs")[0]?.value)).not.toContain(secret);

    vi.mocked(testInboxConnection).mockRejectedValueOnce(new Error(`IMAP rejected ${secret}`));
    const connectionError = await testNaverMailConnection({ email: "owner@naver.com", password: secret }).catch((error: Error) => error);
    expect(connectionError).toBeInstanceOf(Error);
    if (!(connectionError instanceof Error)) throw new Error("expected connection failure");
    expect(connectionError.message).not.toContain(secret);
  });

  it("runs one successful startup sync, but retries after failure", async () => {
    let calls = 0;
    let release!: () => void;
    const wait = new Promise<void>((resolve) => { release = resolve; });
    const sync = createStartupNaverSync(async () => { calls += 1; await wait; });

    const first = sync();
    const second = sync();
    expect(calls).toBe(1);
    release();
    await Promise.all([first, second]);
    await sync();
    expect(calls).toBe(1);

    const retry = createStartupNaverSync(async () => { calls += 1; if (calls === 2) throw new Error("temporary failure"); });
    await retry();
    await retry();
    expect(calls).toBe(3);
  });
});
