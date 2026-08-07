import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildPoints, monthlyAxis, yearlyAxis } from "../../lib/revenue-aggregate";
import type { LedgerAggregateRow } from "../../lib/salon-domain";
import { RevenueBarChart } from "./revenue-bar-chart";

const row = (key: string, gross: number, extra: Partial<LedgerAggregateRow> = {}): LedgerAggregateRow => ({
  key,
  gross,
  netPaid: gross,
  profit: gross,
  count: 1,
  corrections: 0,
  ...extra,
});

/** 2025년은 전년 대비 계산용, 2026년이 축. */
const MONTH_ROWS = [row("2025-03", 1_000_000), row("2026-01", 3_000_000), row("2026-03", 1_500_000), row("2026-08", 500_000)];
const YEAR_TOTAL = 5_000_000;

function months(rows: readonly LedgerAggregateRow[] = MONTH_ROWS, total = YEAR_TOTAL) {
  return renderToStaticMarkup(
    <RevenueBarChart
      count={3}
      drilldownHref={(key) => `?view=month&cursor=${key}-01`}
      emptyText="이 해에 기록된 매출이 없습니다."
      label="2026년"
      points={buildPoints(rows, "monthly", monthlyAxis("2026"), "2026-08-06")}
      previousLabel="전월"
      title="월별 매출"
      total={total}
      yearOverYearLabel="전년"
    />,
  );
}

const YEAR_ROWS = [row("2024", 40_000_000), row("2026", 5_000_000)];

function years(rows: readonly LedgerAggregateRow[] = YEAR_ROWS, total = 45_000_000) {
  return renderToStaticMarkup(
    <RevenueBarChart
      count={9}
      drilldownHref={(key) => `?view=year&cursor=${key}-01-01`}
      emptyText="아직 기록된 매출이 없습니다."
      label="2024~2026년"
      points={buildPoints(rows, "yearly", yearlyAxis(rows), "2026-08-06")}
      previousLabel="전년"
      title="연도별 매출"
      total={total}
    />,
  );
}

describe("RevenueBarChart — 월별 (§11.1)", () => {
  it("draws all twelve months in calendar order, never sorted by amount", () => {
    const keys = [...months().matchAll(/data-revenue-bar="(2026-\d\d)"/g)].map((match) => match[1]);
    expect(keys).toHaveLength(12);
    expect(keys).toEqual([...keys].sort());
    expect(keys[0]).toBe("2026-01");
    expect(keys[11]).toBe("2026-12");
  });

  it("marks the current month in progress and later months as unstarted without inventing amounts (§18)", () => {
    const html = months();
    const stateOf = (key: string) => html.match(new RegExp(`data-revenue-bar="${key}" data-revenue-bar-state="([a-z-]+)"`))?.[1];
    expect(stateOf("2026-02")).toBe("zero");
    expect(stateOf("2026-03")).toBe("actual");
    expect(stateOf("2026-08")).toBe("in-progress");
    expect(stateOf("2026-09")).toBe("future");
    expect(html).toContain("<th>2026-09</th><td>아직 오지 않은 기간</td>");
    expect(html).toContain("<th>2026-02</th>");
  });

  it("drills into that month and leaves future months unlinked", () => {
    const html = months();
    expect(html).toContain('href="?view=month&amp;cursor=2026-03-01"');
    expect(html).not.toContain("cursor=2026-12-01");
  });

  it("shows month-over-month and year-over-year for the same month last year", () => {
    const html = months();
    expect(html).toContain("전월");
    expect(html).toContain("전년");
    // 2026-03 1,500,000 vs 2025-03 1,000,000 = +50%
    expect(html).toContain("+50%");
  });

  it("flags a server/bar total mismatch instead of silently disagreeing (§14)", () => {
    expect(months()).not.toContain("집계 오류");
    expect(months(MONTH_ROWS, 9_999_999)).toContain("집계 오류");
  });
});

describe("RevenueBarChart — 연도별 (§11.3)", () => {
  it("shows only years that have data, oldest first, and never fills the gap year", () => {
    const keys = [...years().matchAll(/data-revenue-bar="(\d{4})"/g)].map((match) => match[1]);
    expect(keys).toEqual(["2024", "2026"]);
  });

  it("marks the current year in progress and links each year to its monthly view", () => {
    const html = years();
    expect(html).toContain('data-revenue-bar="2026" data-revenue-bar-state="in-progress"');
    expect(html).toContain('href="?view=year&amp;cursor=2024-01-01"');
    expect(html).toContain("진행 중");
  });

  it("omits the year-over-year column when the previous bar already is last year", () => {
    expect(years()).not.toContain("전년 대비");
    expect(years().match(/전년/g)).toBeTruthy();
  });

  it("renders an explicit empty state rather than an empty axis", () => {
    const html = years([], 0);
    expect(html).toContain("아직 기록된 매출이 없습니다.");
    expect(html).not.toContain("NaN");
  });
});
