import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { defaultRevenueQuery } from "./revenue-query";
import { SalesControls } from "./sales-controls";

const query = defaultRevenueQuery("2026-08-06");

function viewButtons(html: string) {
  const nav = html.match(/<nav[^>]*aria-label="매출 조회"[\s\S]*?<\/nav>/)?.[0] ?? "";
  return [...nav.matchAll(/<a\b[^>]*class="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, className, label]) => ({ className, label }));
}

describe("SalesControls", () => {
  it("offers the same five periods everywhere the sales workspace renders", () => {
    const html = renderToStaticMarkup(<SalesControls label="2026년 8월" query={query} />);

    expect(viewButtons(html).map((button) => button.label)).toEqual(["일별", "주별", "월별", "연도", "누적"]);
  });

  it("marks the active period with colour only, so the button box never resizes", () => {
    const html = renderToStaticMarkup(<SalesControls label="2026년 8월" query={{ ...query, view: "month" }} />);
    const buttons = viewButtons(html);

    expect(buttons.every((button) => /(?:^|\s)border(?:\s|$)/.test(button.className))).toBe(true);
    const sizing = buttons.map((button) => button.className.split(/\s+/).filter((token) => /^(?:px|py|text)-/.test(token)).sort().join(" "));
    expect(new Set(sizing).size).toBe(1);
  });

  it("marks the current period for assistive technology", () => {
    const html = renderToStaticMarkup(<SalesControls label="2026년 8월" query={{ ...query, view: "week" }} />);

    expect(html).toContain('aria-current="page"');
  });
});
