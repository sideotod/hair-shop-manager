import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import TransactionsPage from "./page";

const baseQuery = { preset: "week", start: "2026-07-24", end: "2026-07-30", compare: "false", staff: "all", service: "all", payment: "all" } as const;

describe("TransactionsPage", () => {
  it("renders a desktop transaction table filtered by drawer selection", async () => {
    const page = await TransactionsPage({
      searchParams: Promise.resolve({
        ...baseQuery,
        start: "2026-07-24",
        end: "2026-07-24",
        staff: "seoyun",
        service: "color",
        payment: "card",
        selection: "date",
        selectionKey: "7/24",
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("거래 기록");
    expect(html).toContain("날짜 · 7/24");
    expect(html.match(/data-revenue-transaction=/g)).toHaveLength(150);
    expect(html).toContain("TX-20260724-001");
    expect(html).toContain("TX-20260724-150");
    expect(html).toContain("C-0724-001");
    expect(html).toContain("₩69,867");
    expect(html).toContain("₩40,533");
    expect(html).not.toContain("7/25");
    expect(html).toContain("<table");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain('href="/sales?preset=week&amp;start=2026-07-24&amp;end=2026-07-24&amp;compare=false&amp;staff=seoyun&amp;service=color&amp;payment=card"');
  });

  it("shows an explicit empty result after applying RevenueQuery filters", async () => {
    const page = await TransactionsPage({
      searchParams: Promise.resolve({ ...baseQuery, start: "2026-07-30", end: "2026-07-30", staff: "seoyun", service: "color", payment: "card" }),
    });

    expect(renderToStaticMarkup(page)).toContain("조건에 맞는 거래 기록이 없습니다.");
  });

  it("consumes a customer query as the payment-registration preselection", async () => {
    const page = await TransactionsPage({ searchParams: Promise.resolve({ ...baseQuery, new: "1", customer: "customer-seed-2" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('aria-label="결제 등록 고객"');
    expect(html).toContain("결제 등록 고객: <strong>이도윤</strong>");
    expect(html).toContain('type="hidden" name="customerId" value="customer-seed-2"');
  });

  it.each([
    [{ start: "2026-07-26", end: "2026-07-27" }, "7/26", "7/25"],
    [{ staff: "harin" }, "7/25", "7/24"],
    [{ service: "clinic" }, "7/26", "7/24"],
    [{ payment: "other" }, "7/27", "7/24"],
  ])("applies each RevenueQuery filter", async (searchParams, included, excluded) => {
    const page = await TransactionsPage({ searchParams: Promise.resolve({ ...baseQuery, ...searchParams }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain(included);
    expect(html).not.toContain(excluded);
  });

  it.each(["총매출", "샵 수익"])("keeps all query-matched records for %s drilldown", async (selectionKey) => {
    const page = await TransactionsPage({
      searchParams: Promise.resolve({ ...baseQuery, start: "2026-07-25", end: "2026-07-25", selection: "deduction", selectionKey }),
    });

    expect(renderToStaticMarkup(page).match(/data-revenue-transaction=/g)).toHaveLength(42);
  });
});
