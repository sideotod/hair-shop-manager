import { describe, expect, it } from "vitest";

import { bookingOverlaps, validateBooking } from "./booking";

const settings = { bookingOpen: "09:30", bookingClose: "21:00", bookingSlotMinutes: 30 };

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
