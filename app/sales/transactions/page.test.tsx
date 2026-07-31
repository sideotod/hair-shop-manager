import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import TransactionsPage from "./page";

describe("TransactionsPage", () => {
  it("renders a desktop owner transaction table from the same monthly aggregate", async () => {
    const html = renderToStaticMarkup(await TransactionsPage({ searchParams: Promise.resolve({ view: "month", cursor: "2026-07-31" }) }));
    expect(html.match(/data-revenue-transaction=/g)).toHaveLength(4);
    expect(html).toContain("ledger-seed-1");
    expect(html).toContain("결제");
    expect(html).not.toContain("담당자");
    expect(html).toContain("min-w-[1100px]");
  });
  it("shows an empty state and forwards the selected customer to payment", async () => {
    const html = renderToStaticMarkup(await TransactionsPage({ searchParams: Promise.resolve({ view: "day", cursor: "2026-07-31", customer: "customer-seed-2" }) }));
    expect(html).toContain("조건에 맞는 거래 기록이 없습니다.");
    expect(html).toContain("/sales?tab=payment&amp;customer=customer-seed-2");
  });
  it("filters a drilldown selection", async () => {
    const html = renderToStaticMarkup(await TransactionsPage({ searchParams: Promise.resolve({ view: "month", cursor: "2026-07-31", selection: "payment", selectionKey: "현금" }) }));
    expect(html.match(/data-revenue-transaction=/g)).toHaveLength(1);
    expect(html).toContain("ledger-seed-2");
  });
});
