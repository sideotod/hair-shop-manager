import { describe, expect, it } from "vitest";

import { defaultRevenueQuery, nextRevenueQuery, parseRevenueQuery, previousRevenueQuery, revenueRange, serializeRevenueQuery } from "./revenue-query";

describe("revenue query", () => {
  it.each(["day", "month", "total"] as const)("round-trips the %s view without legacy filters", (view) => {
    const query = { view, cursor: "2026-07-31" } as const;

    expect(parseRevenueQuery(serializeRevenueQuery(query), "2026-08-01")).toEqual(query);
    expect(serializeRevenueQuery(query)).toBe(`view=${view}&cursor=2026-07-31`);
  });

  it("returns stable defaults for invalid views and dates", () => {
    const currentSeoulDate = "2026-08-01";
    expect(defaultRevenueQuery(currentSeoulDate)).toEqual({ view: "month", cursor: currentSeoulDate });
    expect(parseRevenueQuery("view=week&cursor=2026-07-31", currentSeoulDate)).toEqual(defaultRevenueQuery(currentSeoulDate));
    expect(parseRevenueQuery("view=day&cursor=2026-02-30", currentSeoulDate)).toEqual(defaultRevenueQuery(currentSeoulDate));
  });

  it("moves day and month cursors with calendar-safe previous and next helpers", () => {
    expect(previousRevenueQuery({ view: "day", cursor: "2026-03-01" })).toEqual({ view: "day", cursor: "2026-02-28" });
    expect(nextRevenueQuery({ view: "day", cursor: "2026-02-28" })).toEqual({ view: "day", cursor: "2026-03-01" });
    expect(previousRevenueQuery({ view: "month", cursor: "2026-03-31" })).toEqual({ view: "month", cursor: "2026-02-01" });
    expect(nextRevenueQuery({ view: "month", cursor: "2026-12-15" })).toEqual({ view: "month", cursor: "2027-01-01" });
    expect(nextRevenueQuery({ view: "total", cursor: "2026-07-31" })).toEqual({ view: "total", cursor: "2026-07-31" });
  });

  it("resolves intuitive day, month, and total ranges", () => {
    expect(revenueRange({ view: "day", cursor: "2026-07-31" })).toEqual({ start: "2026-07-31", end: "2026-07-31", label: "2026년 7월 31일" });
    expect(revenueRange({ view: "month", cursor: "2026-02-18" })).toEqual({ start: "2026-02-01", end: "2026-02-28", label: "2026년 2월" });
    expect(revenueRange({ view: "total", cursor: "2026-07-31" })).toEqual({ start: "0000-01-01", end: "9999-12-31", label: "누적" });
  });
});
