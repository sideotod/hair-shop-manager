import { describe, expect, it, vi } from "vitest";

import { createStartupNaverSync, synchronizeNaverBookings } from "./naver-mail-actions";
import { naverMailMetadata } from "../lib/naver-mail";
import { createSalonStore } from "../lib/salon-store";

describe("Naver mail actions", () => {
  it("keeps the checkpoint and redacts a failed incremental sync", async () => {
    const store = createSalonStore(":memory:");
    const secret = "naver-application-password";
    store.close = () => undefined;
    store.saveSettings({ naverMail: { email: "owner@naver.com", provider: "naver", connected: true, lastSyncUid: 7, lastSyncAt: "2026-08-03T10:00:00" } }, "원장");

    await expect(synchronizeNaverBookings(false, {
      createStore: () => store,
      readCredential: vi.fn().mockResolvedValue({ username: "owner@naver.com", secret }),
      discover: vi.fn().mockRejectedValue(new Error(`authentication failed: ${secret}`)),
    })).rejects.toThrow(secret);

    expect(naverMailMetadata(store.getSettings()).lastSyncUid).toBe(7);
    expect(JSON.stringify(store.list("naver-syncs")[0]?.value)).not.toContain(secret);
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
