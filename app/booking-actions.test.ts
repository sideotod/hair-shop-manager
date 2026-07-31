import { describe, expect, it } from "vitest";

import { cancelBookingRecord, changeBookingStatusRecord, requestNaverSyncRecord, saveBookingRecord, saveBookingSettingsRecord } from "../lib/booking";
import { createSalonStore } from "../lib/salon-store";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("booking actions", () => {
  it("creates, changes, and archives a reservation with an owner audit trail", () => {
    const store = createSalonStore(":memory:");
    const saved = saveBookingRecord(store, form({ bookingId: "booking-test", customerId: "customer-seed-1", service: "커트", date: "2026-08-03", startTime: "10:00", endTime: "11:00", status: "confirmed", reminderDayBefore: "on" }));

    expect(saved.value).toMatchObject({ customerId: "customer-seed-1", status: "confirmed", reminderDayBefore: true, reminderDayOf: false, operator: "원장" });
    const changed = changeBookingStatusRecord(store, form({ bookingId: "booking-test", status: "completed" }));
    expect(changed.value).toMatchObject({ status: "completed", operator: "원장" });
    expect(cancelBookingRecord(store, form({ bookingId: "booking-test", cancelReason: "고객 요청" })).archivedAt).toBeTruthy();
    expect(store.list("bookings").some(({ id }) => id === "booking-test")).toBe(false);
    expect(store.snapshot().auditEvents.filter((event) => event.recordId === "booking-test").every((event) => event.actor === "원장")).toBe(true);
  });

  it("changes the status of legacy bookings that only store a start time", () => {
    const store = createSalonStore(":memory:");

    expect(changeBookingStatusRecord(store, form({ bookingId: "booking-seed-1", status: "completed" })).value).toMatchObject({ status: "completed", operator: "원장" });
  });

  it("blocks overlapping bookings until the owner explicitly enables overlaps", () => {
    const store = createSalonStore(":memory:");
    const first = { customerId: "customer-seed-1", service: "커트", date: "2026-08-03", startTime: "10:00", endTime: "11:00", status: "confirmed" };

    saveBookingRecord(store, form(first));
    expect(() => saveBookingRecord(store, form({ ...first, bookingId: "overlap", startTime: "10:30", endTime: "11:30" }))).toThrow("겹칩니다");

    saveBookingSettingsRecord(store, form({ bookingOpen: "09:30", bookingClose: "21:00", bookingSlotMinutes: "30", bookingAllowOverlap: "on" }));
    expect(saveBookingRecord(store, form({ ...first, bookingId: "overlap", startTime: "10:30", endTime: "11:30" })).value).toMatchObject({ status: "confirmed", operator: "원장" });
  });

  it("rejects invalid slots before persisting a crafted new customer", () => {
    const store = createSalonStore(":memory:");
    const customers = store.list("customers");

    expect(() => saveBookingRecord(store, form({ newCustomerId: "customer-seed-1", newCustomerName: "덮어쓰기", newCustomerPhone: "010-1234-5678", service: "커트", date: "2026-08-03", startTime: "10:15", endTime: "10:45", status: "confirmed" }))).toThrow("예약 시간 단위");

    expect(store.list("customers")).toHaveLength(customers.length);
    expect(store.get("customers", "customer-seed-1")?.value).toMatchObject({ name: "김하늘" });
  });

  it("rejects an overlap before persisting a new customer", () => {
    const store = createSalonStore(":memory:");
    saveBookingRecord(store, form({ bookingId: "existing-overlap", customerId: "customer-seed-1", service: "커트", date: "2026-08-03", startTime: "14:00", endTime: "15:00", status: "confirmed" }));
    const customers = store.list("customers");

    expect(() => saveBookingRecord(store, form({ newCustomerName: "새 고객", newCustomerPhone: "010-1234-5678", service: "커트", date: "2026-08-03", startTime: "14:30", endTime: "15:00", status: "confirmed" }))).toThrow("겹칩니다");

    expect(store.list("customers")).toHaveLength(customers.length);
  });

  it("rejects invalid booking settings without changing stored settings", () => {
    const store = createSalonStore(":memory:");
    const before = store.getSettings();

    expect(() => saveBookingSettingsRecord(store, form({ bookingOpen: "09:45", bookingClose: "21:00", bookingSlotMinutes: "30" }))).toThrow("영업 시간");

    expect(store.getSettings()).toEqual(before);
  });

  it("does not resurrect cancelled or archived bookings through edit or status actions", () => {
    const store = createSalonStore(":memory:");
    const booking = { bookingId: "booking-archive", customerId: "customer-seed-1", service: "커트", date: "2026-08-03", startTime: "10:00", endTime: "10:30", status: "confirmed" };

    saveBookingRecord(store, form(booking));
    cancelBookingRecord(store, form({ bookingId: "booking-archive" }));
    expect(() => saveBookingRecord(store, form(booking))).toThrow("취소된 예약");
    expect(() => changeBookingStatusRecord(store, form({ bookingId: "booking-archive", status: "completed" }))).toThrow("취소된 예약");
    expect(store.get("bookings", "booking-archive")?.archivedAt).toBeTruthy();
  });

  it("validates reminders and records Naver disabled dry-runs with retry history without credentials", () => {
    const store = createSalonStore(":memory:");
    expect(() => saveBookingRecord(store, form({ customerId: "customer-seed-1", service: "커트", date: "2026-08-03", startTime: "10:15", endTime: "11:00", status: "confirmed", reminderDayBefore: "not-a-flag" }))).toThrow("예약 알림 설정");
    const settings = saveBookingSettingsRecord(store, form({ bookingOpen: "09:30", bookingClose: "21:00", bookingSlotMinutes: "30", reminderDayBefore: "on", naverAccount: "owner@example.com", naverShopName: "수원 본점" }));
    expect(settings).toMatchObject({ bookingOpen: "09:30", reminderDayBefore: true, naverAccount: "owner@example.com" });
    expect(requestNaverSyncRecord(store).value).toMatchObject({ status: "disabled", result: "dry-run", actor: "원장" });
  });
});
