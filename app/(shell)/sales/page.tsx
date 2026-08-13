import { randomUUID } from "node:crypto";

import { OperationsPage } from "../../../components/operations/operations-page";
import { isCalendarDate } from "../../../lib/operations";
import { PaymentForm } from "../../../components/sales/payment-form";
import { RevenueDashboard } from "../../../components/sales/revenue-dashboard";
import { parseRevenueSearchParams, previousRevenuePeriod, revenueRange, revenueRangeExclusive, serializeRevenueQuery, type RevenueQuery } from "../../../components/sales/revenue-query";
import { SalesControls } from "../../../components/sales/sales-controls";
import { buildPoints, buildSummary, dayAxis, delta, monthlyAxis, yearlyAxis } from "../../../lib/revenue-aggregate";
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
function daySeries(store: SalonStore, start: string, endExclusive: string, previousStart: string, label: string, span: "week" | "month", businessToday: string, contextNote?: string) {
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
  };
}

/** `2026-08` 형태의 월 키를 그 달 전체의 일별 막대로 바꾼다. */
function monthOfDays(store: SalonStore, monthKey: string, businessToday: string, contextNote?: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return daySeries(store, firstOfMonth(monthKey, 0), firstOfMonth(monthKey, 1), firstOfMonth(monthKey, -1), `${year}년 ${month}월`, "month", businessToday, contextNote);
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
 * 기간 버튼이 곧 차트 선택이다. 고른 기간을 한 단계 아래 단위로 쪼개 **한 벌만** 그린다.
 * 예전에는 일별·월별·연도별 세 벌을 항상 함께 그려서, 버튼을 눌러도 차트는 그대로였다.
 * 하루는 그 자체로 막대 한 개라 정보가 없으므로 그 날이 속한 달을 그리고, 어떤 달인지 밝힌다.
 */
function revenueChart(store: SalonStore, query: RevenueQuery, businessToday: string) {
  if (query.view === "total") return yearlySeries(store, businessToday);
  const { start, label } = revenueRange(query);
  if (query.view === "year") return monthlySeries(store, start.slice(0, 4), businessToday);
  if (query.view === "week") {
    const endExclusive = shiftDays(start, 7);
    return daySeries(store, start, endExclusive, shiftDays(start, -7), label, "week", businessToday);
  }
  // 일별은 막대 한 개가 되므로 그 날이 든 달을 그린다. 어떤 기준으로 넓혔는지 차트가 스스로 밝힌다.
  return monthOfDays(store, start.slice(0, 7), businessToday, query.view === "day" ? `${label}이 속한 달` : undefined);
}

/** 비교 상대를 부르는 이름. 화면 문장이 "지난달보다" 처럼 읽히게 한다. */
const previousLabels: Record<RevenueQuery["view"], string> = { day: "어제", week: "지난주", month: "지난달", year: "지난해", total: "직전 기간" };

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
      return <OperationsPage correctionId={value(params.correction)} error={value(params.error) || undefined} expenses={store.list("expense-presets")} ledger={store.listLedger()} period={period} requestKey={randomUUID()} salesQuery={query} />;
    }
    const settings = store.getSettings();
    const customers = store.list("customers");
    if (value(params.tab) === "payment") {
      const correctionTarget = value(params.correction) ? store.listLedger().find(({ id, kind }) => id === value(params.correction) && kind === "payment") : undefined;
      // 예약에서 넘어온 결제. 없는 id 를 줘도 `null` 이면 기존 동작 그대로다 — 던지지 않는다 (§4.3).
      const booking = value(params.booking) ? store.get("bookings", value(params.booking)) : null;
      const customerId = field(booking, "customerId") || value(params.customer) || correctionTarget?.customerId || undefined;
      // 예약이 있으면 그 예약이 끝나는 서울 시각, 아니면 지금. 렌더 중이 아니라 여기서 한 번만 읽는다
      // (`payment-form.tsx` 의 `requestKey` 주석과 같은 이유). 분은 반올림하지 않는다.
      const endsAt = seoulClockOrEmpty(field(booking, "endsAt"));
      const at = endsAt.date ? endsAt : seoulClock(new Date());
      // 예약 행이 붙여 보낸 복귀 경로를 그대로 쓴다. 이 값을 무시하고 `/sales?tab=payment` 를
      // 다시 조립하면 예약에서 출발한 사용자가 저장 후 빈 결제 폼으로 떨어진다 — 액션 쪽에서
      // `/bookings` 를 허용해도(`payment-actions.ts:13`) 경로가 폼에 실리지 않으면 소용없다 (설계 §3.1).
      const returnTo = paymentReturnTo(params.returnTo, `/sales?tab=payment&${serializeRevenueQuery(query)}${booking ? `&booking=${encodeURIComponent(booking.id)}` : ""}${customerId ? `&customer=${encodeURIComponent(customerId)}` : ""}${correctionTarget ? `&correction=${encodeURIComponent(correctionTarget.id)}` : ""}`);
      // 예약의 `service` 는 자유 입력이라(`booking.ts:101`) 대분류로 매핑하지 않는다. 상세칸에만 넣는다.
      const bookingContext = booking ? { id: booking.id, date: at.date, time: at.time, customerName: field(customers.find(({ id }) => id === customerId), "name") } : undefined;
      return <main className="min-w-0 px-7 pb-6 pt-5"><section><PaymentForm booking={bookingContext} catalog={store.list("catalog-items")} correctionTargetId={correctionTarget?.id} customerId={customerId} customers={customers} defaultDate={at.date} defaultTime={at.time} error={value(params.error) || undefined} notice={value(params.notice) || undefined} requestKey={randomUUID()} returnTo={returnTo} serviceDetail={field(booking, "service")} serviceMajor={typeof correctionTarget?.details.serviceMajor === "string" ? correctionTarget.details.serviceMajor : undefined} settings={settings} /></section></main>;
    }
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
    const { transactions: _transactions, ...analytics } = buildRevenueAnalytics(buildRevenueTransactions(ledger, customers), query, businessToday);
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
    return <RevenueDashboard analytics={analytics} briefing={briefing} chart={revenueChart(store, query, businessToday)} query={query} settings={settings} summary={summary} />;
  } finally { store.close(); }
}
