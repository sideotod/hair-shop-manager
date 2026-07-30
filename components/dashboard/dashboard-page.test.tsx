import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DashboardPage } from "./dashboard-page";

describe("DashboardPage", () => {
  it("renders the core salon management overview", () => {
    const html = renderToStaticMarkup(<DashboardPage />);

    expect(html).toContain("HAIRHAEYO");
    expect(html).toContain("헤어해요 · SALON MANAGEMENT");
    expect(html).not.toMatch(new RegExp(["HAIR", "NURI"].join(""), "i"));
    expect(html).not.toContain(["헤어", "누리"].join(""));
    expect(html).toContain("오늘 현황");
    expect(html).toContain("오늘 매출");
    expect(html).toContain("오늘 예약");
    expect(html).toContain("디자이너 현황");
    expect(html).toContain("확인 필요");
  });
});
