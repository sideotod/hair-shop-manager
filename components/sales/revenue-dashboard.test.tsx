import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const routerReplace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: routerReplace }) }));

vi.mock("recharts", async (importOriginal) => {
  const recharts = await importOriginal<typeof import("recharts")>();

  return {
    ...recharts,
    BarChart: ({ data, onClick }: { data?: ReadonlyArray<{ name?: string }>; onClick?: unknown }) => (
      <div data-bar-chart-items={data?.map((item) => item.name).join("|")} data-selection-chart={Boolean(onClick)} />
    ),
    LineChart: ({ onClick }: { onClick?: unknown }) => <div data-selection-chart={Boolean(onClick)} />,
    PieChart: ({ onClick }: { onClick?: unknown }) => <div data-selection-chart={Boolean(onClick)} />,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => children,
  };
});

import { focusChartSurface, nextRevenueQuery, replaceRevenueQuery, resolveRevenueSelection, restoreRevenueDrawerFocus, RevenueDashboard } from "./revenue-dashboard";
import { revenueAnalytics } from "../../lib/revenue-data";
import { AppShell } from "../app-shell";
import { RevenueDetailDrawer, dismissRevenueDrawer, revenueDrawerFocusTarget } from "./revenue-detail-drawer";
import { DEFAULT_REVENUE_QUERY } from "./revenue-query";

describe("RevenueDashboard", () => {
  it("renders decision-focused sales visualizations and accessible values", () => {
    const html = renderToStaticMarkup(<RevenueDashboard analytics={revenueAnalytics} />);

    expect(html).toContain("HAIRHAEYO");
    expect(html).toContain("헤어해요 · SALON MANAGEMENT");
    expect(html).not.toMatch(new RegExp(["HAIR", "NURI"].join(""), "i"));
    expect(html).not.toContain(["헤어", "누리"].join(""));
    expect(html).toContain("매출 분석");
    expect(html).toContain("일별 매출 · 순이익 추이");
    expect(html).toContain("결제수단 비중");
    expect(html).toContain("시술 카테고리 순위");
    expect(html).toContain("디자이너 매출 · 순이익");
    expect(html).toContain("총매출에서 샵 수익까지");
    expect(html).toContain("차트 데이터 표");
    expect(html).toContain("CSV 내보내기");
    expect(html).toContain("총매출 표시");
    expect(html).toContain("샵 수익 표시");
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("해석 요약");
  });

  it("renders server-provided values without recalculating them", () => {
    const analytics = {
      selectedPeriod: { start: "2026-08-01", end: "2026-08-01", label: "8월 1일" },
      comparisonPeriod: { start: "2026-07-31", end: "2026-07-31", label: "7월 31일" },
      metrics: [["테스트 총매출", "₩123", "테스트 비교", "text-[var(--success)]"]],
      daily: [{ date: "8/1", gross: 123, profit: 45 }],
      payments: [{ name: "테스트 결제", value: 100, count: 1, color: "#000000" }],
      services: [{ name: "테스트 시술", sales: 123 }],
      staff: [{ name: "테스트 담당자", sales: 123, profit: 45 }],
      deductions: [{ name: "테스트 공제", value: 78, color: "#000000" }],
    } as const;

    const html = renderToStaticMarkup(<RevenueDashboard analytics={analytics} />);

    expect(html).toContain("테스트 총매출");
    expect(html).toContain("₩123");
    expect(html).toContain("8/1");
    expect(html).toContain("테스트 결제 100%");
    expect(html).toContain("테스트 시술");
    expect(html).toContain('data-bar-chart-items="테스트 담당자"');
    expect(html).toContain('data-bar-chart-items="테스트 공제"');
    expect(html).not.toContain("₩29,960,000");
    expect(html).not.toContain("7.4%");
    expect(html).not.toContain("카드 비중 61%");
  });

  it("builds the dashboard CSV action from injected daily rows", () => {
    const analytics = {
      selectedPeriod: { start: "2026-08-01", end: "2026-08-01", label: "8월 1일" },
      comparisonPeriod: { start: "2026-07-31", end: "2026-07-31", label: "7월 31일" },
      metrics: [],
      daily: [{ date: "8/1", gross: 123, profit: 45 }],
      payments: [],
      services: [],
      staff: [],
      deductions: [],
    } as const;

    const html = renderToStaticMarkup(<RevenueDashboard analytics={analytics} />);
    const href = html.match(/href="([^"]+)"[^>]*>CSV 내보내기<\/a>/)?.[1];

    expect(href).toBeDefined();
    expect(decodeURIComponent(href ?? "")).toContain("8/1,123,45");
    expect(decodeURIComponent(href ?? "")).not.toContain("7/24,3480000,2240000");
  });

  it("renders keyboard-reachable value buttons for every analytics chart", () => {
    const html = renderToStaticMarkup(<RevenueDashboard analytics={revenueAnalytics} />);

    expect(html).toContain('aria-label="7/24 매출 상세 보기"');
    expect(html).toContain('aria-label="카드 결제수단 상세 보기"');
    expect(html).toContain('aria-label="컬러 시술 상세 보기"');
    expect(html).toContain('aria-label="서윤 담당자 상세 보기"');
    expect(html).toContain('aria-label="총매출 공제 상세 보기"');
    expect(html).toContain("₩10,480,000");
    expect(html).toContain("61%");
  });

  it("resolves all five Recharts payload shapes to aggregate keys", () => {
    expect(resolveRevenueSelection("date", { activeLabel: "7/24" }, revenueAnalytics)).toEqual({ kind: "date", key: "7/24" });
    expect(resolveRevenueSelection("payment", { activeTooltipIndex: "1" }, revenueAnalytics)).toEqual({ kind: "payment", key: "현금" });
    expect(resolveRevenueSelection("service", { activeTooltipIndex: "2" }, revenueAnalytics)).toEqual({ kind: "service", key: "클리닉" });
    expect(resolveRevenueSelection("staff", { activeTooltipIndex: "3" }, revenueAnalytics)).toEqual({ kind: "staff", key: "민아" });
    expect(resolveRevenueSelection("deduction", { activeTooltipIndex: "1" }, revenueAnalytics)).toEqual({ kind: "deduction", key: "환불" });
  });

  it("renders stable focusable chart surfaces for browser QA", () => {
    const html = renderToStaticMarkup(<RevenueDashboard analytics={revenueAnalytics} />);

    expect(html.match(/data-revenue-chart=/g)).toHaveLength(5);
    expect(html.match(/tabindex="0"/g)).toHaveLength(5);
  });

  it("renders semantic equivalents for every plotted chart value", () => {
    const html = renderToStaticMarkup(<RevenueDashboard analytics={revenueAnalytics} />);

    expect(html.match(/<table/g)).toHaveLength(5);
    for (const caption of ["일별 총매출과 샵 수익", "결제수단별 비중과 건수", "시술별 매출", "담당자별 매출과 샵 수익", "총매출과 공제 및 샵 수익"]) {
      expect(html).toContain(caption);
    }
    expect(html).toContain('aria-describedby="revenue-chart-date-title"');
    expect(html).toContain("카드</th><td");
    expect(html).toContain("150건");
    expect(html).toContain("인센티브</th><td");
  });

  it("exposes every server filter key", () => {
    const html = renderToStaticMarkup(<RevenueDashboard analytics={revenueAnalytics} />);

    for (const value of ["seoyun", "harin", "dohyeon", "mina", "color", "perm", "clinic", "cut", "card", "cash", "prepaid", "other"]) {
      expect(html).toContain(`value="${value}"`);
    }
  });

  it("applies preset ranges and navigates through App Router", () => {
    const query = nextRevenueQuery(DEFAULT_REVENUE_QUERY, { preset: "today" });

    expect(query).toMatchObject({ preset: "today", start: "2026-07-30", end: "2026-07-30" });
    replaceRevenueQuery({ replace: routerReplace }, query);
    expect(routerReplace).toHaveBeenCalledWith("?preset=today&start=2026-07-30&end=2026-07-30&compare=true&staff=all&service=all&payment=all");
  });

  it("focuses and returns the explicit chart surface", () => {
    const trigger = { focus: vi.fn() };

    expect(focusChartSurface(trigger)).toBe(trigger);
    expect(trigger.focus).toHaveBeenCalledOnce();
  });

  it("loads without importing the server revenue data module", async () => {
    vi.resetModules();
    vi.doMock("../../lib/revenue-data", () => { throw new Error("server revenue data loaded by client"); });

    try {
      await expect(import("./revenue-dashboard")).resolves.toHaveProperty("RevenueDashboard");
    } finally {
      vi.doUnmock("../../lib/revenue-data");
    }
  });

});

