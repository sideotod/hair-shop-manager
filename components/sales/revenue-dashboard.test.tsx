import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { buildPoints, dailyAxis, monthlyAxis, yearlyAxis } from "../../lib/revenue-aggregate";
import { buildRevenueAnalytics, buildRevenueTransactions } from "../../lib/revenue-data";
import { createSalonStore } from "../../lib/salon-store";
import { dismissRevenueDrawer, revenueDrawerFocusTarget, RevenueDetailDrawer } from "./revenue-detail-drawer";
import { barFill, barScale, focusChartSurface, resolveRevenueSelection, restoreRevenueDrawerFocus, revenueChartMotion, revenueChartMotions, RevenueDashboard } from "./revenue-dashboard";

function analytics() { const store = createSalonStore(":memory:"); try { const snapshot = store.snapshot(); return buildRevenueAnalytics(buildRevenueTransactions(snapshot.ledger, snapshot.records.customers ?? []), { view: "month", cursor: "2026-07-31" }, "2026-07-31"); } finally { store.close(); } }

function daily() {
  const store = createSalonStore(":memory:");
  try {
    const points = buildPoints(store.aggregateLedger("2026-07-01", "2026-08-01", "day"), "daily", dailyAxis("2026-07"), "2026-07-31");
    const summary = store.summarizeLedger("2026-07-01", "2026-08-01");
    return { label: "2026년 7월", points, total: summary.gross, count: summary.count, deltaPrevious: null };
  } finally { store.close(); }
}

function monthly() {
  const store = createSalonStore(":memory:");
  try {
    const points = buildPoints(store.aggregateLedger("2025-01-01", "2027-01-01", "month"), "monthly", monthlyAxis("2026"), "2026-07-31");
    const summary = store.summarizeLedger("2026-01-01", "2027-01-01");
    return { label: "2026년", points, total: summary.gross, count: summary.count };
  } finally { store.close(); }
}

function yearly() {
  const store = createSalonStore(":memory:");
  try {
    const rows = store.aggregateLedger("2000-01-01", "2100-01-01", "year");
    const summary = store.summarizeLedger("2000-01-01", "2100-01-01");
    return { label: "전체 기간", points: buildPoints(rows, "yearly", yearlyAxis(rows), "2026-07-31"), total: summary.gross, count: summary.count };
  } finally { store.close(); }
}

describe("RevenueDashboard", () => {
  it("uses chart-only 400–500ms motion and disables it for reduced motion", () => {
    expect(revenueChartMotion(false, 20, 480)).toMatchObject({ isAnimationActive: true, animationBegin: 20, animationDuration: 480 });
    expect(Object.values(revenueChartMotions(false)).every((item) => item.animationDuration >= 400 && item.animationDuration <= 500)).toBe(true);
    expect(Object.values(revenueChartMotions(true)).every((item) => !item.isAnimationActive && item.animationDuration === 0)).toBe(true);
  });

  it("renders owner-only KPIs, simplified navigation, CSV, print, permanent bar labels, and accessible chart values", () => {
    const html = renderToStaticMarkup(<RevenueDashboard analytics={analytics()} daily={daily()} monthly={monthly()} query={{ view: "month", cursor: "2026-07-31" }} yearly={yearly()} />);
    for (const text of ["총 매출", "실결제", "VAT", "지출", "샵 수익", "일별", "주별", "월별", "연도", "누적", "결제 등록", "CSV 내보내기", "인쇄", "시술 카테고리", "정산", "월별 매출", "연도별 매출"]) expect(html).toContain(text);
    for (const text of ["담당자", "성별 매출", "신규 · 재방문"]) expect(html).not.toContain(text);
    expect(html.match(/data-revenue-chart=/g)).toHaveLength(2);
    expect(html.match(/<table/g)).toHaveLength(6);
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
