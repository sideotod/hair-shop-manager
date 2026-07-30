import { describe, expect, it } from "vitest";

import SalesPage from "./page";

describe("SalesPage", () => {
  it("passes searchParams-filtered server analytics to the client dashboard", async () => {
    const page = await SalesPage({
      searchParams: Promise.resolve({ preset: "week", start: "2026-07-25", end: "2026-07-25", compare: "false", staff: "harin", service: "perm", payment: "cash" }),
    });

    expect(page.props.analytics.metrics[0][1]).toBe("₩8,640,000");
    expect(page.props.analytics.metrics[2][1]).toBe("42건");
    expect(page.props.query).toMatchObject({ start: "2026-07-25", end: "2026-07-25", staff: "harin", service: "perm", payment: "cash" });
  });
});
