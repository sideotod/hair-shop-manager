import { describe, expect, it } from "vitest";

import { eligibleRecipients, forRecipientPicker, messageBytes, messageType, queueMessage, saveAutomationRule } from "./messages";
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

  it("does not queue or consume quota while SMS is disabled", () => {
    const store = createSalonStore(":memory:");
    store.saveSettings({ smsEnabled: false, smsRemaining: 500 }, "원장");
    const before = store.snapshot();

    expect(() => queueMessage(store, { requestKey: "disabled", text: "안녕하세요", recipientIds: ["customer-seed-1"] })).toThrow("비활성화");
    expect(store.list("messages")).toEqual(before.records.messages ?? []);
    expect(store.getSettings().smsRemaining).toBe(500);
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

  it("uses unique selected opt-in customers for the preview and dry-run quota", () => {
    const store = createSalonStore(":memory:");
    const second = store.get("customers", "customer-seed-2")!;
    store.save("customers", second.id, { ...(second.value as JsonObject), smsOptIn: false }, "원장");

    expect(eligibleRecipients(store.list("customers"), "all", 100, ["customer-seed-1", "customer-seed-1", "customer-seed-2"]).map(({ id }) => id)).toEqual(["customer-seed-1"]);
    const message = queueMessage(store, { requestKey: "unique", text: " 안녕 ", recipientIds: ["customer-seed-1", "customer-seed-1", "customer-seed-2"] });
    expect(message.value).toMatchObject({ recipientIds: ["customer-seed-1"], recipientCount: 1, text: "안녕", bytes: 6, channel: "SMS" });
    expect(store.getSettings().smsRemaining).toBe(499);
  });

  it("normalizes message text and records the owner audit actor", () => {
    const store = createSalonStore(":memory:");
    const message = queueMessage(store, { requestKey: "trimmed", text: ` ${"가".repeat(31)} `, recipientIds: ["customer-seed-1"] });

    expect(message.value).toMatchObject({ text: "가".repeat(31), bytes: 93, channel: "LMS" });
    expect(store.snapshot().auditEvents.find((event) => event.recordId === message.id)?.actor).toBe("원장");
  });

  it("normalizes and saves an automation rule with an owner audit", () => {
    const store = createSalonStore(":memory:");
    const rule = saveAutomationRule(store, { label: " 신규 안내 ", enabled: true, text: " 안녕 ", schedule: " 등록 후 10분 " });

    expect(rule.value).toMatchObject({ label: "신규 안내", text: "안녕", bytes: 6, channel: "SMS", status: "사용", operator: "원장" });
    expect(store.snapshot().auditEvents.find((event) => event.recordId === rule.id)?.actor).toBe("원장");
  });

  // 문자 화면으로 넘어가는 고객 payload 에서 화면이 쓰지 않는 값을 잘라낸다.
  it("keeps only the id and four recipient fields and preserves segment eligibility", () => {
    const store = createSalonStore(":memory:");
    store.save("customers", "trim-me", { name: "자를 고객", phone: "010-1111-2222", memo: "비밀 메모", address: "서울시 어딘가", gender: "female", points: 900, smsOptIn: true }, "원장");
    const trimmed = forRecipientPicker(store.list("customers"));
    const target = trimmed.find(({ id }) => id === "trim-me")!;

    expect(Object.keys(target.value as JsonObject).sort()).toEqual(["gender", "name", "points", "smsOptIn"]);
    // 레코드 껍데기(kind·타임스탬프)는 화면이 읽지 않는다. 858명분이면 111KB 다.
    expect(Object.keys(target).sort()).toEqual(["id", "value"]);
    // 주소·메모·전화번호는 이 화면에서 쓰지 않으니 경계를 넘지 않는다.
    expect(JSON.stringify(trimmed)).not.toContain("비밀 메모");
    expect(JSON.stringify(trimmed)).not.toContain("010-1111-2222");
    // id 와 분류 기준은 남아서 대상 선별이 그대로 동작한다.
    expect(eligibleRecipients(trimmed, "women").map(({ id }) => id)).toContain("trim-me");
    expect(eligibleRecipients(trimmed, "power", 500).map(({ id }) => id)).toContain("trim-me");
  });
});
