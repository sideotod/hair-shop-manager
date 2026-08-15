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
    // 예약 정책 폼은 `/settings?section=booking` 하나로 모았다 (설계 §5.3). 업무 화면은 값만 보여주고 링크한다.
    expect(html).not.toContain('name="bookingOpen"');
    expect(html).toContain('href="/settings?section=booking"');
    expect(html).toContain("09:30–21:00");
    expect(html).toContain('aria-label="네이버 예약 메일 연결"');
    expect(html).toContain('name="applicationPassword"');
    expect(html).toContain("Windows Credential Manager");
    expect(html).toContain("연결 테스트 및 저장");
    expect(html).not.toContain('name="designer"');
    expect(html).not.toContain('name="staff"');
  });

  it("keeps the Naver connection collapsed by default", () => {
    const html = page();

    expect(html).toContain('data-booking-settings="true"');
    expect(html).toContain("네이버 예약 메일 연동");
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

  it("closes registration back onto the booking being edited", () => {
    const html = page({ searchParams: { date: "2026-07-31", view: "day", edit: "booking-seed-1", new: "1" }, edit: "booking-seed-1", showNew: true });
    const close = html.match(/<a\b[^>]*data-dialog-close="true"[^>]*>/)?.[0].match(/href="([^"]+)"/)?.[1] ?? "";

    expect(close).toContain("edit=booking-seed-1");
    expect(close).not.toContain("new=1");
  });

  /** 행마다 결제·확정·완료를 다 펼치면 20행이 Tab 60정거장이 된다 (설계 §4.1). */
  describe("행의 다음 동작", () => {
    const booking = (id: string, status: string, startsAt = "2026-07-31T01:00:00.000Z") => ({ id, kind: "bookings", value: { customerId: "customer-seed-1", service: "커트", startsAt, endsAt: "2026-07-31T02:00:00.000Z", status }, createdAt: startsAt, updatedAt: startsAt, archivedAt: null });
    /** 한 행이 여는 `<details>` 안에도 버튼이 있으므로 행 밖의 다음 동작만 센다. */
    const nextActions = (html: string) => [...html.matchAll(/data-booking-next="([a-z]+)"/g)].map((match) => match[1]);
    const one = (status: string) => nextActions(page({ bookings: [booking("booking-next", status)] }));

    it("confirmed 와 in-progress 는 결제 등록 하나", () => {
      expect(one("confirmed")).toEqual(["payment"]);
      // 지금이 예약 구간 안이면 `lib/day-rail.ts:53` 이 in-progress 를 파생한다. 결제 동작은 같다.
      const now = new Date("2026-07-31T01:30:00.000Z");
      expect(nextActions(page({ bookings: [booking("booking-next", "confirmed")], now }))).toEqual(["payment"]);
    });

    it("waiting 은 예약 확정 하나, completed 는 없음", () => {
      expect(one("waiting")).toEqual(["confirm"]);
      expect(one("completed")).toEqual([]);
      expect(one("cancelled")).toEqual([]);
    });

    it("결제 링크가 현재 보기·날짜·기간을 returnTo 로 들고 간다", () => {
      const html = page({ bookings: [booking("booking-next", "confirmed")], searchParams: { date: "2026-07-31", view: "period", period: "14" }, view: "period", period: "14" });
      const href = html.match(/href="([^"]*pay=1[^"]*)"/)?.[1] ?? "";

      expect(href).toContain("booking=booking-next");
      expect(decodeURIComponent(href.split("returnTo=")[1] ?? "")).toBe("/bookings?date=2026-07-31&view=period&period=14");
    });
  });
});
