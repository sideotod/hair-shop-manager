import { describe, expect, it } from "vitest";

import { createSalonStore } from "../lib/salon-store";
import { completeWaitingCustomerRecord, saveCustomerPolicyRecord, saveCustomerRecord, saveWaitingCustomerRecord } from "./customer-actions";

const store = createSalonStore(":memory:");

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("customer actions", () => {
  it("rejects invalid customer input and duplicate identity until explicitly overridden", async () => {
    expect(() => saveCustomerRecord(store, form({ name: "", phone: "01012345678" }))).toThrow("고객명");
    expect(() => saveCustomerRecord(store, form({ name: "신규 고객", phone: "010-1234-5678", memo: "가".repeat(151) }))).toThrow("150");
    expect(() => saveCustomerRecord(store, form({ name: "김하늘", phone: "01012345678" }))).toThrow("중복");
    expect(() => saveCustomerRecord(store, form({ name: "김하늘", phone: "01012345678", allowDuplicate: "on", points: "12.5" }))).toThrow("포인트");

    saveCustomerRecord(store, form({ name: "김하늘", phone: "01012345678", allowDuplicate: "on", points: "12", smsOptIn: "off" }));
    const saved = store.list<{ name: string; points: number; smsOptIn: boolean }>("customers").find(({ value }) => value.name === "김하늘" && value.points === 12);
    expect(saved?.value).toMatchObject({ smsOptIn: false, points: 12 });
  });

  it("creates requested booking, SMS, and waiting records with the saved customer", async () => {
    saveCustomerRecord(store, form({
      name: "연결 고객", phone: "010-9999-8888", smsOptIn: "on", initialSms: "on", initialBookingDate: "2026-08-10", initialBookingTime: "10:30", initialBookingService: "커트", registerWaiting: "on", waitingMemo: "창가 자리",
    }));

    const customer = store.list<{ name: string }>("customers").find(({ value }) => value.name === "연결 고객");
    expect(customer).toBeTruthy();
    expect(store.list<{ customerId: string; status: string }>("bookings")).toContainEqual(expect.objectContaining({ value: expect.objectContaining({ customerId: customer?.id, status: "confirmed" }) }));
    expect(store.list<{ recipientId: string; status: string }>("messages")).toContainEqual(expect.objectContaining({ value: expect.objectContaining({ recipientId: customer?.id, status: "queued" }) }));
    expect(store.list<{ customerId: string; memo: string }>("waiting-customers")).toContainEqual(expect.objectContaining({ value: expect.objectContaining({ customerId: customer?.id, memo: "창가 자리" }) }));
  });

  it("does not save a customer when a requested linked booking is incomplete", () => {
    const before = store.list("customers").length;

    expect(() => saveCustomerRecord(store, form({ name: "예약 오류 고객", phone: "010-7777-6666", initialBookingDate: "2026-08-10" }))).toThrow("초기 예약 날짜와 시간을");

    expect(store.list("customers")).toHaveLength(before);
  });

  it("completes a waiting record by soft-archiving it with an owner audit event", async () => {
    const waiting = store.save("waiting-customers", "waiting-complete", { name: "완료 고객", memo: "대기" }, "원장");

    completeWaitingCustomerRecord(store, form({ waitingId: waiting.id }));

    expect(store.list("waiting-customers").some(({ id }) => id === waiting.id)).toBe(false);
    expect(store.snapshot().auditEvents.at(-1)).toMatchObject({ action: "archive", kind: "waiting-customers", recordId: waiting.id, actor: "원장" });
  });

  it("validates waiting input and persists customer policies as owner data", () => {
    expect(() => saveWaitingCustomerRecord(store, form({ name: "", memo: "대기" }))).toThrow("대기 고객명");
    expect(() => saveWaitingCustomerRecord(store, form({ name: "대기", memo: "가".repeat(151) }))).toThrow("150");

    saveWaitingCustomerRecord(store, form({ name: "현장 대기", memo: "염색" }));
    saveCustomerPolicyRecord(store, form({ customerGroups: "VIP, 신규", customerGrades: "일반, VIP1, VIP2", visitMotives: "소개, 검색", defaultSmsOptIn: "off", birthdayCalendar: "lunar" }));

    expect(store.list<{ name: string }>("waiting-customers")).toContainEqual(expect.objectContaining({ value: expect.objectContaining({ name: "현장 대기" }) }));
    expect(store.getSettings()).toMatchObject({ customerGroups: "VIP, 신규", customerGrades: "일반, VIP1, VIP2", defaultSmsOptIn: false, birthdayCalendar: "lunar" });
    expect(store.snapshot().auditEvents.at(-1)).toMatchObject({ action: "save-settings", actor: "원장" });
  });

  it("persists the ordinary telephone and rejects impossible initial booking dates", () => {
    saveCustomerRecord(store, form({ name: "유선 고객", phone: "010-5555-4444", telephone: "031-123-4567" }));
    expect(store.list<{ name: string; telephone: string }>("customers").find(({ value }) => value.name === "유선 고객")?.value.telephone).toBe("031-123-4567");

    expect(() => saveCustomerRecord(store, form({ name: "잘못된 날짜", phone: "010-3333-2222", initialBookingDate: "2026-02-30", initialBookingTime: "12:00" }))).toThrow("초기 예약 날짜와 시간을");
    expect(store.list<{ name: string }>("customers").some(({ value }) => value.name === "잘못된 날짜")).toBe(false);
  });

  it("applies persisted bulk group and grade values to selected customers", () => {
    store.saveSettings({ customerGroups: "기존 그룹", customerGrades: "기존 등급" }, "원장");
    saveCustomerPolicyRecord(store, form({ customerIds: "customer-seed-1", bulkGroup: "충성", bulkGrade: "VIP2" }));

    expect(store.get<{ group: string; grade: string }>("customers", "customer-seed-1")?.value).toMatchObject({ group: "충성", grade: "VIP2" });
    expect(store.getSettings()).toMatchObject({ customerGroups: "기존 그룹", customerGrades: "기존 등급" });
  });

  it("persists a non-negative integer power-customer point criterion", () => {
    saveCustomerPolicyRecord(store, form({ powerCustomerMinPoints: "500" }));
    expect(store.getSettings()).toMatchObject({ powerCustomerMinPoints: 500 });

    expect(() => saveCustomerPolicyRecord(store, form({ powerCustomerMinPoints: "10.5" }))).toThrow("파워 고객");
    expect(() => saveCustomerPolicyRecord(store, form({ powerCustomerMinPoints: "-1" }))).toThrow("파워 고객");
  });

  it("rejects impossible values for every customer date and initial booking time", () => {
    const invalidCustomerDates = ["birthday", "firstMetAt", "joinedAt"] as const;

    for (const field of invalidCustomerDates) {
      const name = `날짜 검증 ${field}`;
      expect(() => saveCustomerRecord(store, form({ name, phone: `010-1000-${String(invalidCustomerDates.indexOf(field)).padStart(4, "0")}`, [field]: "2026-02-30" }))).toThrow("확인하세요");
      expect(store.list<{ name: string }>("customers").some(({ value }) => value.name === name)).toBe(false);
    }

    expect(() => saveCustomerRecord(store, form({ name: "시간 검증 고객", phone: "010-1000-0003", initialBookingDate: "2026-08-10", initialBookingTime: "24:00" }))).toThrow("초기 예약 날짜와 시간을 확인하세요.");
    expect(store.list<{ name: string }>("customers").some(({ value }) => value.name === "시간 검증 고객")).toBe(false);
  });
});
