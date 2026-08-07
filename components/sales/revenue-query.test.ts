import { describe, expect, it } from "vitest";

import { defaultRevenueQuery, nextRevenueQuery, parseRevenueQuery, previousRevenueQuery, revenueRange, revenueRangeExclusive, serializeRevenueQuery } from "./revenue-query";

describe("revenue query", () => {
  it.each(["day", "week", "month", "year", "total"] as const)("round-trips the %s view without legacy filters", (view) => {
    const query = { view, cursor: "2026-07-31" } as const;

    expect(parseRevenueQuery(serializeRevenueQuery(query), "2026-08-01")).toEqual(query);
    expect(serializeRevenueQuery(query)).toBe(`view=${view}&cursor=2026-07-31`);
  });

  it("returns stable defaults for invalid views and dates", () => {
    const currentSeoulDate = "2026-08-01";
    expect(defaultRevenueQuery(currentSeoulDate)).toEqual({ view: "month", cursor: currentSeoulDate });
    expect(parseRevenueQuery("view=quarter&cursor=2026-07-31", currentSeoulDate)).toEqual(defaultRevenueQuery(currentSeoulDate));
    expect(parseRevenueQuery("view=day&cursor=2026-02-30", currentSeoulDate)).toEqual(defaultRevenueQuery(currentSeoulDate));
  });

  it("moves day and month cursors with calendar-safe previous and next helpers", () => {
    expect(previousRevenueQuery({ view: "day", cursor: "2026-03-01" })).toEqual({ view: "day", cursor: "2026-02-28" });
    expect(nextRevenueQuery({ view: "day", cursor: "2026-02-28" })).toEqual({ view: "day", cursor: "2026-03-01" });
    expect(previousRevenueQuery({ view: "month", cursor: "2026-03-31" })).toEqual({ view: "month", cursor: "2026-02-01" });
    expect(previousRevenueQuery({ view: "week", cursor: "2026-08-05" })).toEqual({ view: "week", cursor: "2026-07-29" });
    expect(nextRevenueQuery({ view: "week", cursor: "2026-07-29" })).toEqual({ view: "week", cursor: "2026-08-05" });
    expect(nextRevenueQuery({ view: "month", cursor: "2026-12-15" })).toEqual({ view: "month", cursor: "2027-01-01" });
    expect(nextRevenueQuery({ view: "total", cursor: "2026-07-31" })).toEqual({ view: "total", cursor: "2026-07-31" });
  });

  it("resolves intuitive day, month, and total ranges", () => {
    expect(revenueRange({ view: "day", cursor: "2026-07-31" })).toEqual({ start: "2026-07-31", end: "2026-07-31", label: "2026년 7월 31일" });
    expect(revenueRange({ view: "month", cursor: "2026-02-18" })).toEqual({ start: "2026-02-01", end: "2026-02-28", label: "2026년 2월" });
    expect(revenueRange({ view: "week", cursor: "2026-08-05" })).toEqual({ start: "2026-08-03", end: "2026-08-09", label: "2026년 8월 3일 주" });
    expect(revenueRange({ view: "week", cursor: "2026-08-02" })).toEqual({ start: "2026-07-27", end: "2026-08-02", label: "2026년 7월 27일 주" });
    expect(revenueRange({ view: "total", cursor: "2026-07-31" })).toEqual({ start: "0000-01-01", end: "9999-12-31", label: "누적" });
    expect(revenueRange({ view: "year", cursor: "2026-07-31" })).toEqual({ start: "2026-01-01", end: "2026-12-31", label: "2026년" });
  });

  it("keeps a valid view when the cursor is absent", () => {
    // Previously any view without a cursor silently fell back to the month view (A3-4).
    expect(parseRevenueQuery("view=total", "2026-08-06")).toEqual({ view: "total", cursor: "2026-08-06" });
    expect(parseRevenueQuery("view=day", "2026-08-06")).toEqual({ view: "day", cursor: "2026-08-06" });
    expect(parseRevenueQuery("view=year", "2026-08-06")).toEqual({ view: "year", cursor: "2026-08-06" });
    // A malformed cursor still resets both, since the whole link is untrustworthy.
    expect(parseRevenueQuery("view=day&cursor=2026-02-30", "2026-08-06")).toEqual(defaultRevenueQuery("2026-08-06"));
  });

  it("moves the year cursor to January of the adjacent year", () => {
    expect(previousRevenueQuery({ view: "year", cursor: "2026-07-31" })).toEqual({ view: "year", cursor: "2025-01-01" });
    expect(nextRevenueQuery({ view: "year", cursor: "2026-07-31" })).toEqual({ view: "year", cursor: "2027-01-01" });
  });

  it("selects the same days half-open as the inclusive range does", () => {
    for (const query of [
      { view: "day", cursor: "2026-07-31" },
      { view: "week", cursor: "2026-08-05" },
      { view: "month", cursor: "2026-02-18" },
      { view: "year", cursor: "2026-07-31" },
    ] as const) {
      const inclusive = revenueRange(query);
      const exclusive = revenueRangeExclusive(query);
      expect(exclusive.start).toBe(inclusive.start);
      expect(exclusive.endExclusive > inclusive.end).toBe(true);
      // Exactly one day wider, so no day outside the inclusive range can slip in.
      const dayAfterEnd = new Date(`${inclusive.end}T00:00:00Z`);
      dayAfterEnd.setUTCDate(dayAfterEnd.getUTCDate() + 1);
      expect(exclusive.endExclusive).toBe(dayAfterEnd.toISOString().slice(0, 10));
    }
  });

  it("uses the real ledger span for the total view instead of a hardcoded one", () => {
    const query = { view: "total", cursor: "2026-08-06" } as const;
    expect(revenueRangeExclusive(query, { first: "2020-02-18", last: "2026-08-03" })).toEqual({
      start: "2020-02-18",
      endExclusive: "2026-08-04",
      label: "누적",
    });
    expect(revenueRangeExclusive(query, null)).toEqual({ start: "0000-01-01", endExclusive: "9999-12-31", label: "누적" });
  });
});
