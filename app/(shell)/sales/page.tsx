import { randomUUID } from "node:crypto";

import { OperationsPage } from "../../../components/operations/operations-page";
import { isCalendarDate } from "../../../lib/operations";
import { PaymentRegistrationModal } from "../../../components/sales/payment-registration-modal";
import { RevenueDashboard } from "../../../components/sales/revenue-dashboard";
import { parseRevenueSearchParams, previousRevenuePeriod, revenueRange, revenueRangeExclusive, serializeRevenueQuery, type RevenueQuery } from "../../../components/sales/revenue-query";
import { buildPoints, buildSummary, dayAxis, delta, monthlyAxis, weeklyAxis, weeklyRows, yearlyAxis } from "../../../lib/revenue-aggregate";
import { buildRevenueAnalytics, buildRevenueTransactions } from "../../../lib/revenue-data";
import { paymentReturnTo } from "../../../lib/navigation";
import { averageTicket, customerBriefing, hourPattern, isUsableHourPattern, patternHeadline, revenueBriefing, weekdayPattern } from "../../../lib/salon-briefing";
import { createSalonStore, type SalonStore } from "../../../lib/salon-store";
import type { JsonObject, JsonValue } from "../../../lib/salon-domain";
import { seoulBusinessDate, seoulClock, seoulClockOrEmpty } from "../../../lib/seoul-date";

function value(input: string | string[] | undefined) { return typeof input === "string" ? input : ""; }
/** 레코드 값에서 문자열 한 칸. `booking.ts:91` 과 같은 규약 — 없으면 빈 문자열이다. */
function field(record: { value: JsonValue } | null | undefined, key: string) {
  const record_value = record && typeof record.value === "object" && record.value !== null && !Array.isArray(record.value) ? record.value as JsonObject : {};
  return typeof record_value[key] === "string" ? record_value[key] : "";
}

const firstOfMonth = (monthKey: string, offset: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
};

const shiftDays = (date: string, days: number) => {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
};

const minDate = (a: string, b: string) => (a < b ? a : b);

/**
 * 하루 단위 막대 한 벌. 주(7칸)와 달(28~31칸)이 같은 코드를 쓴다.
 * 서버 집계 하나로 만든다 (§14 — 프런트는 합산하지 않는다).
 *
 * 아직 끝나지 않은 기간이면 **지난 기간도 같은 날짜까지 잘라** 견준다.
 * 브리핑 문장과 같은 규칙이어야 한다 — 한 화면에서 두 숫자가 서로 다른 말을 하면
 * 사용자는 어느 쪽을 믿을지 정할 방법이 없다.
 */
function daySeries(store: SalonStore, start: string, endExclusive: string, previousStart: string, label: string, span: "month" | "year", businessToday: string, contextNote?: string) {
  const summary = store.summarizeLedger(start, endExclusive);
  const inProgress = businessToday >= start && businessToday < endExclusive;
  const previousEnd = inProgress ? minDate(shiftDays(previousStart, dayAxis(start, businessToday).length + 1), start) : start;
  return {
    kind: "day" as const,
    span,
    contextNote,
    label,
    points: buildPoints(store.aggregateLedger(start, endExclusive, "day"), "daily", dayAxis(start, endExclusive), businessToday),
    total: summary.gross,
    count: summary.count,
    deltaPrevious: delta(summary.gross, store.summarizeLedger(previousStart, previousEnd).gross),
    /** 잘라 견줬으면 며칠까지인지. 차트가 스스로 밝힌다. */
    comparisonNote: inProgress ? `${dayAxis(start, businessToday).length + 1}일까지` : undefined,
    title: "일별 매출",
    dividers: undefined as readonly number[] | undefined,
    footNote: undefined as string | undefined,
  };
}

/** `2026-08` 형태의 월 키를 그 달 전체의 일별 막대로 바꾼다. */
function monthOfDays(store: SalonStore, monthKey: string, businessToday: string, contextNote?: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return daySeries(store, firstOfMonth(monthKey, 0), firstOfMonth(monthKey, 1), firstOfMonth(monthKey, -1), `${year}년 ${month}월`, "month", businessToday, contextNote);
}

/**
 * 한 해를 주 단위로. 52~53칸이다. SQL 에 주 단위가 없어 일별 집계를 월요일로 접는다.
 * 연 경계 주는 그 해에 든 날만 더하므로, 첫 주·마지막 주 막대는 이레보다 짧을 수 있다.
 */
