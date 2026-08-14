/**
 * 칩 4개. 각 칩은 "막대 단위"이고, 창(window)은 그 단위가 읽히는 크기다.
 *
 * | 칩   | view    | 창      | 막대   | 이동   |
 * |------|---------|---------|--------|--------|
 * | 일별 | `day`   | 한 달   | 28~31  | 한 달  |
 * | 주별 | `week`  | 한 해   | 52~53  | 한 해  |
 * | 월별 | `month` | 한 해   | 12     | 한 해  |
 * | 년별 | `year`  | 전체    | 개원~  | 없음   |
 *
 * 막대 한 개짜리 창(옛 일별=하루, 옛 주별=이레)은 비교할 것이 없어 그래프가 아니었다.
 * 옛 `total` 은 `year` 가 그대로 이어받는다 — 전체 기간을 연 단위로 그리는 같은 화면이다.
 */
export type RevenueView = "day" | "week" | "month" | "year";
export type RevenueQuery = { view: RevenueView; cursor: string };

export function defaultRevenueQuery(currentSeoulDate: string): RevenueQuery {
  return { view: "month", cursor: currentSeoulDate };
}

const views = new Set<RevenueView>(["day", "week", "month", "year"]);

function isDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Monday-start week containing `date`. 주별 막대의 키가 되는 날이다. */
export function revenueWeekStart(date: string) {
  const start = new Date(`${date}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return iso(start);
}

/** 일별은 한 달씩, 주별·월별은 한 해씩. 년별은 전체를 보므로 움직이지 않는다. */
function move(query: RevenueQuery, direction: -1 | 1): RevenueQuery {
  if (query.view === "year") return query;
  const date = new Date(`${query.cursor}T00:00:00Z`);
  if (query.view === "day") {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + direction);
  } else {
    date.setUTCMonth(0, 1);
    date.setUTCFullYear(date.getUTCFullYear() + direction);
  }
  return { ...query, cursor: iso(date) };
}

/** 년별은 창이 하나뿐이라 이동 링크를 그리지 않는다. 자리는 남기되 링크는 없다. */
export function revenueQueryMoves(query: RevenueQuery) {
  return query.view !== "year";
}

export function previousRevenueQuery(query: RevenueQuery) {
  return move(query, -1);
}

export function nextRevenueQuery(query: RevenueQuery) {
  return move(query, 1);
}

/**
 * 칩이 고른 **창**. 막대 단위가 아니다 — 일별은 그 날이 든 달 전체,
 * 주별은 그 날이 든 해 전체다. KPI 카드도 이 창으로 계산되므로
 * 화면 위 숫자와 그래프가 같은 기간을 말한다.
 */
export function revenueRange(query: RevenueQuery, bounds?: { first: string; last: string } | null) {
  // 년별 창은 "전체"라 달력만으로는 끝을 모른다. 원장 범위를 받으면 실제 첫날~마지막날을 쓰고,
  // 못 받으면 0000~9999 라는 자리표시를 남긴다 — 이 값이 화면에 나가면 안 된다.
  if (query.view === "year") {
    return bounds ? { start: bounds.first, end: bounds.last, label: "전체 기간" } : { start: "0000-01-01", end: "9999-12-31", label: "전체 기간" };
  }
  const date = new Date(`${query.cursor}T00:00:00Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (query.view === "week" || query.view === "month") {
    return { start: iso(new Date(Date.UTC(year, 0, 1))), end: iso(new Date(Date.UTC(year, 11, 31))), label: `${year}년` };
  }
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  return { start: iso(start), end: iso(end), label: `${year}년 ${month + 1}월` };
}

/** 하루짜리 범위. 거래 목록 링크처럼 진짜 하루가 필요한 곳이 쓴다. */
export function revenueDayRange(date: string) {
  return { start: date, endExclusive: nextDay(date) };
}

/**
 * Half-open `[start, endExclusive)`. Boundary rows cannot be double-counted the way
 * an inclusive `end` allows. `bounds` supplies the real ledger span for the year view
 * so the range is not hardcoded.
 */
export function revenueRangeExclusive(query: RevenueQuery, bounds?: { first: string; last: string } | null) {
  const { start, end, label } = revenueRange(query, bounds);
  // 년별에 원장 범위가 없으면 끝이 9999-12-31 이라 하루 더하면 넘친다. 그대로 둔다.
  return { start, endExclusive: query.view === "year" && !bounds ? "9999-12-31" : nextDay(end), label };
}

function nextDay(date: string) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return iso(next);
}

/** The same-length period immediately before `query`, for period-over-period deltas. */
export function previousRevenuePeriod(query: RevenueQuery, bounds?: { first: string; last: string } | null) {
  return query.view === "year" ? null : revenueRangeExclusive(previousRevenueQuery(query), bounds);
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
