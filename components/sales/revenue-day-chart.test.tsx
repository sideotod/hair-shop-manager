import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildPoints, dailyAxis } from "../../lib/revenue-aggregate";
import type { LedgerAggregateRow } from "../../lib/salon-domain";
import { RevenueDayChart } from "./revenue-day-chart";

const row = (key: string, gross: number, extra: Partial<LedgerAggregateRow> = {}): LedgerAggregateRow => ({
  key,
  gross,
  netPaid: gross,
  profit: gross,
  count: 1,
  corrections: 0,
  ...extra,
});

const ROWS = [row("2026-08-01", 100_000), row("2026-08-02", 250_000), row("2026-08-03", 180_000)];
const TOTAL = ROWS.reduce((sum, entry) => sum + entry.gross, 0);

function render(rows: readonly LedgerAggregateRow[] = ROWS, total = TOTAL) {
  return renderToStaticMarkup(
    <RevenueDayChart
      count={rows.length}
      deltaPrevious={12.5}
      label="2026년 8월"
      points={buildPoints(rows, "daily", dailyAxis("2026-08"), "2026-08-06")}
      total={total}
      transactionsHref={(date) => `/sales/transactions?view=day&cursor=${date}`}
    />,
  );
}

describe("RevenueDayChart", () => {
  it("draws every calendar day of the month, not only the days that have rows (A2-4)", () => {
    const html = render();
    expect(html.match(/data-revenue-day="2026-08-\d\d"/g)).toHaveLength(31);
    expect(html).toContain('data-revenue-day="2026-08-05"');
    expect(html).toContain('data-revenue-day="2026-08-31"');
  });

  it("distinguishes a real zero day from an unstarted one (§18)", () => {
    const html = render();
    const stateOf = (key: string) => html.match(new RegExp(`data-revenue-day="${key}" data-revenue-day-state="([a-z-]+)"`))?.[1];
    expect(stateOf("2026-08-03")).toBe("actual");
    expect(stateOf("2026-08-04")).toBe("zero");
    expect(stateOf("2026-08-05")).toBe("zero");
    expect(stateOf("2026-08-06")).toBe("in-progress");
    expect(stateOf("2026-08-07")).toBe("future");
    expect(stateOf("2026-08-31")).toBe("future");
  });

  it("links each day with data to that day's transaction list", () => {
    const html = render();
    expect(html).toContain('href="/sales/transactions?view=day&amp;cursor=2026-08-02"');
    // Future days are not links: there is nothing to drill into.
    expect(html).not.toContain("cursor=2026-08-31");
  });

  it("shows the server total and flags a mismatch instead of silently disagreeing (§14)", () => {
    expect(render()).toContain("₩530,000");
    expect(render()).not.toContain("집계 오류");
    const wrong = render(ROWS, 999_999);
    expect(wrong).toContain("집계 오류");
    expect(wrong).toContain("₩530,000");
  });

  it("mirrors every point in a screen-reader table, naming the state for days without an amount", () => {
    const html = render();
    expect(html.match(/<tr><th>2026-08-\d\d<\/th>/g)).toHaveLength(31);
    expect(html).toContain("<th>2026-08-31</th><td>아직 오지 않은 날</td>");
    expect(html).toContain("매출 없음");
  });

  it("renders without dividing by zero when the whole month is empty", () => {
    const html = render([], 0);
    expect(html.match(/data-revenue-day="2026-08-\d\d"/g)).toHaveLength(31);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("집계 오류");
  });
});
