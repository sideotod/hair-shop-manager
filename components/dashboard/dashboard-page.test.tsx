import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AuditEvent, LedgerEntry } from "../../lib/salon-domain";
import { createSalonStore } from "../../lib/salon-store";
import { AppShell } from "../app-shell";
import { DashboardPage, type DashboardData } from "./dashboard-page";

const today = new Date("2026-07-31T03:00:00.000Z");

/** 라우트(`app/(shell)/page.tsx`)가 하는 좁은 조회를 테스트에서 재현한다. */
function seededData(): DashboardData {
  const store = createSalonStore(":memory:");
  const snapshot = store.snapshot();
  return {
    malformedLedgerDates: store.countMalformedDates(),
    recentAudit: store.recentAuditEvents(5),
    records: snapshot.records,
    settings: snapshot.settings,
    todayLedger: snapshot.ledger,
  };
}

describe("DashboardPage", () => {
  it("renders the owner operations dashboard from one salon snapshot", () => {
    const html = renderToStaticMarkup(<DashboardPage data={seededData()} today={today} />);

    expect(html).not.toContain("직원");
    expect(html).not.toContain("디자이너");

    expect(html).toContain("오늘 매출");
    expect(html).toContain("오늘 예약");
    expect(html).toContain("오늘 1건");
    expect(html).toContain("내일 1건");
    expect(html).toContain("모레 1건");
    expect(html).toContain("글피 1건");
    expect(html).toContain("운영 안내");
    expect(html).toContain("최근 감사 이력");

    // 고객 등록은 페이지를 떠나지 않는다. 같은 화면 위에 팝업만 연다.
    for (const href of ["/?new=1", "/bookings?new=1", "/?pay=1"]) {
      expect(html).toContain(`href="${href}"`);
    }
    for (const hidden of ["문자 발송", "SMS", "자동 문자", "자동화 대기열", "/messages"]) expect(html).not.toContain(hidden);
  });

  it("uses the configured owner label and renders explicit empty states", () => {
    const seeded = seededData();
    const data: DashboardData = {
      ...seeded,
      malformedLedgerDates: 0,
      recentAudit: [],
      records: {},
      settings: { ...seeded.settings, ownerName: "이수진", smsRemaining: 0 },
      todayLedger: [],
    };
    const html = renderToStaticMarkup(<DashboardPage data={data} today={today} />);

    expect(html).toContain("오늘 예약이 없습니다.");
    for (const hidden of ["SMS", "자동 문자", "자동화 대기열", "/messages"]) expect(html).not.toContain(hidden);
    expect(html).toContain("공지사항이 없습니다.");
    expect(html).toContain("감사 이력이 없습니다.");
    expect(html).toContain('data-dashboard-empty-timeline="true"');
    expect(html).toContain("min-h-[280px]");
    expect(html).toContain('data-dashboard-timeline-layout="compact"');
    expect(html).toContain("items-start");
  });

  it("excludes malformed dates and renders an explicit correction warning", () => {
    const seeded = seededData();
    const malformedLedger: LedgerEntry = {
      id: "ledger-malformed",
      requestKey: "malformed-ledger-date",
      kind: "payment",
      occurredAt: "not-a-date",
      correctionOf: null,
      grossWon: 999999999,
      amountWon: 999999999,
      discountWon: 0,
      vatWon: 0,
      feeWon: 0,
      expenseWon: 0,
      incentiveWon: 0,
      pointsWon: 0,
      couponWon: 0,
      profitWon: 999999999,
      details: {},
    };
    const malformedAudit: AuditEvent = {
      id: "audit-malformed",
      occurredAt: "not-a-date",
      actor: "사용자",
      action: "malformed-audit",
      kind: "audit",
      recordId: null,
      payload: null,
    };
    const data: DashboardData = {
      ...seeded,
      // 원장 1행 + 감사 1행이 깨졌다. 라우트는 이 값을 SQL 이 아니라 날짜 열 스캔으로 센다.
      malformedLedgerDates: 2,
      recentAudit: [malformedAudit],
      records: {
        ...seeded.records,
        bookings: [
          ...(seeded.records.bookings ?? []),
          {
            id: "booking-malformed",
            kind: "bookings",
            value: { customerId: "customer-seed-1", startsAt: "not-a-date", service: "깨진 날짜 예약", status: "confirmed" },
            createdAt: "2026-07-31T00:00:00.000Z",
            updatedAt: "2026-07-31T00:00:00.000Z",
            archivedAt: null,
          },
        ],
      },
      todayLedger: [malformedLedger],
    };

    const html = renderToStaticMarkup(<DashboardPage data={data} today={today} />);

    expect(html).toContain("날짜 확인 필요: 3건");
    expect(html).toContain("오늘 1건");
    expect(html).not.toContain("오늘 2건");
    expect(html).not.toContain("깨진 날짜 예약");
    expect(html).toContain("₩0");
    expect(html).not.toContain("₩999,999,999");
    expect(html).toContain("사용자 · malformed-audit");
    expect(html).toContain("audit · 날짜 확인 필요");
  });

  /** 예약 블록이 포커스를 받게 된 뒤로 DOM 순서가 곧 Tab 순서다 (설계 §4.2). */
  describe("하루 축 예약 블록", () => {
    const booking = (id: string, status: string, startHour: number) => ({
      id, kind: "bookings", archivedAt: null, createdAt: "2026-07-31T00:00:00.000Z", updatedAt: "2026-07-31T00:00:00.000Z",
      value: { customerId: "customer-seed-1", service: "커트", status, startsAt: `2026-07-31T${String(startHour - 9).padStart(2, "0")}:00:00.000Z`, endsAt: `2026-07-31T${String(startHour - 8).padStart(2, "0")}:00:00.000Z` },
    });
    const railHtml = (...list: ReturnType<typeof booking>[]) => { const seeded = seededData(); return renderToStaticMarkup(<DashboardPage data={{ ...seeded, records: { ...seeded.records, bookings: list } }} today={today} />); };

    it("빈 시간과 예약이 시작 시각 순서로 한 목록에 섞인다", () => {
      // 10시·14시 예약이면 09–10, 11–14, 15–영업종료 세 구간이 빈다. 두 배열을 따로 그리면
      // "빈 시간 셋 → 예약 둘" 이 되어 Tab 이 하루를 두 번 훑는다.
      const html = railHtml(booking("booking-a", "confirmed", 10), booking("booking-b", "confirmed", 14));
      const order = [...html.matchAll(/분 비어 있음|data-booking-status="[a-z-]+"/g)].map((match) => match[0].startsWith("data") ? "예약" : "빈시간");

      expect(order).toEqual(["빈시간", "예약", "빈시간", "예약", "빈시간"]);
    });

    it("상태가 정하는 목적지로 링크가 걸리고 완료는 링크가 없다", () => {
      const html = railHtml(booking("booking-a", "confirmed", 10), booking("booking-b", "completed", 14));

      expect(html).toContain(`href="/?pay=1&amp;booking=booking-a&amp;returnTo=${encodeURIComponent("/bookings?date=2026-07-31")}"`);
      expect(html).not.toContain("booking=booking-b");
      // 완료 블록도 상태 텍스트·점·배지는 그대로 남는다 — 색만으로 상태를 말하지 않는다.
      expect(html).toContain('data-booking-status="completed"');
    });
  });

  it("keeps the token scope wrapping the shell background", () => {    const html = renderToStaticMarkup(
      <AppShell
        ownerName="사용자"
        pathname="/"
        settings={{ brandColor: "#123456" }}
        shopName="헤어해요"
      >
        <main>배경</main>
      </AppShell>,
    );

    expect(html).toContain("data-app-shell-background");
    expect(html).toMatch(/data-app-shell-token-scope[^>]*style="[^"]*--brand:#123456[^"]*"[\s\S]*data-app-shell-background/);
  });

  it("reads persisted menu visibility and visual tokens without changing route links", () => {
    // 설정 하위 목록은 `/settings` 에 있을 때만 편다. 헤더 도움말 링크가 사라져 이 검사도 그 경로로 옮겼다.
    const html = renderToStaticMarkup(<AppShell pathname="/settings" settings={{ hiddenMenus: ["/messages"], backgroundColor: "#abcdef", brandColor: "#123456" }}><main>설정 적용</main></AppShell>);
    expect(html).not.toContain('href="/messages"');
    expect(html).not.toContain('aria-label="설정 구역"');
    expect(html).toContain("--background:#abcdef");
    expect(html).toContain("--brand:#123456");
  });
});
