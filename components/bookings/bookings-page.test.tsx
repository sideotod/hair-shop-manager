import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createSalonStore } from "../../lib/salon-store";
import { addCalendarMonths, BookingsPage, todayInSeoul } from "./bookings-page";

function page(props: Partial<React.ComponentProps<typeof BookingsPage>> = {}) {
  const store = createSalonStore(":memory:");
  const snapshot = store.snapshot();
  return renderToStaticMarkup(<BookingsPage
    bookings={snapshot.records.bookings ?? []}
    customers={snapshot.records.customers ?? []}
    settings={snapshot.settings}
    syncHistory={snapshot.records["naver-syncs"] ?? []}
    date="2026-07-31"
    {...props}
  />);
}

describe("BookingsPage", () => {
  it("keeps day, month, and period navigation in URL state and links bookings to customers", () => {
    const html = page();

    expect(html).toContain("일 보기");
    expect(html).toContain("월 보기");
    expect(html).toContain("기간 보기");
    expect(html).toContain("/bookings?date=2026-07-30&amp;view=day&amp;period=7");
    expect(html).toContain("/customers?customer=customer-seed-1");
    expect(html).toContain('data-booking-row="booking-seed-1"');
    expect(page({ view: "month" })).toContain("2026-07 월간");
    expect(page({ view: "period", period: "14" })).toContain("2026-07-31부터 14일");
  });

  it("renders functional reservation, reminder, operating-hours, and Naver mail controls without a designer field", () => {
    const html = page({ showNew: true });

    expect(html).toContain('aria-label="새 예약 등록"');
    expect(html).toContain('name="reminderDayBefore"');
    expect(html).toContain('name="bookingOpen"');
    expect(html).toContain('aria-label="네이버 예약 메일 연결"');
    expect(html).toContain('name="applicationPassword"');
    expect(html).toContain("Windows Credential Manager");
    expect(html).toContain("연결 테스트 및 저장");
    expect(html).not.toContain('name="designer"');
    expect(html).not.toContain('name="staff"');
  });

  it("keeps secondary booking settings and Naver connection collapsed by default", () => {
    const html = page();

    expect(html).toContain('data-booking-settings="true"');
    expect(html).toContain("예약 설정 · 네이버 예약 메일 연동");
    expect(html).not.toContain('data-booking-settings="true" open=""');
  });

  it("uses Seoul's calendar date and calendar-month navigation at month ends", () => {
    expect(todayInSeoul(new Date("2026-07-31T15:30:00.000Z"))).toBe("2026-08-01");
    expect(addCalendarMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addCalendarMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(page({ date: "2026-01-31", view: "month" })).toContain("/bookings?date=2025-12-31&amp;view=month&amp;period=7");
    expect(page({ date: "2026-01-31", view: "month" })).toContain("/bookings?date=2026-02-28&amp;view=month&amp;period=7");
  });

  it("renders a correction state while preserving the booking query context", () => {
    const html = page({ error: "영업 시간을 확인하세요.", showNew: true, view: "period", period: "14" });

    expect(html).toContain('role="alert"');
    expect(html).toContain("입력 내용을 수정하세요: 영업 시간을 확인하세요.");
    expect(html).toContain('name="returnTo"');
    expect(html).toContain("/bookings?date=2026-07-31&amp;view=period&amp;period=14&amp;new=1");
  });
  it("closes registration and saves back to the current calendar context", () => {
    const html = page({ date: "2026-07-31", view: "period", period: "14", showNew: true });

    expect(html).toContain('data-dialog-close="true"');
    expect(html).toContain('/bookings?date=2026-07-31&amp;view=period&amp;period=14');
    expect(html).not.toContain('value="/bookings?date=2026-07-31&amp;view=period&amp;period=14&amp;new=1"');
  });
});