function weekOfYear(store: SalonStore, yearKey: string, businessToday: string) {
  const year = Number(yearKey);
  const start = `${year}-01-01`;
  const endExclusive = `${year + 1}-01-01`;
  const summary = store.summarizeLedger(start, endExclusive);
  const axis = weeklyAxis(yearKey);
  const inProgress = businessToday >= start && businessToday < endExclusive;
  // 진행 중인 해는 지난해도 같은 날짜까지 잘라 견준다 — 일별과 같은 규칙이다.
  const previousEnd = inProgress ? `${year - 1}${businessToday.slice(4)}` : start;
  // 그 주의 월요일이 지난 칸과 다른 달에 들면 거기가 달 경계다.
  const dividers = axis.reduce<number[]>((edges, key, index) => {
    if (index > 0 && key.slice(0, 7) !== axis[index - 1].slice(0, 7)) edges.push(index);
    return edges;
  }, []);
  return {
    kind: "day" as const,
    span: "year" as const,
    title: "주별 매출",
    label: `${year}년`,
    points: buildPoints(weeklyRows(store.aggregateLedger(start, endExclusive, "day"), yearKey), "weekly", axis, businessToday),
    total: summary.gross,
    count: summary.count,
    deltaPrevious: delta(summary.gross, store.summarizeLedger(`${year - 1}-01-01`, previousEnd).gross),
    comparisonNote: inProgress ? `${businessToday.slice(0, 4)}년 ${Number(businessToday.slice(5, 7))}월 ${Number(businessToday.slice(8, 10))}일까지` : undefined,
    dividers: dividers as readonly number[],
    footNote: "해가 바뀌는 주는 그 해에 든 날만 더했습니다. 점선은 달이 바뀌는 자리입니다.",
    contextNote: undefined as string | undefined,
  };
}

/**
 * 1월~12월 열두 칸 (§11.1). 전년 대비를 계산하려면 지난해 행도 필요하므로
 * 두 해를 집계하되 축은 올해 열두 달만 그린다.
 */
function monthlySeries(store: SalonStore, yearKey: string, businessToday: string) {
  const year = Number(yearKey);
  const start = `${year}-01-01`;
  const endExclusive = `${year + 1}-01-01`;
  const summary = store.summarizeLedger(start, endExclusive);
  return {
    kind: "bar" as const,
    title: "월별 매출",
    previousLabel: "전월",
    yearOverYearLabel: "전년",
    emptyText: "이 해에 기록된 매출이 없습니다.",
    drilldown: "month" as const,
    label: `${year}년`,
    points: buildPoints(store.aggregateLedger(`${year - 1}-01-01`, endExclusive, "month"), "monthly", monthlyAxis(yearKey), businessToday),
    total: summary.gross,
    count: summary.count,
  };
}

/** 데이터가 있는 해만, 오래된 순 (§11.3). 빈 해를 0원으로 채우지 않는다. */
function yearlySeries(store: SalonStore, businessToday: string) {
  const base = { kind: "bar" as const, title: "연도별 매출", previousLabel: "전년", emptyText: "아직 기록된 매출이 없습니다.", drilldown: "year" as const };
  const bounds = store.ledgerBounds();
  if (!bounds) return { ...base, label: "전체 기간", points: [], total: 0, count: 0 };
  const start = `${bounds.first.slice(0, 4)}-01-01`;
  const endExclusive = `${Number(bounds.last.slice(0, 4)) + 1}-01-01`;
  const rows = store.aggregateLedger(start, endExclusive, "year");
  const summary = store.summarizeLedger(start, endExclusive);
  return {
    ...base,
    label: `${bounds.first.slice(0, 4)}~${bounds.last.slice(0, 4)}년`,
    points: buildPoints(rows, "yearly", yearlyAxis(rows), businessToday),
    total: summary.gross,
    count: summary.count,
  };
}

/**
 * 칩 4개가 곧 차트다. 각 칩은 막대 단위를 고르고, 창은 그 단위가 읽히는 크기다.
 * 일별=한 달의 날, 주별=한 해의 주, 월별=한 해의 달, 년별=전체의 해.
 * 예전에는 일별과 월별이 같은 그림을 그렸고 `total` 은 0000~9999 라는 가짜 기간을 보여줬다.
 */
function revenueChart(store: SalonStore, query: RevenueQuery, businessToday: string) {
  if (query.view === "year") return yearlySeries(store, businessToday);
  const { start } = revenueRange(query);
  if (query.view === "month") return monthlySeries(store, start.slice(0, 4), businessToday);
  if (query.view === "week") return weekOfYear(store, start.slice(0, 4), businessToday);
  return monthOfDays(store, start.slice(0, 7), businessToday);
}

/** 비교 상대를 부르는 이름. 화면 문장이 "지난달보다" 처럼 읽히게 한다. */
const previousLabels: Record<RevenueQuery["view"], string> = { day: "지난달", week: "지난해", month: "지난해", year: "직전 기간" };

