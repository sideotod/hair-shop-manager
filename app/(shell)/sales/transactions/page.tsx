import Link from "next/link";

import { refundPayment } from "../../../payment-actions";
import { parseRevenueSearchParams, revenueRange, revenueRangeExclusive, serializeRevenueQuery } from "../../../../components/sales/revenue-query";
import { buildRevenueTransactions, filterRevenueSelection, type RevenueSelection } from "../../../../lib/revenue-data";
import { createSalonStore } from "../../../../lib/salon-store";
import { seoulBusinessDate } from "../../../../lib/seoul-date";

const labels = { date: "날짜", payment: "결제수단", service: "시술" } as const;
/**
 * 한 화면에 실을 최대 행 수. 누적 기간 5,576행은 HTML 19.7MB / 2.3초였다 (Measured, D9).
 * 잘라내되 숨기지 않는다 — 몇 건 중 몇 건을 보고 있는지 항상 표시한다 (§18 부분 데이터).
 */
const ROW_LIMIT = 300;
function value(input: string | string[] | undefined) { return typeof input === "string" ? input : ""; }

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = parseRevenueSearchParams(params, seoulBusinessDate());
  const selection = typeof params.selection === "string" && params.selection in labels ? params.selection as RevenueSelection["kind"] : null;
  const selectionKey = value(params.selectionKey);
  const customerId = value(params.customer);
  const analysisHref = `/sales?${serializeRevenueQuery(query)}`;
  const paymentHref = `/sales?tab=payment&${serializeRevenueQuery(query)}${customerId ? `&customer=${encodeURIComponent(customerId)}` : ""}`;
  const returnTo = `/sales/transactions?${serializeRevenueQuery(query)}${customerId ? `&customer=${encodeURIComponent(customerId)}` : ""}`;
  const store = createSalonStore();
  try {
    // 기간 조회로 끝난다. snapshot()은 audit_events 6,435행까지 읽어 2MB를 만든다 (A4-2).
    const period = revenueRangeExclusive(query, store.ledgerBounds());
    const matched = filterRevenueSelection(buildRevenueTransactions(store.listLedgerRange(period.start, period.endExclusive), store.list("customers")), selection && selectionKey ? { kind: selection, key: selectionKey } : null);
    // 최신 거래부터 보여 주고 상한을 건다. 잘린 사실은 표 위·아래에 모두 적는다.
    const rows = matched.length > ROW_LIMIT ? matched.slice(-ROW_LIMIT).reverse() : [...matched].reverse();
    const customer = customerId ? store.get<{ name?: string }>("customers", customerId) : null;
    return <main className="px-7 pb-6 pt-5">
      <div className="flex items-start justify-between gap-6">
        <p className="text-sm text-[var(--muted)]">선택 기간의 개별 거래를 환불·정정합니다. {selection ? `${labels[selection]} · ${selectionKey}` : `${revenueRange(query).label} · ${matched.length.toLocaleString("ko-KR")}건`}{matched.length > rows.length && ` 최근 ${ROW_LIMIT.toLocaleString("ko-KR")}건만 표시합니다 — 전체는 CSV로 내려받으세요.`}</p>
          <div className="flex gap-2"><Link className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--brand)]" href={analysisHref}>매출 분석으로</Link><Link className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--brand)]" href={`/sales/revenue-csv?${serializeRevenueQuery(query)}`}>CSV 전체</Link><Link className="rounded-[var(--radius-card)] bg-[var(--brand)] px-4 py-3 text-sm font-medium text-white" href={paymentHref}>결제 등록</Link></div>
        </div>
        {value(params.error) && <p aria-live="assertive" className="mt-5 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">{value(params.error)}</p>}
        {customer && <section aria-label="결제 등록 고객" className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4"><p className="text-sm">결제 등록 고객: <strong>{customer.value.name ?? customer.id}</strong></p></section>}
        <section aria-label="필터된 개별 거래 기록" className="mt-8 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]" data-revenue-transactions>
          <table className="w-full min-w-[960px] border-collapse text-left text-[13px]"><thead><tr className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]"><th className="p-4">거래 ID</th><th className="p-4">날짜</th><th className="p-4">고객</th><th className="p-4">시술</th><th className="p-4">결제수단</th><th className="p-4">상태</th><th className="p-4 text-right">총 시술금액</th><th className="p-4 text-right">실결제</th><th className="p-4 text-right">샵 수익</th><th className="p-4">처리</th></tr></thead><tbody>
            {rows.map((row) => <tr className="border-b border-[var(--border)] last:border-0" data-revenue-transaction={row.id} key={row.id}><th className="p-4 font-medium">{row.id}</th><td className="p-4">{row.dateLabel}</td><td className="p-4">{row.customerIdentifier}</td><td className="p-4">{row.service}</td><td className="p-4">{row.payment}</td><td className="p-4"><span className="font-medium">{row.status}</span></td><td className="p-4 text-right font-medium tabular-nums">₩{row.gross.toLocaleString("ko-KR")}</td><td className="p-4 text-right font-medium tabular-nums">₩{row.netPaid.toLocaleString("ko-KR")}</td><td className="p-4 text-right font-medium tabular-nums">₩{row.profit.toLocaleString("ko-KR")}</td><td className="p-4">{row.status === "결제" && <div className="flex gap-2"><form action={refundPayment}><input name="targetId" type="hidden" value={row.id} /><input name="requestKey" type="hidden" value={`${row.id}:refund`} /><input name="reason" type="hidden" value="거래 환불" /><input name="returnTo" type="hidden" value={returnTo} /><button className="text-xs font-medium text-[var(--danger)]" data-refund-payment={row.id} type="submit">환불</button></form><Link className="text-xs font-medium text-[var(--brand)]" data-correct-payment={row.id} href={`${paymentHref}&correction=${encodeURIComponent(row.id)}`}>정정</Link></div>}</td></tr>)}
            {rows.length === 0 && <tr><td className="p-10 text-center text-[var(--muted)]" colSpan={10}>조건에 맞는 거래 기록이 없습니다.</td></tr>}
            {matched.length > rows.length && <tr><td className="border-t border-[var(--border)] bg-[var(--background)] p-4 text-center text-[13px] text-[var(--muted)]" colSpan={10}>전체 {matched.length.toLocaleString("ko-KR")}건 중 최근 {rows.length.toLocaleString("ko-KR")}건입니다. 이전 거래는 기간을 좁히거나 CSV로 확인하세요.</td></tr>}
          </tbody></table>
        </section>
      </main>;
  } finally { store.close(); }
}
