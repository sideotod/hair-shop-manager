import { describe, expect, it } from "vitest";

import { bookingOverlaps, changeBookingStatusRecord, markBookingCompleted, validateBooking } from "./booking";
import { createSalonStore } from "./salon-store";

const settings = { bookingOpen: "09:30", bookingClose: "21:00", bookingSlotMinutes: 30 };

// 서울 10:00-11:00. 저장 값은 참 시각 ISO 라 UTC 로는 01:00-02:00 이다.
function seedBooking(store: ReturnType<typeof createSalonStore>, status: string) {
  store.save("customers", "customer-1", { name: "김손님", phone: "", smsOptIn: false, points: 0 }, "사용자");
  return store.save("bookings", "booking-1", { customerId: "customer-1", service: "커트", startsAt: "2026-08-03T01:00:00.000Z", endsAt: "2026-08-03T02:00:00.000Z", status, memo: "", reminderDayBefore: false, reminderDayOf: false, reminderText: "", statusHistory: [{ status, at: "2026-08-01T00:00:00.000Z", actor: "사용자" }] }, "사용자");
}

describe("booking rules", () => {
  it("blocks intersecting active reservations but allows adjacent and cancelled slots", () => {
    const candidate = { startsAt: "2026-08-03T10:00:00.000Z", endsAt: "2026-08-03T11:00:00.000Z", status: "confirmed" };

    expect(bookingOverlaps(candidate, { startsAt: "2026-08-03T10:30:00.000Z", endsAt: "2026-08-03T11:30:00.000Z", status: "confirmed" }, 30)).toBe(true);
    expect(bookingOverlaps(candidate, { startsAt: "2026-08-03T11:00:00.000Z", endsAt: "2026-08-03T11:30:00.000Z", status: "confirmed" }, 30)).toBe(false);
    expect(bookingOverlaps(candidate, { startsAt: "2026-08-03T10:30:00.000Z", endsAt: "2026-08-03T11:30:00.000Z", status: "cancelled" }, 30)).toBe(false);
  });

  it("requires an in-hours whole-slot booking with a customer, service, and valid reminder flags", () => {
    expect(() => validateBooking({ customerId: "customer-1", service: "커트", startsAt: "2026-08-03T09:30:00.000Z", endsAt: "2026-08-03T10:30:00.000Z", status: "confirmed", reminderDayBefore: true, reminderDayOf: false }, settings)).not.toThrow();
    expect(() => validateBooking({ customerId: "customer-1", service: "커트", startsAt: "2026-08-03T09:45:00.000Z", endsAt: "2026-08-03T10:45:00.000Z", status: "confirmed", reminderDayBefore: false, reminderDayOf: false }, settings)).toThrow("예약 시간 단위");
    expect(() => validateBooking({ customerId: "", service: "커트", startsAt: "2026-08-03T09:30:00.000Z", endsAt: "2026-08-03T10:30:00.000Z", status: "confirmed", reminderDayBefore: "yes" as unknown as boolean, reminderDayOf: false }, settings)).toThrow("고객");
    expect(() => validateBooking({ customerId: "customer-1", service: "커트", startsAt: "2026-08-03T20:30:00.000Z", endsAt: "2026-08-03T21:30:00.000Z", status: "confirmed", reminderDayBefore: false, reminderDayOf: false }, settings)).toThrow("영업 시간");
  });
});

describe("markBookingCompleted", () => {
  it("completes a confirmed booking and appends exactly one history row", () => {
    const store = createSalonStore(":memory:");
    try {
      seedBooking(store, "confirmed");
      const saved = markBookingCompleted(store, "booking-1");
      expect(saved?.value).toMatchObject({ status: "completed", service: "커트", startsAt: "2026-08-03T01:00:00.000Z" });
      expect((saved?.value as { statusHistory: readonly unknown[] }).statusHistory).toHaveLength(2);
      expect((saved?.value as { statusHistory: readonly { status: string }[] }).statusHistory[1]).toMatchObject({ status: "completed", actor: "사용자" });
    } finally { store.close(); }
  });

  it("leaves cancelled, archived, already completed, and missing bookings alone", () => {
    const store = createSalonStore(":memory:");
    try {
      seedBooking(store, "cancelled");
      expect(markBookingCompleted(store, "booking-1")).toBeNull();
      expect(store.get("bookings", "booking-1")?.value).toMatchObject({ status: "cancelled" });
      expect(markBookingCompleted(store, "booking-none")).toBeNull();

      seedBooking(store, "completed");
      expect(markBookingCompleted(store, "booking-1")).toBeNull();

      seedBooking(store, "confirmed");
      store.archive("bookings", "booking-1", "사용자");
      expect(markBookingCompleted(store, "booking-1")).toBeNull();
    } finally { store.close(); }
  });

  // 결제가 예약 정책 때문에 실패하면 안 된다. 예전 영업시간에 잡힌 예약은 `changeBookingStatusRecord` 로는 "영업 시간을 확인하세요" 로 던진다.
  it("completes a booking whose stored times no longer fit the current business hours", () => {
    const store = createSalonStore(":memory:");
    try {
      seedBooking(store, "confirmed");
      store.saveSettings({ bookingOpen: "13:00", bookingClose: "18:00", bookingSlotMinutes: 30 }, "사용자");

      const status = new FormData(); status.set("bookingId", "booking-1"); status.set("status", "completed");
      expect(() => changeBookingStatusRecord(store, status)).toThrow("영업 시간");

      expect(markBookingCompleted(store, "booking-1")?.value).toMatchObject({ status: "completed" });
    } finally { store.close(); }
  });
});
