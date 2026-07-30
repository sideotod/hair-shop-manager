import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", async (importOriginal) => {
  const recharts = await importOriginal<typeof import("recharts")>();

  return {
    ...recharts,
    BarChart: ({ data }: { data?: ReadonlyArray<{ name?: string }> }) => (
      <div data-bar-chart-items={data?.map((item) => item.name).join("|")} />
    ),
    ResponsiveContainer: ({ children }: { children: ReactNode }) => children,
  };
});

import { RevenueDashboard } from "./revenue-dashboard";

describe("RevenueDashboard", () => {
  it("renders decision-focused sales visualizations and accessible values", () => {
    const html = renderToStaticMarkup(<RevenueDashboard />);

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
  });

  it("renders values from the injected revenue aggregate", () => {
    const analytics = {
      selectedPeriod: { start: "2026-08-01", end: "2026-08-01", label: "8월 1일" },
      comparisonPeriod: { start: "2026-07-31", end: "2026-07-31", label: "7월 31일" },
      metrics: [["테스트 총매출", "₩123", "테스트 비교", "text-[var(--success)]"]],
      daily: [{ date: "8/1", gross: 123, profit: 45 }],
      payments: [{ name: "테스트 결제", value: 100, color: "#000000" }],
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
});
