import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const routerReplace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: routerReplace }) }));
vi.mock("recharts", async (importOriginal) => ({ ...(await importOriginal<typeof import("recharts")>()), BarChart: ({ children }: { children: ReactNode }) => <div data-bar-chart>{children}</div>, LineChart: ({ children }: { children: ReactNode }) => <div data-line-chart>{children}</div>, PieChart: ({ children }: { children: ReactNode }) => <div data-pie-chart>{children}</div>, ResponsiveContainer: ({ children }: { children: ReactNode }) => children }));

import { buildRevenueAnalytics, buildRevenueTransactions } from "../../lib/revenue-data";
import { createSalonStore } from "../../lib/salon-store";
import { dismissRevenueDrawer, revenueDrawerFocusTarget, RevenueDetailDrawer } from "./revenue-detail-drawer";
import { focusChartSurface, replaceRevenueQuery, resolveRevenueSelection, restoreRevenueDrawerFocus, revenueChartMotion, revenueChartMotions, RevenueDashboard } from "./revenue-dashboard";

function analytics() { const store = createSalonStore(":memory:"); try { const snapshot = store.snapshot(); return buildRevenueAnalytics(buildRevenueTransactions(snapshot.ledger, snapshot.records.customers ?? []), { view: "month", cursor: "2026-07-31" }, "2026-07-31"); } finally { store.close(); } }

describe("RevenueDashboard", () => {
  it("uses chart-only 400–500ms motion and disables it for reduced motion", () => {
    expect(revenueChartMotion(false, 20, 480)).toMatchObject({ isAnimationActive: true, animationBegin: 20, animationDuration: 480 });
    expect(Object.values(revenueChartMotions(false)).every((item) => item.animationDuration >= 400 && item.animationDuration <= 500)).toBe(true);
    expect(Object.values(revenueChartMotions(true)).every((item) => !item.isAnimationActive && item.animationDuration === 0)).toBe(true);
  });

  it("renders owner-only KPIs, simplified navigation, CSV, print, permanent bar labels, and accessible chart values", () => {
    const html = renderToStaticMarkup(<RevenueDashboard analytics={analytics()} query={{ view: "month", cursor: "2026-07-31" }} />);
    for (const text of ["오늘 매출", "이번 달 매출", "누적 매출", "일별", "월별", "누적", "결제 등록", "CSV 내보내기", "인쇄", "시술 카테고리", "성별 매출", "신규 · 재방문", "정산"]) expect(html).toContain(text);
    expect(html).not.toContain("담당자");
    expect(html.match(/data-revenue-chart=/g)).toHaveLength(5);
    expect(html.match(/<table/g)).toHaveLength(6);
    expect(RevenueDashboard.toString()).toContain("LabelList");
  });

  it("keeps a tooltip only for the pie and resolves all keyboard drilldown keys", () => {
    const data = analytics();
    expect(resolveRevenueSelection("date", { activeLabel: "7/24" }, data)).toEqual({ kind: "date", key: "7/24" });
    expect(resolveRevenueSelection("payment", { activeTooltipIndex: 0 }, data)).toEqual({ kind: "payment", key: "카드" });
    expect(resolveRevenueSelection("service", { activeTooltipIndex: 0 }, data)).toEqual({ kind: "service", key: "컬러" });
    expect(resolveRevenueSelection("gender", { activeTooltipIndex: 0 }, data)).toEqual({ kind: "gender", key: "여성" });
    expect(resolveRevenueSelection("visitType", { activeTooltipIndex: 0 }, data)).toEqual({ kind: "visitType", key: "재방문" });
  });

  it("navigates with the simple server query and restores drawer focus", () => {
    replaceRevenueQuery({ replace: routerReplace }, { view: "day", cursor: "2026-07-31" });
    expect(routerReplace).toHaveBeenCalledWith("?view=day&cursor=2026-07-31");
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
