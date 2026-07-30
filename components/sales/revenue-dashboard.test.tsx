import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

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
});
