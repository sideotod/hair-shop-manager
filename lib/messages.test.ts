import { describe, expect, it } from "vitest";

import { eligibleRecipients, messageBytes, messageType, queueMessage } from "./messages";
import type { JsonObject } from "./salon-domain";
import { createSalonStore } from "./salon-store";

describe("message rules", () => {
  it("counts UTF-8 bytes and changes to LMS after 90 bytes", () => {
    expect(messageBytes("가")).toBe(3);
    expect(messageType("가".repeat(30))).toBe("SMS");
    expect(messageType("가".repeat(31))).toBe("LMS");
  });

  it("limits individual messages to three selected customers", () => {
    const store = createSalonStore(":memory:");

    expect(() => queueMessage(store, { requestKey: "four", text: "안녕하세요", recipientIds: ["customer-seed-1", "customer-seed-2", "one", "two"] })).toThrow("최대 3명");
  });

  it("excludes SMS opt-outs and rejects an exhausted quota", () => {
    const store = createSalonStore(":memory:");
    const optedOut = store.get("customers", "customer-seed-2")!;
    store.save("customers", optedOut.id, { ...(optedOut.value as JsonObject), phone: "01022223333", smsOptIn: false }, "원장");

    expect(eligibleRecipients(store.list("customers"), "all").map(({ id }) => id)).toEqual(["customer-seed-1"]);
    store.saveSettings({ smsRemaining: 0 }, "원장");
    expect(() => queueMessage(store, { requestKey: "quota", text: "안녕하세요", recipientIds: ["customer-seed-1"] })).toThrow("SMS 잔여 건수");
  });

  it("rejects a schedule in the past", () => {
    const store = createSalonStore(":memory:");

    expect(() => queueMessage(store, { requestKey: "past", text: "안녕하세요", recipientIds: ["customer-seed-1"], scheduledAt: "2026-07-30T23:59:59.000Z", now: new Date("2026-07-31T00:00:00.000Z") })).toThrow("예약 시간");
  });

  it("persists only a dry-run request, reduces quota, and rejects its duplicate key", () => {
    const store = createSalonStore(":memory:");
    const message = queueMessage(store, { requestKey: "once", text: "안녕하세요", segment: "women" });

    expect(message.value).toMatchObject({ channel: "SMS", status: "dry-run", operator: "원장" });
    expect(store.getSettings().smsRemaining).toBe(499);
    expect(() => queueMessage(store, { requestKey: "once", text: "안녕하세요", segment: "women" })).toThrow("이미 처리한 요청");
  });

  it("selects basic all, women, men, and power segments", () => {
    const store = createSalonStore(":memory:");
    const first = store.get("customers", "customer-seed-1")!;
    const second = store.get("customers", "customer-seed-2")!;
    store.save("customers", first.id, { ...(first.value as JsonObject), points: 120 }, "원장");
    store.save("customers", second.id, { ...(second.value as JsonObject), points: 0 }, "원장");

    expect(eligibleRecipients(store.list("customers"), "all").map(({ id }) => id)).toEqual(["customer-seed-1", "customer-seed-2"]);
    expect(eligibleRecipients(store.list("customers"), "women").map(({ id }) => id)).toEqual(["customer-seed-1"]);
    expect(eligibleRecipients(store.list("customers"), "men").map(({ id }) => id)).toEqual(["customer-seed-2"]);
    expect(eligibleRecipients(store.list("customers"), "power").map(({ id }) => id)).toEqual(["customer-seed-1"]);
  });
});
