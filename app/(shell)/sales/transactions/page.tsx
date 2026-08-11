import Link from "next/link";

import { refundPayment } from "../../../payment-actions";
import { button, focusRing } from "../../../../components/button";
import { PageToolbar } from "../../../../components/page-toolbar";
import { parseRevenueSearchParams, revenueRange, revenueRangeExclusive, serializeRevenueQuery } from "../../../../components/sales/revenue-query";
import { buildRevenueTransactions, filterRevenueSelection, type RevenueSelection } from "../../../../lib/revenue-data";
import { createSalonStore } from "../../../../lib/salon-store";
import { seoulBusinessDate } from "../../../../lib/seoul-date";
import { SubmitButton } from "../../../../components/submit-button";

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
    return <main className="min-w-0 px-7 pb-6 pt-5">
      <PageToolbar description={<>선택 기간의 개별 거래를 환불·정정합니다. {selection ? `${labels[selection]} · ${selectionKey}` : `${revenueRange(query).label} · ${matched.length.toLocaleString("ko-KR")}건`}{matched.length > rows.length && ` 최근 ${ROW_LIMIT.toLocaleString("ko-KR")}건만 표시합니다 — 전체는 CSV로 내려받으세요.`}</>}><Link className={button("md")} href={analysisHref}>매출 분석으로</Link><Link className={button("md")} href={`/sales/revenue-csv?${serializeRevenueQuery(query)}`}>CSV 전체</Link><Link className={button("md", "primary")} href={paymentHref}>결제 등록</Link></PageToolbar>
        {/* `role="alert"` 이 이미 assertive 다. `aria-live` 를 겹치면 두 번 읽힌다. */}
        {value(params.error) && <p className="mt-5 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">{value(params.error)}</p>}
        {value(params.notice) && <p className="mt-5 rounded-[var(--radius-card)] border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]" role="status">{value(params.notice)}</p>}
        {customer && <section aria-label="결제 등록 고객" className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4"><p className="text-sm">결제 등록 고객: <strong>{customer.value.name ?? customer.id}</strong></p></section>}
        {/* 가로 스크롤 영역은 그 자체가 포커스를 받아야 키보드만으로 오른쪽 칸을 볼 수 있다. */}
        <section aria-label="필터된 개별 거래 기록" className={`mt-8 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] ${focusRing}`} data-revenue-transactions tabIndex={0}>
          <table className="w-full min-w-[960px] border-collapse text-left text-[13px]"><caption className="sr-only">{revenueRange(query).label} 개별 거래 기록</caption><thead><tr className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]"><th className="p-4" scope="col">거래 ID</th><th className="p-4" scope="col">날짜</th><th className="p-4" scope="col">고객</th><th className="p-4" scope="col">시술</th><th className="p-4" scope="col">결제수단</th><th className="p-4" scope="col">상태</th><th className="p-4 text-right" scope="col">총 시술금액</th><th className="p-4 text-right" scope="col">실결제</th><th className="p-4 text-right" scope="col">샵 수익</th><th className="p-4" scope="col">처리</th></tr></thead><tbody>
            {rows.map((row) => <tr className="border-b border-[var(--border)] last:border-0" data-revenue-transaction={row.id} key={row.id}><th className="p-4 font-medium" scope="row">{row.id}</th><td className="p-4">{row.dateLabel}</td><td className="p-4">{row.customerIdentifier}</td><td className="p-4">{row.service}</td><td className="p-4">{row.payment}</td><td className="p-4"><span className="font-medium">{row.status}</span></td><td className="p-4 text-right font-medium tabular-nums">₩{row.gross.toLocaleString("ko-KR")}</td><td className="p-4 text-right font-medium tabular-nums">₩{row.netPaid.toLocaleString("ko-KR")}</td><td className="p-4 text-right font-medium tabular-nums">₩{row.profit.toLocaleString("ko-KR")}</td><td className="p-4">{row.status === "결제" && <div className="flex items-start gap-3">
              {/* 환불은 되돌릴 수 없다. 사유칸이 곧 확인 절차이므로 숨은 값이 아니라 원장이 직접 적는 칸이어야 한다. */}
              <details><summary className={`${focusRing} inline-flex h-8 cursor-pointer list-none items-center rounded-[var(--radius-control)] px-2 text-xs font-medium text-[var(--danger)]`}>환불</summary><form action={refundPayment} className="mt-2 flex items-end gap-2"><input name="targetId" type="hidden" value={row.id} /><input name="requestKey" type="hidden" value={`${row.id}:refund`} /><input name="returnTo" type="hidden" value={returnTo} /><label className="grid gap-1 text-[11px] font-medium text-[var(--muted)]"><span>환불 사유</span><input className={`${focusRing} h-8 w-40 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2 text-xs`} name="reason" required /></label><SubmitButton data-refund-payment={row.id} extra={`${focusRing} border-[var(--danger)] text-[var(--danger)]`} size="sm" tone="secondary">환불 확정</SubmitButton></form></details>
              <Link className={`${focusRing} inline-flex h-8 items-center rounded-[var(--radius-control)] px-2 text-xs font-medium text-[var(--brand)]`} data-correct-payment={row.id} href={`${paymentHref}&correction=${encodeURIComponent(row.id)}`}>정정</Link>
            </div>}</td></tr>)}
            {rows.length === 0 && <tr><td className="p-8 text-center text-[var(--muted)]" colSpan={10}>조건에 맞는 거래 기록이 없습니다.</td></tr>}
            {matched.length > rows.length && <tr><td className="border-t border-[var(--border)] bg-[var(--background)] p-4 text-center text-[13px] text-[var(--muted)]" colSpan={10}>전체 {matched.length.toLocaleString("ko-KR")}건 중 최근 {rows.length.toLocaleString("ko-KR")}건입니다. 이전 거래는 기간을 좁히거나 CSV로 확인하세요.</td></tr>}
          </tbody></table>
        </section>
      </main>;
  } finally { store.close(); }
}
