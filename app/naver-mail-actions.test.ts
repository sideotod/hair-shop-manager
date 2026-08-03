import { describe, expect, it, vi } from "vitest";

import { synchronizeNaverBookings, testNaverMailConnection } from "./naver-mail-actions";
import { createStartupNaverSync, naverMailMetadata, testNaverMailConnection as testInboxConnection } from "../lib/naver-mail";
import { createSalonStore } from "../lib/salon-store";

vi.mock("../lib/naver-mail", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/naver-mail")>(),
  testNaverMailConnection: vi.fn(),
}));

describe("Naver mail actions", () => {
  it("keeps the checkpoint and redacts raw IMAP errors before rethrowing", async () => {
    const store = createSalonStore(":memory:");
    const secret = "naver-application-password";
    store.close = () => undefined;
    store.saveSettings({ naverMail: { email: "owner@naver.com", provider: "naver", connected: true, lastSyncUid: 7, lastSyncAt: "2026-08-03T10:00:00" } }, "원장");

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
