import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { buildPoints, dailyAxis, monthlyAxis } from "../../lib/revenue-aggregate";
import { customerBriefing, hourPattern, weekdayPattern } from "../../lib/salon-briefing";
import { buildRevenueAnalytics, buildRevenueTransactions } from "../../lib/revenue-data";
import { createSalonStore } from "../../lib/salon-store";
import { dismissRevenueDrawer, revenueDrawerFocusTarget, RevenueDetailDrawer } from "./revenue-detail-drawer";
import { barFill, barScale, focusChartSurface, resolveRevenueSelection, restoreRevenueDrawerFocus, revenueChartMotion, revenueChartMotions, RevenueDashboard, type RevenueChartData } from "./revenue-dashboard";

function analytics() { const store = createSalonStore(":memory:"); try { const snapshot = store.snapshot(); return buildRevenueAnalytics(buildRevenueTransactions(snapshot.ledger, snapshot.records.customers ?? []), { view: "month", cursor: "2026-07-31" }, "2026-07-31"); } finally { store.close(); } }

/** 일별·주별·월별 버튼이 고르는 차트 — 하루 단위 막대 한 벌. */
function dayChart(contextNote?: string): RevenueChartData {
  const store = createSalonStore(":memory:");
  try {
    const points = buildPoints(store.aggregateLedger("2026-07-01", "2026-08-01", "day"), "daily", dailyAxis("2026-07"), "2026-07-31");
    const summary = store.summarizeLedger("2026-07-01", "2026-08-01");
    return { kind: "day", span: "month", contextNote, label: "2026년 7월", points, total: summary.gross, count: summary.count, deltaPrevious: null };
  } finally { store.close(); }
}

/** 연도 버튼이 고르는 차트 — 그 해 열두 달. */
function monthChart(): RevenueChartData {
  const store = createSalonStore(":memory:");
  try {
    const points = buildPoints(store.aggregateLedger("2025-01-01", "2027-01-01", "month"), "monthly", monthlyAxis("2026"), "2026-07-31");
    const summary = store.summarizeLedger("2026-01-01", "2027-01-01");
    return { kind: "bar", title: "월별 매출", previousLabel: "전월", yearOverYearLabel: "전년", emptyText: "이 해에 기록된 매출이 없습니다.", drilldown: "month", label: "2026년", points, total: summary.gross, count: summary.count };
  } finally { store.close(); }
}