export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const store = createSalonStore();
  try {
    const businessToday = seoulBusinessDate();
    const query = parseRevenueSearchParams(params, businessToday);
    // 지출·결제 탭만 전체 원장이 필요하다. 분석 화면은 기간 조회로 끝난다 (A4-2).
    if (value(params.tab) === "expenses") {
      // 지출 탭은 원장 전량을 쓰지만 감사 이력은 한 줄도 읽지 않는다. `snapshot()` 은 감사 6,435행까지
      // 끌고 와 13.00ms 를 더 쓰고, 화면이 안 보는 kind 도 전부 읽는다 (A4-4).
      // 기간 파라미터는 `/operations` 에서 함께 옮겨왔다 (설계 §5.2). 여기서 안 읽으면
      // 기간 정산 폼이 눌러도 아무 일도 하지 않는 컨트롤이 된다.
      const start = isCalendarDate(value(params.start)) ? value(params.start) : "0000-01-01";
      const end = isCalendarDate(value(params.end)) ? value(params.end) : "9999-12-31";
      const period = start <= end ? { start, end } : { start: end, end: start };
      return <OperationsPage correctionId={value(params.correction)} error={value(params.error) || undefined} expenses={store.list("expense-presets")} ledger={store.listLedger()} period={period} requestKey={randomUUID()} />;
    }
    const settings = store.getSettings();
    const customers = store.list("customers");
    const bounds = store.ledgerBounds();
    const period = revenueRangeExclusive(query, bounds);
    const previous = previousRevenuePeriod(query, bounds);
    // 오늘이 기간 안에 있으면 아직 끝나지 않은 기간이다.
    const inProgress = businessToday >= period.start && businessToday < period.endExclusive;
    // 진행 중인 달을 지난달 **전체**와 견주면 언제나 "크게 줄었다"가 나온다 — 달력이 만든 착시다.
    // 그래서 지난달도 같은 날짜까지만 자른다. 8월 1~12일 ↔ 7월 1~12일.
    const elapsedDays = inProgress ? dayAxis(period.start, businessToday).length + 1 : 0;
    const previousComparable = previous && inProgress
      ? { start: previous.start, endExclusive: minDate(shiftDays(previous.start, elapsedDays), previous.endExclusive) }
      : previous;
    const summary = buildSummary(
      store.summarizeLedger(period.start, period.endExclusive),
      period,
      previousComparable ? store.summarizeLedger(previousComparable.start, previousComparable.endExclusive).gross : null,
    );
    const ledger = store.listLedgerRange(period.start, period.endExclusive);
    // 개별 거래는 클라이언트로 넘기지 않는다 — 누적 기간에서 RSC 페이로드가 3MB를 넘는다 (A4-1).
    const { transactions: _transactions, ...analytics } = buildRevenueAnalytics(buildRevenueTransactions(ledger, customers), query, businessToday, bounds);
    // 요일·시간·고객 구성은 SQL 이 센다. 원장 5,576행을 프런트로 넘겨 다시 세지 않는다 (§14).
    const weekday = weekdayPattern(store.weekdayLedger(period.start, period.endExclusive));
    const hourRows = store.hourLedger(period.start, period.endExclusive);
    const hour = hourPattern(hourRows);
    const mix = customerBriefing(store.customerMixLedger(period.start, period.endExclusive));
    const partialComparison = inProgress && summary.deltaPrevious !== null ? `${elapsedDays}일까지` : undefined;
    const briefing = {
      revenue: revenueBriefing(summary, previousLabels[query.view], {
        inclusiveEnd: analytics.selectedPeriod.end,
        // 같은 날짜까지 잘라 견줬다는 사실을 문장이 스스로 밝힌다.
        partialComparison,
      }),
      inProgress,
      comparisonLabel: partialComparison ? `${previousLabels[query.view]} ${partialComparison}` : previousLabels[query.view],
      weekdayHeadline: patternHeadline(weekday, "요일"),
      hourHeadline: patternHeadline(hour, "시간대"),
      weekday,
      hour,
      availability: { hour: isUsableHourPattern(hourRows) },
      customers: mix,
      // 객단가는 결제 건수가 아니라 방문 수로 나눈다 (한국 통용 정의: 총 매출 ÷ 방문 고객 수).
      averageTicket: averageTicket(summary.gross, mix.visits),
    };
    return <><PaymentRegistrationModal bookings={store.list("bookings")} catalog={store.list("catalog-items")} customers={customers} ledger={ledger} pathname="/sales" searchParams={params} settings={settings} /><RevenueDashboard analytics={analytics} briefing={briefing} chart={revenueChart(store, query, businessToday)} query={query} settings={settings} summary={summary} /></>;
  } finally { store.close(); }
}
