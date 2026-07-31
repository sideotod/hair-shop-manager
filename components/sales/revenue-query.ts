export type RevenueView = "day" | "month" | "total";
export type RevenueQuery = { view: RevenueView; cursor: string };

export function defaultRevenueQuery(currentSeoulDate: string): RevenueQuery {
  return { view: "month", cursor: currentSeoulDate };
}

const views = new Set<RevenueView>(["day", "month", "total"]);

function isDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function move(query: RevenueQuery, direction: -1 | 1): RevenueQuery {
  if (query.view === "total") return query;
  const date = new Date(`${query.cursor}T00:00:00Z`);
  if (query.view === "day") date.setUTCDate(date.getUTCDate() + direction);
  else {
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
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  return { start: iso(start), end: iso(end), label: `${year}년 ${month + 1}월` };
}

export function parseRevenueQuery(input: string | URLSearchParams, currentSeoulDate: string): RevenueQuery {
  const params = typeof input === "string" ? new URLSearchParams(input) : input;
  const view = params.get("view") as RevenueView | null;
  const cursor = params.get("cursor");
  return view && views.has(view) && isDate(cursor) ? { view, cursor } : defaultRevenueQuery(currentSeoulDate);
}

export function parseRevenueSearchParams(input: Record<string, string | string[] | undefined>, currentSeoulDate: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) if (typeof value === "string") params.set(key, value);
  return parseRevenueQuery(params, currentSeoulDate);
}

export function serializeRevenueQuery(query: RevenueQuery) {
  return new URLSearchParams(query).toString();
}