describe("RevenueDashboard", () => {
  it("uses chart-only 400–500ms motion and disables it for reduced motion", () => {
    expect(revenueChartMotion(false, 20, 480)).toMatchObject({ isAnimationActive: true, animationBegin: 20, animationDuration: 480 });
    expect(Object.values(revenueChartMotions(false)).every((item) => item.animationDuration >= 400 && item.animationDuration <= 500)).toBe(true);
    expect(Object.values(revenueChartMotions(true)).every((item) => !item.isAnimationActive && item.animationDuration === 0)).toBe(true);
  });

  it("renders owner-only KPIs, simplified navigation, CSV, print, permanent bar labels, and accessible chart values", () => {
    const html = renderToStaticMarkup(<RevenueDashboard analytics={analytics()} chart={dayChart()} query={{ view: "month", cursor: "2026-07-31" }} />);
    for (const text of ["총 매출", "실결제", "VAT", "지출", "샵 수익", "일별", "주별", "월별", "연도", "누적", "결제 등록", "CSV 내보내기", "인쇄", "시술 카테고리", "정산"]) expect(html).toContain(text);
    for (const text of ["담당자", "성별 매출", "신규 · 재방문"]) expect(html).not.toContain(text);
    expect(html.match(/data-revenue-chart=/g)).toHaveLength(2);
    expect(html.match(/<table/g)).toHaveLength(4);
  });

  /**
   * 기간 버튼이 곧 차트 선택이다. 예전에는 일별·월별·연도별 세 벌을 항상 함께 그려서
   * 버튼을 눌러도 차트가 그대로였다 — 버튼이 KPI·결제수단·정산·CSV 만 바꾸고 차트만 무시했다.
   */
  it("draws only the chart the period button selected", () => {
    const dayHtml = renderToStaticMarkup(<RevenueDashboard analytics={analytics()} chart={dayChart()} query={{ view: "month", cursor: "2026-07-31" }} />);
    const monthHtml = renderToStaticMarkup(<RevenueDashboard analytics={analytics()} chart={monthChart()} query={{ view: "year", cursor: "2026-01-01" }} />);

    expect(dayHtml).toContain("일별 매출");
    expect(dayHtml).not.toContain("월별 매출");
    expect(monthHtml).toContain("월별 매출");
    expect(monthHtml).not.toContain("일별 매출");
    expect(monthHtml).not.toContain("연도별 매출");
  });

  /** 하루를 고르면 막대가 한 개라 그 날이 든 달로 넓히는데, 넓힌 이유를 차트가 밝혀야 한다. */
  it("says why a single-day selection widened to its month", () => {
    const html = renderToStaticMarkup(<RevenueDashboard analytics={analytics()} chart={dayChart("2026년 7월 24일이 속한 달")} query={{ view: "day", cursor: "2026-07-24" }} />);

    expect(html).toContain("2026년 7월 24일이 속한 달");
  });

  it("ramps bar fills by rank and floors the scale so small values stay visible", () => {
    expect(barFill(0)).toBe("var(--brand)");
    expect(barFill(99)).toBe(barFill(4));
    expect(barScale(50, 100)).toBe(0.5);
    expect(barScale(1, 1000)).toBe(0.02);
    expect(barScale(10, 0)).toBe(0);
  });

  it("keeps a tooltip only for the pie and resolves all keyboard drilldown keys", () => {
    const data = analytics();
    expect(resolveRevenueSelection("date", { activeLabel: "7/24" }, data)).toEqual({ kind: "date", key: "7/24" });
    expect(resolveRevenueSelection("payment", { activeTooltipIndex: 0 }, data)).toEqual({ kind: "payment", key: "카드" });
    expect(resolveRevenueSelection("service", { activeTooltipIndex: 0 }, data)).toEqual({ kind: "service", key: "컬러" });
  });

  /** 브리핑이 없으면(=요약만 있는 호출) 화면은 문장 없이도 그대로 서야 한다. */
  it("renders the briefing sentence, visit patterns, and who-came table when the server sends them", () => {
    const briefing = {
      revenue: { headline: "₩3,262,000, 지난달보다 4% 줄었습니다.", evidence: "2026-07-01 ~ 2026-07-31 결제 89건", tone: "down" as const },
      weekdayHeadline: "금요일이 가장 붐빕니다 — 23건.",
      hourHeadline: "14시가 가장 붐빕니다 — 20건.",
      weekday: weekdayPattern([{ weekday: 5, gross: 804000, count: 23 }]),
      hour: hourPattern([{ hour: 14, gross: 700000, count: 20 }]),
      customers: customerBriefing({ visits: 89, customers: 72, newCustomers: 4 }),
      averageTicket: 36652,
    };
    const html = renderToStaticMarkup(<RevenueDashboard analytics={analytics()} briefing={briefing} chart={dayChart()} query={{ view: "month", cursor: "2026-07-31" }} />);

    for (const text of ["이번 기간 한 줄", "지난달보다 4% 줄었습니다", "금요일이 가장 붐빕니다", "14시가 가장 붐빕니다", "재방문 고객 비중", "객단가"]) expect(html).toContain(text);
    // "재방문율" 은 코호트 지표의 이름이다. 우리가 세는 것은 비중이므로 그 이름을 쓰지 않는다.
    expect(html).not.toContain("재방문율");
  });

  it("restores drawer focus", () => {
    const trigger = { focus: vi.fn() }; expect(focusChartSurface(trigger)).toBe(trigger); restoreRevenueDrawerFocus(false, trigger); expect(trigger.focus).toHaveBeenCalledTimes(2);
  });
});

describe("RevenueDetailDrawer", () => {
  it("links its selection to the transaction route and traps focus", () => {
    const html = renderToStaticMarkup(<RevenueDetailDrawer analytics={analytics()} onClose={() => undefined} query={{ view: "month", cursor: "2026-07-31" }} selection={{ kind: "payment", key: "카드" }} />);
    expect(html).toContain("/sales/transactions?view=month&amp;cursor=2026-07-31&amp;selection=payment&amp;selectionKey=%EC%B9%B4%EB%93%9C");
    const first = { focus: vi.fn() }; const last = { focus: vi.fn() };
    expect(revenueDrawerFocusTarget("Tab", false, last, first, last)).toBe(first);
    let closed = false; dismissRevenueDrawer("Escape", () => { closed = true; }); expect(closed).toBe(true);
  });
});
