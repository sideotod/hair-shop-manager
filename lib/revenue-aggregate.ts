import type { LedgerAggregateRow, LedgerSummaryRow } from "./salon-domain";

export type RevenueGranularity = "daily" | "weekly" | "monthly" | "yearly";

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

const KEY_LENGTH: Record<RevenueGranularity, number> = { daily: 10, weekly: 10, monthly: 7, yearly: 4 };

/**
 * 오늘이 속한 칸의 키. 주는 키가 그 주 월요일이라 날짜를 잘라내는 것만으로는
 * 진행 중인 주를 못 찾는다 — 오늘도 월요일로 접어야 같은 키가 된다.
 */
function todayKeyFor(today: string, granularity: RevenueGranularity) {
  return granularity === "weekly" ? mondayOf(today) : today.slice(0, KEY_LENGTH[granularity]);
}

/** Monday-start week containing `date`. */
export function mondayOf(date: string) {
  const start = new Date(`${date}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start.toISOString().slice(0, 10);
}

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
  if (granularity === "weekly") return shiftDay(key, -7);
  if (granularity === "monthly") return shiftMonth(key, -1);
  return String(Number(key) - 1);
}

function yearAgoKey(key: string, granularity: RevenueGranularity) {
  if (granularity === "monthly") return shiftMonth(key, -12);
  if (granularity === "yearly") return String(Number(key) - 1);
  return null; // daily·weekly year-over-year is not shown
}

/** 주 라벨은 키가 아니라 자리에서 나온다 — 그 해의 몇 번째 주인지가 축의 뜻이다. */
function labelFor(key: string, granularity: RevenueGranularity, index: number) {
  if (granularity === "daily") return String(Number(key.slice(8, 10)));
  if (granularity === "weekly") return `${index + 1}주차`;
  if (granularity === "monthly") return `${Number(key.slice(5, 7))}월`;
  return key;
}

/**
 * Every day in `[start, endExclusive)`. Month boundaries do not matter, so a week axis
 * and a month axis come from the same function instead of two near-copies.
 */
export function dayAxis(start: string, endExclusive: string): readonly string[] {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  for (let key = start; key < endExclusive; key = cursor.toISOString().slice(0, 10)) {
    days.push(key);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Every day of `monthKey` (`YYYY-MM`), 1st through last. Leap years included. */
export function dailyAxis(monthKey: string): readonly string[] {
  const [year, month] = monthKey.split("-").map(Number);
  return dayAxis(`${monthKey}-01`, new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10));
}

/** All twelve months of `yearKey` (`YYYY`), January through December. Never reordered. */
export function monthlyAxis(yearKey: string): readonly string[] {
  return Array.from({ length: 12 }, (_, index) => `${yearKey}-${String(index + 1).padStart(2, "0")}`);
}

/** Only the years that have rows, ascending. Empty years are not filled with zero. */
export function yearlyAxis(rows: readonly LedgerAggregateRow[]): readonly string[] {
  return [...new Set(rows.map((row) => row.key))].sort();
}

/**
 * `yearKey` 한 해를 덮는 월요일들. 1월 1일이 든 주부터 12월 31일이 든 주까지라
 * 해에 따라 52칸 또는 53칸이다. 첫 주·마지막 주는 지난해·다음해 날을 물지만
 * 합계는 그 해 날만 더한다 (`weeklyRows`).
 */
export function weeklyAxis(yearKey: string): readonly string[] {
  const last = mondayOf(`${yearKey}-12-31`);
  const keys: string[] = [];
  for (let key = mondayOf(`${yearKey}-01-01`); key <= last; key = shiftDay(key, 7)) keys.push(key);
  return keys;
}

/**
 * 일별 집계 행을 월요일 기준으로 접는다. SQL 에 주 단위가 없어서 여기서 접는다.
 * 연 경계 주에서는 `yearKey` 에 속한 날만 더한다 — 지난해 매출이 올해 1주차로 새지 않는다.
 */
export function weeklyRows(dayRows: readonly LedgerAggregateRow[], yearKey: string): readonly LedgerAggregateRow[] {
  const byWeek = new Map<string, LedgerAggregateRow>();
  for (const row of dayRows) {
    if (!row.key.startsWith(yearKey)) continue;
    const key = mondayOf(row.key);
    const running = byWeek.get(key);
    byWeek.set(
      key,
      running
        ? { ...running, gross: running.gross + row.gross, netPaid: running.netPaid + row.netPaid, profit: running.profit + row.profit, count: running.count + row.count, corrections: running.corrections + row.corrections }
        : { ...row, key },
    );
  }
  return [...byWeek.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
}

export function buildPoints(
  rows: readonly LedgerAggregateRow[],
  granularity: RevenueGranularity,
  axis: readonly string[],
  today: string,
): readonly RevenueAggregatePoint[] {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const todayKey = todayKeyFor(today, granularity);
  const grossAt = (key: string | null) => (key === null ? null : (byKey.get(key)?.gross ?? null));

  return axis.map((key, index) => {
    const row = byKey.get(key);
    const state: RevenuePointState = key > todayKey ? "future" : key === todayKey ? "in-progress" : row ? "actual" : "zero";
    const gross = row?.gross ?? (state === "future" ? null : 0);
    return {
      key,
      label: labelFor(key, granularity, index),
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