describe("AppShell", () => {
  it("makes the full shell inert while rendering an overlay as its sibling", () => {
    const html = renderToStaticMarkup(
      <AppShell overlay={<aside data-test-overlay>상세</aside>}>
        <main>본문</main>
      </AppShell>,
    );

    expect(html).toContain('data-app-shell-background="true" inert="" aria-hidden="true"');
    expect(html).toContain('data-test-overlay="true"');
  });
});

describe("RevenueDetailDrawer", () => {
  it("labels selected totals and links to filtered transaction records", () => {
    const html = renderToStaticMarkup(
      <RevenueDetailDrawer
        analytics={revenueAnalytics}
        onClose={() => undefined}
        query={DEFAULT_REVENUE_QUERY}
        selection={{ kind: "date", key: "7/24" }}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("7/24 매출 상세");
    expect(html).toContain("2026년 7월 24일–30일");
    expect(html).toContain("총매출");
    expect(html).toContain("₩10,480,000");
    expect(html).toContain("샵 수익");
    expect(html).toContain("₩6,080,000");
    expect(html).toContain("필터된 거래 기록 보기");
    expect(html).toContain("/sales/transactions?");
    expect(html).toContain("selection=date");
    expect(html).toContain("selectionKey=7%2F24");
    expect(html).toContain("닫기");
    expect(html).toContain("data-revenue-drawer-link");
  });

  it("dismisses on Escape without focusing the still-inert trigger", () => {
    let closed = false;

    dismissRevenueDrawer("Escape", () => { closed = true; });

    expect(closed).toBe(true);
  });

  it("restores trigger focus only after the drawer closes", () => {
    const trigger = { focus: vi.fn() };

    restoreRevenueDrawerFocus(true, trigger);
    expect(trigger.focus).not.toHaveBeenCalled();

    restoreRevenueDrawerFocus(false, trigger);
    expect(trigger.focus).toHaveBeenCalledOnce();
  });

  it("traps Tab and Shift+Tab between close and link", () => {
    const close = { focus: vi.fn() };
    const link = { focus: vi.fn() };

    expect(revenueDrawerFocusTarget("Tab", false, link, close, link)).toBe(close);
    expect(revenueDrawerFocusTarget("Tab", true, close, close, link)).toBe(link);
    expect(revenueDrawerFocusTarget("Tab", false, close, close, link)).toBeNull();
  });
});
