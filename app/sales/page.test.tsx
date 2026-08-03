import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SalesPage from "./page";

describe("SalesPage", () => {
  it("builds server analytics from the immutable ledger for a simple view", async () => {
    const page = await SalesPage({ searchParams: Promise.resolve({ view: "month", cursor: "2026-07-31" }) });
    const analytics = page.props.analytics;
    expect(analytics.totals.total).toBe(analytics.transactions.reduce((total: number, row: { gross: number }) => total + row.gross, 0));
    expect(analytics.settlement.find((row: { name: string }) => row.name === "실결제")?.value).toBe(analytics.transactions.filter((row: { status: string }) => row.status !== "지출").reduce((total: number, row: { netPaid: number }) => total + row.netPaid, 0));
  });
  it("opens payment registration on the sales tab with a preselected customer", async () => {
    const page = await SalesPage({ searchParams: Promise.resolve({ tab: "payment", customer: "customer-seed-2" }) });
    expect(renderToStaticMarkup(page)).toContain('value="customer-seed-2" selected=""');
  });
  it("opens the expense and reconciliation tab from the same ledger snapshot", async () => {
    const page = await SalesPage({ searchParams: Promise.resolve({ tab: "expenses" }) });
    expect(renderToStaticMarkup(page)).toContain("기간 정산");
  });
});
