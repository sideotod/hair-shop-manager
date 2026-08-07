import { describe, expect, it } from "vitest";

import { buildPoints, dailyAxis, delta, monthlyAxis, yearlyAxis } from "./revenue-aggregate";
import type { LedgerAggregateRow } from "./salon-domain";

const row = (key: string, gross: number, extra: Partial<LedgerAggregateRow> = {}): LedgerAggregateRow => ({
  key,
  gross,
  netPaid: gross,
  profit: gross,
  count: 1,
  corrections: 0,
  ...extra,
});

describe("axis construction", () => {
  it("covers every calendar day of the month, including leap February", () => {
    expect(dailyAxis("2026-08")).toHaveLength(31);
    expect(dailyAxis("2026-08").at(0)).toBe("2026-08-01");
    expect(dailyAxis("2026-08").at(-1)).toBe("2026-08-31");
    expect(dailyAxis("2026-02")).toHaveLength(28);
    expect(dailyAxis("2024-02")).toHaveLength(29);
    expect(dailyAxis("2026-04")).toHaveLength(30);
  });

  it("always yields twelve months in January-to-December order", () => {
    const axis = monthlyAxis("2026");
    expect(axis).toHaveLength(12);
    expect(axis[0]).toBe("2026-01");
    expect(axis[11]).toBe("2026-12");
    expect([...axis]).toEqual([...axis].sort());
  });

  it("keeps only years that have rows, ascending, without filling gaps with zero", () => {
    expect(yearlyAxis([row("2026", 5), row("2020", 1), row("2023", 3)])).toEqual(["2020", "2023", "2026"]);
  });
});

describe("delta", () => {
  it("never returns Infinity or NaN", () => {
    expect(delta(100, 0)).toBeNull();
    expect(delta(100, null)).toBeNull();
    expect(delta(0, 0)).toBeNull();
    expect(delta(120, 100)).toBe(20);
    expect(delta(80, 100)).toBe(-20);
    expect(delta(0, 100)).toBe(-100);
  });
});

describe("point state (§18)", () => {
  const axis = dailyAxis("2026-08");
  const points = buildPoints([row("2026-08-01", 100), row("2026-08-02", 200), row("2026-08-03", 300)], "daily", axis, "2026-08-06");
  const at = (key: string) => points.find((point) => point.key === key)!;

  it("draws the whole month even though only three days have rows", () => {
    expect(points).toHaveLength(31);
  });

  it("marks past days without rows as a real zero, not missing data", () => {
    expect(at("2026-08-04").state).toBe("zero");
    expect(at("2026-08-04").gross).toBe(0);
    expect(at("2026-08-05").state).toBe("zero");
  });

  it("marks today in-progress and future days as future with null gross", () => {
    expect(at("2026-08-06").state).toBe("in-progress");
    expect(at("2026-08-07").state).toBe("future");
    expect(at("2026-08-07").gross).toBeNull();
    expect(at("2026-08-31").state).toBe("future");
  });

  it("reports days that have rows as actual", () => {
    expect(at("2026-08-01").state).toBe("actual");
    expect(at("2026-08-03").gross).toBe(300);
  });

  it("flags correction rows", () => {
    const flagged = buildPoints([row("2026-08-01", 100, { corrections: 1 })], "daily", axis, "2026-08-06");
    expect(flagged[0].hasCorrection).toBe(true);
    expect(flagged[1].hasCorrection).toBe(false);
  });

  it("omits year-over-year for daily points", () => {
    expect(at("2026-08-01").deltaYearOverYear).toBeNull();
  });
});

describe("monthly and yearly points", () => {
  it("computes month-over-month against the previous month, not the previous drawn bar", () => {
    const points = buildPoints([row("2026-01", 100), row("2026-03", 300)], "monthly", monthlyAxis("2026"), "2026-08-06");
    expect(points[1].key).toBe("2026-02");
    expect(points[1].gross).toBe(0);
    expect(points[1].deltaPrevious).toBe(-100); // Feb 0 against Jan 100
    expect(points[2].deltaPrevious).toBeNull(); // Mar 300 against Feb 0 is not computable
  });

  it("marks the current month in-progress and later months future", () => {
    const points = buildPoints([], "monthly", monthlyAxis("2026"), "2026-08-06");
    expect(points[7].state).toBe("in-progress"); // August
    expect(points[8].state).toBe("future");
    expect(points[6].state).toBe("zero");
  });

  it("computes year-over-year for monthly points", () => {
    const rows = [row("2025-08", 100), row("2026-08", 150)];
    const points = buildPoints(rows, "monthly", ["2025-08", "2026-08"], "2026-12-31");
    expect(points[1].deltaYearOverYear).toBe(50);
  });

  it("marks the current year in-progress", () => {
    const rows = [row("2025", 100), row("2026", 50)];
    const points = buildPoints(rows, "yearly", yearlyAxis(rows), "2026-08-06");
    expect(points[1].state).toBe("in-progress");
    expect(points[1].deltaYearOverYear).toBe(-50);
  });
});
