import type { LedgerAggregateRow, LedgerSummaryRow } from "./salon-domain";

export type RevenueGranularity = "daily" | "monthly" | "yearly";

/** §18 — a period with no rows is not the same thing as a period with ₩0. */
export type RevenuePointState =
  | "actual" // rows exist
  | "zero" // period has passed and produced no rows: a real ₩0
  | "missing" // not aggregated (reserved; see below)
  | "future" // period has not happened yet
  | "in-progress" // today / this month / this year
  | "error"; // aggregation failed

export type RevenueAggregatePoint = {
  /** daily `2026-08-04` · monthly `2026-08` · yearly `2026` */
  readonly key: string;
  /** axis label: daily `4` · monthly `8월` · yearly `2026` */
  readonly label: string;
  /** `SUM(gross_won)`. `null` means no data — distinct from `0`. */
  readonly gross: number | null;
  readonly netPaid: number | null;
  readonly profit: number | null;
  readonly count: number;
  readonly state: RevenuePointState;
  /** percent vs the immediately preceding period; `null` when not computable */
  readonly deltaPrevious: number | null;
  /** percent vs the same period one year earlier; `null` for daily */
  readonly deltaYearOverYear: number | null;
  readonly hasCorrection: boolean;
};

export type RevenuePeriod = { readonly start: string; readonly endExclusive: string; readonly label: string };

export type RevenueSummary = {
  readonly period: RevenuePeriod;
  readonly gross: number;
  readonly discount: number;
  readonly points: number;
  readonly netPaid: number;
  readonly refunds: number;
  readonly vat: number;
  readonly fee: number;
  readonly expense: number;
  readonly profit: number;
  readonly count: number;
  readonly deltaPrevious: number | null;
};

export type RevenueAggregate = {
  readonly granularity: RevenueGranularity;
  readonly points: readonly RevenueAggregatePoint[];
  readonly summary: RevenueSummary;
};

const KEY_LENGTH: Record<RevenueGranularity, number> = { daily: 10, monthly: 7, yearly: 4 };

/** Percent change, rounded to one decimal. Never returns Infinity or NaN. */
export function delta(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function shiftDay(key: string, days: number) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shiftMonth(key: string, months: number) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return date.toISOString().slice(0, 7);
}

function previousKey(key: string, granularity: RevenueGranularity) {
  if (granularity === "daily") return shiftDay(key, -1);
  if (granularity === "monthly") return shiftMonth(key, -1);
  return String(Number(key) - 1);
}

function yearAgoKey(key: string, granularity: RevenueGranularity) {
  if (granularity === "monthly") return shiftMonth(key, -12);
  if (granularity === "yearly") return String(Number(key) - 1);
  return null; // daily year-over-year is not shown
}

function labelFor(key: string, granularity: RevenueGranularity) {
  if (granularity === "daily") return String(Number(key.slice(8, 10)));
  if (granularity === "monthly") return `${Number(key.slice(5, 7))}월`;
  return key;
}

/** Every day of `monthKey` (`YYYY-MM`), 1st through last. Leap years included. */
export function dailyAxis(monthKey: string): readonly string[] {
  const [year, month] = monthKey.split("-").map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: days }, (_, index) => `${monthKey}-${String(index + 1).padStart(2, "0")}`);
}

/** All twelve months of `yearKey` (`YYYY`), January through December. Never reordered. */
export function monthlyAxis(yearKey: string): readonly string[] {
  return Array.from({ length: 12 }, (_, index) => `${yearKey}-${String(index + 1).padStart(2, "0")}`);
}

/** Only the years that have rows, ascending. Empty years are not filled with zero. */
export function yearlyAxis(rows: readonly LedgerAggregateRow[]): readonly string[] {
  return [...new Set(rows.map((row) => row.key))].sort();
}

export function buildPoints(
  rows: readonly LedgerAggregateRow[],
  granularity: RevenueGranularity,
  axis: readonly string[],
  today: string,
): readonly RevenueAggregatePoint[] {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const todayKey = today.slice(0, KEY_LENGTH[granularity]);
  const grossAt = (key: string | null) => (key === null ? null : (byKey.get(key)?.gross ?? null));

  return axis.map((key) => {
    const row = byKey.get(key);
    const state: RevenuePointState = key > todayKey ? "future" : key === todayKey ? "in-progress" : row ? "actual" : "zero";
    const gross = row?.gross ?? (state === "future" ? null : 0);
    return {
      key,
      label: labelFor(key, granularity),
      gross,
      netPaid: row?.netPaid ?? (state === "future" ? null : 0),
      profit: row?.profit ?? (state === "future" ? null : 0),
      count: row?.count ?? 0,
      state,
      deltaPrevious: gross === null ? null : delta(gross, grossAt(previousKey(key, granularity))),
      deltaYearOverYear: gross === null ? null : delta(gross, grossAt(yearAgoKey(key, granularity))),
      hasCorrection: (row?.corrections ?? 0) > 0,
    };
  });
}

export function buildSummary(row: LedgerSummaryRow, period: RevenuePeriod, previousGross: number | null): RevenueSummary {
  return { period, ...row, deltaPrevious: delta(row.gross, previousGross) };
}

export function buildAggregate(
  rows: readonly LedgerAggregateRow[],
  granularity: RevenueGranularity,
  axis: readonly string[],
  today: string,
  summary: RevenueSummary,
): RevenueAggregate {
  return { granularity, points: buildPoints(rows, granularity, axis, today), summary };
}
