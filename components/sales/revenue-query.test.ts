import { describe, expect, it } from "vitest";

import { DEFAULT_REVENUE_QUERY, parseRevenueQuery, revenuePresetRange, serializeRevenueQuery } from "./revenue-query";

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
    expect(parseRevenueQuery("preset=week&start=2026-07-30&end=2026-07-24&staff=unknown&service=unknown&payment=unknown")).toEqual(DEFAULT_REVENUE_QUERY);
  });

  it("returns fixed ranges for every supported preset", () => {
    expect(revenuePresetRange("today")).toEqual({ start: "2026-07-30", end: "2026-07-30" });
    expect(revenuePresetRange("week")).toEqual({ start: "2026-07-24", end: "2026-07-30" });
    expect(revenuePresetRange("month")).toEqual({ start: "2026-07-01", end: "2026-07-30" });
    expect(revenuePresetRange("previous")).toEqual({ start: "2026-06-01", end: "2026-06-30" });
  });
});
