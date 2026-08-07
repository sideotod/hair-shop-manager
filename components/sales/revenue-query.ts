export type RevenueView = "day" | "week" | "month" | "year" | "total";
export type RevenueQuery = { view: RevenueView; cursor: string };

export function defaultRevenueQuery(currentSeoulDate: string): RevenueQuery {
  return { view: "month", cursor: currentSeoulDate };
}

const views = new Set<RevenueView>(["day", "week", "month", "year", "total"]);

function isDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Monday-start week containing the cursor. */
function weekStart(date: Date) {
  const start = new Date(date);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

function move(query: RevenueQuery, direction: -1 | 1): RevenueQuery {
  if (query.view === "total") return query;
  const date = new Date(`${query.cursor}T00:00:00Z`);
  if (query.view === "day") date.setUTCDate(date.getUTCDate() + direction);
  else if (query.view === "week") date.setUTCDate(date.getUTCDate() + direction * 7);
  else if (query.view === "year") {
    date.setUTCMonth(0, 1);
    date.setUTCFullYear(date.getUTCFullYear() + direction);
  } else {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + direction);
  }
  return { ...query, cursor: iso(date) };
}

export function previousRevenueQuery(query: RevenueQuery) {
  return move(query, -1);
}

export function nextRevenueQuery(query: RevenueQuery) {
  return move(query, 1);
}

export function revenueRange(query: RevenueQuery) {
  if (query.view === "total") return { start: "0000-01-01", end: "9999-12-31", label: "누적" };
  const date = new Date(`${query.cursor}T00:00:00Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (query.view === "day") return { start: query.cursor, end: query.cursor, label: `${year}년 ${month + 1}월 ${date.getUTCDate()}일` };
  if (query.view === "week") {
    const start = weekStart(date);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return { start: iso(start), end: iso(end), label: `${start.getUTCFullYear()}년 ${start.getUTCMonth() + 1}월 ${start.getUTCDate()}일 주` };
  }
  if (query.view === "year") return { start: iso(new Date(Date.UTC(year, 0, 1))), end: iso(new Date(Date.UTC(year, 11, 31))), label: `${year}년` };
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  return { start: iso(start), end: iso(end), label: `${year}년 ${month + 1}월` };
}

/**
 * Half-open `[start, endExclusive)`. Boundary rows cannot be double-counted the way
 * an inclusive `end` allows. `bounds` supplies the real ledger span for the total view
 * so the range is not hardcoded.
 */
export function revenueRangeExclusive(query: RevenueQuery, bounds?: { first: string; last: string } | null) {
  if (query.view === "total") {
    const start = bounds?.first ?? "0000-01-01";
    return { start, endExclusive: bounds ? nextDay(bounds.last) : "9999-12-31", label: "누적" };
  }
  const { start, end, label } = revenueRange(query);
  return { start, endExclusive: nextDay(end), label };
}

function nextDay(date: string) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return iso(next);
}

/** The same-length period immediately before `query`, for period-over-period deltas. */
export function previousRevenuePeriod(query: RevenueQuery, bounds?: { first: string; last: string } | null) {
  return query.view === "total" ? null : revenueRangeExclusive(previousRevenueQuery(query), bounds);
}

export function parseRevenueQuery(input: string | URLSearchParams, currentSeoulDate: string): RevenueQuery {
  const params = typeof input === "string" ? new URLSearchParams(input) : input;
  const view = params.get("view") as RevenueView | null;
  const cursor = params.get("cursor");
  if (!view || !views.has(view)) return defaultRevenueQuery(currentSeoulDate);
  // A missing cursor no longer discards a valid view — it defaults to today (A3-4).
  // A malformed cursor still resets both, since the whole link is untrustworthy.
  if (cursor === null) return { view, cursor: currentSeoulDate };
  return isDate(cursor) ? { view, cursor } : defaultRevenueQuery(currentSeoulDate);
}

export function parseRevenueSearchParams(input: Record<string, string | string[] | undefined>, currentSeoulDate: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) if (typeof value === "string") params.set(key, value);
  return parseRevenueQuery(params, currentSeoulDate);
}

export function serializeRevenueQuery(query: RevenueQuery) {
  return new URLSearchParams(query).toString();
}
