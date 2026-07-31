import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createSalonStore } from "../../lib/salon-store";
import { BookingsPage } from "./bookings-page";

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

  it("renders functional reservation, reminder, operating-hours, and disabled Naver controls without a designer field", () => {
    const html = page({ showNew: true });

    expect(html).toContain('aria-label="새 예약 등록"');
    expect(html).toContain('name="reminderDayBefore"');
    expect(html).toContain('name="bookingOpen"');
    expect(html).toContain('name="naverReservationCode"');
    expect(html).toContain("Naver 상태 확인 (dry-run)");
    expect(html).toContain("disabled / dry-run");
    expect(html).not.toContain('name="designer"');
    expect(html).not.toContain('name="staff"');
  });
});
