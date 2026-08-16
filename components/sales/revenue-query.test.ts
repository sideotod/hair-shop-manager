import { describe, expect, it } from "vitest";

import { defaultRevenueQuery, nextRevenueQuery, parseRevenueQuery, previousRevenueQuery, revenueDayRange, revenueQueryMoves, revenueRange, revenueRangeExclusive, serializeRevenueQuery } from "./revenue-query";

describe("revenue query", () => {
  it.each(["day", "week", "month", "year"] as const)("round-trips the %s view without legacy filters", (view) => {
    const query = { view, cursor: "2026-07-31" } as const;

    expect(parseRevenueQuery(serializeRevenueQuery(query), "2026-08-01")).toEqual(query);
    expect(serializeRevenueQuery(query)).toBe(`view=${view}&cursor=2026-07-31`);
  });

  it("returns stable defaults for invalid views and dates", () => {
    const currentSeoulDate = "2026-08-01";
    expect(defaultRevenueQuery(currentSeoulDate)).toEqual({ view: "month", cursor: currentSeoulDate });
    expect(parseRevenueQuery("view=quarter&cursor=2026-07-31", currentSeoulDate)).toEqual(defaultRevenueQuery(currentSeoulDate));
    expect(parseRevenueQuery("view=day&cursor=2026-02-30", currentSeoulDate)).toEqual(defaultRevenueQuery(currentSeoulDate));
    // `total` 칩이 사라졌다. 예전 링크는 조용히 기본값(월별)으로 떨어진다.
    expect(parseRevenueQuery("view=total&cursor=2026-07-31", currentSeoulDate)).toEqual(defaultRevenueQuery(currentSeoulDate));
  });

  it("moves the day window a month at a time and the week or month window a year at a time", () => {
    expect(previousRevenueQuery({ view: "day", cursor: "2026-03-15" })).toEqual({ view: "day", cursor: "2026-02-01" });
    expect(nextRevenueQuery({ view: "day", cursor: "2026-12-31" })).toEqual({ view: "day", cursor: "2027-01-01" });
    expect(previousRevenueQuery({ view: "week", cursor: "2026-08-05" })).toEqual({ view: "week", cursor: "2025-01-01" });
    expect(nextRevenueQuery({ view: "week", cursor: "2026-08-05" })).toEqual({ view: "week", cursor: "2027-01-01" });
    expect(previousRevenueQuery({ view: "month", cursor: "2026-03-31" })).toEqual({ view: "month", cursor: "2025-01-01" });
    expect(nextRevenueQuery({ view: "month", cursor: "2026-12-15" })).toEqual({ view: "month", cursor: "2027-01-01" });
  });

  it("never moves the year view, which already shows everything", () => {
    const query = { view: "year", cursor: "2026-07-31" } as const;
    expect(revenueQueryMoves(query)).toBe(false);
    expect(previousRevenueQuery(query)).toEqual(query);
    expect(nextRevenueQuery(query)).toEqual(query);
    for (const view of ["day", "week", "month"] as const) expect(revenueQueryMoves({ view, cursor: "2026-07-31" })).toBe(true);
  });

  it("gives each chip a window its bar unit can be read in", () => {
    // 일별 = 한 달의 날. 예전에는 하루라 막대가 하나뿐이었다.
    expect(revenueRange({ view: "day", cursor: "2026-07-31" })).toEqual({ start: "2026-07-01", end: "2026-07-31", label: "2026년 7월" });
    // 주별·월별 = 한 해. 같은 창을 다른 단위로 자른다.
    expect(revenueRange({ view: "week", cursor: "2026-08-05" })).toEqual({ start: "2026-01-01", end: "2026-12-31", label: "2026년" });
    expect(revenueRange({ view: "month", cursor: "2026-02-18" })).toEqual({ start: "2026-01-01", end: "2026-12-31", label: "2026년" });
    // 년별 = 전체. 원장 범위를 받으면 진짜 첫날~마지막날, 못 받으면 "전부 통과" 자리표시.
    expect(revenueRange({ view: "year", cursor: "2026-07-31" }, { first: "2020-02-18", last: "2026-08-03" })).toEqual({ start: "2020-02-18", end: "2026-08-03", label: "전체 기간" });
    expect(revenueRange({ view: "year", cursor: "2026-07-31" })).toEqual({ start: "0000-01-01", end: "9999-12-31", label: "전체 기간" });
  });

  it("still resolves a single day for links that mean one day", () => {
    expect(revenueDayRange("2026-07-31")).toEqual({ start: "2026-07-31", endExclusive: "2026-08-01" });
    expect(revenueDayRange("2026-12-31")).toEqual({ start: "2026-12-31", endExclusive: "2027-01-01" });
  });

  it("keeps a valid view when the cursor is absent", () => {
    // Previously any view without a cursor silently fell back to the month view (A3-4).
    expect(parseRevenueQuery("view=week", "2026-08-06")).toEqual({ view: "week", cursor: "2026-08-06" });
    expect(parseRevenueQuery("view=day", "2026-08-06")).toEqual({ view: "day", cursor: "2026-08-06" });
    expect(parseRevenueQuery("view=year", "2026-08-06")).toEqual({ view: "year", cursor: "2026-08-06" });
    // A malformed cursor still resets both, since the whole link is untrustworthy.
    expect(parseRevenueQuery("view=day&cursor=2026-02-30", "2026-08-06")).toEqual(defaultRevenueQuery("2026-08-06"));
  });

  it("selects the same days half-open as the inclusive range does", () => {
    for (const query of [
      { view: "day", cursor: "2026-07-31" },
      { view: "week", cursor: "2026-08-05" },
      { view: "month", cursor: "2026-02-18" },
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

  it("uses the real ledger span for the year view instead of a hardcoded one", () => {
    const query = { view: "year", cursor: "2026-08-06" } as const;
    expect(revenueRangeExclusive(query, { first: "2020-02-18", last: "2026-08-03" })).toEqual({
      start: "2020-02-18",
      endExclusive: "2026-08-04",
      label: "전체 기간",
    });
    expect(revenueRangeExclusive(query, null)).toEqual({ start: "0000-01-01", endExclusive: "9999-12-31", label: "전체 기간" });
  });
});
