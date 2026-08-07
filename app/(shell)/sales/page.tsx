import { randomUUID } from "node:crypto";

import { OperationsPage } from "../../../components/operations/operations-page";
import { PaymentForm } from "../../../components/sales/payment-form";
import { RevenueDashboard } from "../../../components/sales/revenue-dashboard";
import { parseRevenueSearchParams, previousRevenuePeriod, revenueRange, revenueRangeExclusive, serializeRevenueQuery } from "../../../components/sales/revenue-query";
import { SalesControls } from "../../../components/sales/sales-controls";
import { buildPoints, buildSummary, dailyAxis, delta, monthlyAxis, yearlyAxis } from "../../../lib/revenue-aggregate";
import { buildRevenueAnalytics, buildRevenueTransactions } from "../../../lib/revenue-data";
import { createSalonStore, type SalonStore } from "../../../lib/salon-store";
import { seoulBusinessDate, seoulDate } from "../../../lib/seoul-date";

function value(input: string | string[] | undefined) { return typeof input === "string" ? input : ""; }

const firstOfMonth = (monthKey: string, offset: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
};

/** `2026-08` 형태의 월 키를 서버 집계 하나로 일별 차트 데이터로 바꾼다 (§14 — 프런트는 합산하지 않는다). */
function dailySeries(store: SalonStore, monthKey: string, businessToday: string) {
  const axis = dailyAxis(monthKey);
  const start = firstOfMonth(monthKey, 0);
  const endExclusive = firstOfMonth(monthKey, 1);
  const previousStart = firstOfMonth(monthKey, -1);
  const summary = store.summarizeLedger(start, endExclusive);
  const [year, month] = monthKey.split("-").map(Number);
  return {
    label: `${year}년 ${month}월`,
    points: buildPoints(store.aggregateLedger(start, endExclusive, "day"), "daily", axis, businessToday),
    total: summary.gross,
    count: summary.count,
    deltaPrevious: delta(summary.gross, store.summarizeLedger(previousStart, start).gross),
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
    label: `${year}년`,
    points: buildPoints(store.aggregateLedger(`${year - 1}-01-01`, endExclusive, "month"), "monthly", monthlyAxis(yearKey), businessToday),
    total: summary.gross,
    count: summary.count,
  };
}

/** 데이터가 있는 해만, 오래된 순 (§11.3). 빈 해를 0원으로 채우지 않는다. */
function yearlySeries(store: SalonStore, businessToday: string) {
  const bounds = store.ledgerBounds();
  if (!bounds) return { label: "전체 기간", points: [], total: 0, count: 0 };
  const start = `${bounds.first.slice(0, 4)}-01-01`;
  const endExclusive = `${Number(bounds.last.slice(0, 4)) + 1}-01-01`;
  const rows = store.aggregateLedger(start, endExclusive, "year");
  const summary = store.summarizeLedger(start, endExclusive);
  return {
    label: `${bounds.first.slice(0, 4)}~${bounds.last.slice(0, 4)}년`,
    points: buildPoints(rows, "yearly", yearlyAxis(rows), businessToday),
    total: summary.gross,
    count: summary.count,
  };
}

export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const store = createSalonStore();
  try {
    const businessToday = seoulBusinessDate();
    const query = parseRevenueSearchParams(params, businessToday);
    const analysisHref = `/sales?${serializeRevenueQuery(query)}`;
    // 세 차트는 모두 "지금 보고 있는 기간"을 기준으로 한 달·한 해를 그린다.
    const focusMonth = (query.view === "total" ? businessToday : revenueRange(query).start).slice(0, 7);
    // 지출·결제 탭만 전체 원장이 필요하다. 분석 화면은 기간 조회로 끝난다 (A4-2).
    if (value(params.tab) === "expenses") {
      // 지출 탭은 원장 전량을 쓰지만 감사 이력은 한 줄도 읽지 않는다. `snapshot()` 은 감사 6,435행까지
      // 끌고 와 13.00ms 를 더 쓰고, 화면이 안 보는 kind 도 전부 읽는다 (A4-4).
      return <OperationsPage activeTab="expenses" catalog={store.list("catalog-items")} correctionId={value(params.correction)} customers={store.list("customers")} error={value(params.error) || undefined} expenses={store.list("expense-presets")} ledger={store.listLedger()} requestKey={randomUUID()} salesContext salesQuery={query} settings={store.getSettings()} />;
    }
    const settings = store.getSettings();
    const customers = store.list("customers");
    if (value(params.tab) === "payment") {
      const correctionTarget = value(params.correction) ? store.listLedger().find(({ id, kind }) => id === value(params.correction) && kind === "payment") : undefined;
      const customerId = value(params.customer) || correctionTarget?.customerId || undefined;
      const returnTo = `/sales?tab=payment&${serializeRevenueQuery(query)}${customerId ? `&customer=${encodeURIComponent(customerId)}` : ""}${correctionTarget ? `&correction=${encodeURIComponent(correctionTarget.id)}` : ""}`;
      return <main className="min-w-0 px-7 pb-6 pt-5"><SalesControls label={revenueRange(query).label} query={query} tab="payment" /><section className="mt-5"><PaymentForm backTo={analysisHref} correctionTargetId={correctionTarget?.id} customerId={customerId} customers={customers} error={value(params.error) || undefined} requestKey={randomUUID()} returnTo={returnTo} settings={settings} today={seoulDate()} /></section></main>;
    }
    const bounds = store.ledgerBounds();
    const period = revenueRangeExclusive(query, bounds);
    const previous = previousRevenuePeriod(query, bounds);
    const summary = buildSummary(
      store.summarizeLedger(period.start, period.endExclusive),
      period,
      previous ? store.summarizeLedger(previous.start, previous.endExclusive).gross : null,
    );
    const ledger = store.listLedgerRange(period.start, period.endExclusive);
    // 개별 거래는 클라이언트로 넘기지 않는다 — 누적 기간에서 RSC 페이로드가 3MB를 넘는다 (A4-1).
    const { transactions: _transactions, ...analytics } = buildRevenueAnalytics(buildRevenueTransactions(ledger, customers), query, businessToday);
    return <RevenueDashboard analytics={analytics} daily={dailySeries(store, focusMonth, businessToday)} monthly={monthlySeries(store, focusMonth.slice(0, 4), businessToday)} query={query} settings={settings} summary={summary} yearly={yearlySeries(store, businessToday)} />;
  } finally { store.close(); }
}
