import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SalesPage from "./page";

describe("SalesPage", () => {
  it("builds server analytics from the immutable ledger for a simple view", async () => {
    const page = await SalesPage({ searchParams: Promise.resolve({ view: "month", cursor: "2026-07-31" }) });
    expect(page.props.analytics.totals).toEqual({ today: 0, month: 29960000, total: 29960000 });
    expect(page.props.analytics.transactions.every((row: { status: string }) => row.status === "결제")).toBe(true);
  });
  it("opens payment registration on the sales tab with a preselected customer", async () => {
    const page = await SalesPage({ searchParams: Promise.resolve({ tab: "payment", customer: "customer-seed-2" }) });
    expect(renderToStaticMarkup(page)).toContain('value="customer-seed-2" selected=""');
  });
});
