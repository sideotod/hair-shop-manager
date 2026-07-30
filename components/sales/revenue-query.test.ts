import { describe, expect, it } from "vitest";

import { DEFAULT_REVENUE_QUERY, parseRevenueQuery, serializeRevenueQuery } from "./revenue-query";

describe("revenue query", () => {
  it("round-trips supported analytics filters", () => {
    const query = {
      preset: "week",
      start: "2026-07-24",
      end: "2026-07-30",
      compare: true,
      staff: "all",
      service: "color",
      payment: "card",
    } as const;

    expect(parseRevenueQuery(serializeRevenueQuery(query))).toEqual(query);
  });

  it("returns stable defaults for invalid dates and presets", () => {
    expect(parseRevenueQuery("preset=year&start=2026-99-40")).toEqual(DEFAULT_REVENUE_QUERY);
  });
});
