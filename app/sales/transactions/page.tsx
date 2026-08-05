import Link from "next/link";

import { refundPayment } from "../../payment-actions";
import { AppShell } from "../../../components/app-shell";
import { parseRevenueSearchParams, serializeRevenueQuery } from "../../../components/sales/revenue-query";
import { buildRevenueTransactions, filterRevenueSelection, filterRevenueTransactions, type RevenueSelection } from "../../../lib/revenue-data";
import { createSalonStore } from "../../../lib/salon-store";
import { seoulBusinessDate } from "../../../lib/seoul-date";

const labels = { date: "날짜", payment: "결제수단", service: "시술", gender: "성별", visitType: "방문" } as const;
function value(input: string | string[] | undefined) { return typeof input === "string" ? input : ""; }

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = parseRevenueSearchParams(params, seoulBusinessDate());
  const selection = typeof params.selection === "string" && params.selection in labels ? params.selection as RevenueSelection["kind"] : null;
  const selectionKey = value(params.selectionKey);
  const customerId = value(params.customer);
  const returnTo = `/sales/transactions?${serializeRevenueQuery(query)}${customerId ? `&customer=${encodeURIComponent(customerId)}` : ""}`;
  const store = createSalonStore();
  try {
    const snapshot = store.snapshot();
    const rows = filterRevenueSelection(filterRevenueTransactions(buildRevenueTransactions(snapshot.ledger, snapshot.records.customers ?? []), query), selection && selectionKey ? { kind: selection, key: selectionKey } : null);
    const customer = customerId ? store.get<{ name?: string }>("customers", customerId) : null;
    return <AppShell activeHref="/sales" settings={snapshot.settings}>
      <main className="px-10 pb-16 pt-9">
        <div className="flex items-start justify-between gap-6">
          <div><p className="text-xs font-medium text-[var(--muted)]">매출 · 결제</p><h1 className="mt-1 text-[28px] font-bold tracking-[-0.03em]">거래 기록</h1><p className="mt-2 text-sm text-[var(--muted)]">{selection ? `${labels[selection]} · ${selectionKey}` : "선택 기간의 개별 거래"}</p></div>
          <div className="flex gap-2"><Link className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--brand)]" href={`/sales?${serializeRevenueQuery(query)}`}>매출 분석으로</Link><Link className="rounded-[10px] bg-[var(--brand)] px-4 py-3 text-sm font-medium text-white" href={`/sales?tab=payment${customerId ? `&customer=${encodeURIComponent(customerId)}` : ""}`}>결제 등록</Link></div>
        </div>
        {value(params.error) && <p aria-live="assertive" className="mt-5 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{value(params.error)}</p>}
        {customer && <section aria-label="결제 등록 고객" className="mt-5 rounded-[10px] border border-[var(--border)] bg-white px-5 py-4"><p className="text-sm">결제 등록 고객: <strong>{customer.value.name ?? customer.id}</strong></p></section>}
        <section aria-label="필터된 개별 거래 기록" className="mt-8 overflow-x-auto rounded-[14px] border border-[var(--border)] bg-white" data-revenue-transactions>
          <table className="w-full min-w-[960px] border-collapse text-left text-[13px]"><thead><tr className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]"><th className="p-4">거래 ID</th><th className="p-4">날짜</th><th className="p-4">고객</th><th className="p-4">시술</th><th className="p-4">결제수단</th><th className="p-4">상태</th><th className="p-4 text-right">총 시술금액</th><th className="p-4 text-right">실결제</th><th className="p-4 text-right">샵 수익</th><th className="p-4">처리</th></tr></thead><tbody>
            {rows.map((row) => <tr className="border-b border-[var(--border)] last:border-0" data-revenue-transaction={row.id} key={row.id}><th className="p-4 font-medium">{row.id}</th><td className="p-4">{row.dateLabel}</td><td className="p-4">{row.customerIdentifier}</td><td className="p-4">{row.service}</td><td className="p-4">{row.payment}</td><td className="p-4"><span className="font-medium">{row.status}</span></td><td className="p-4 text-right font-medium tabular-nums">₩{row.gross.toLocaleString("ko-KR")}</td><td className="p-4 text-right font-medium tabular-nums">₩{row.netPaid.toLocaleString("ko-KR")}</td><td className="p-4 text-right font-medium tabular-nums">₩{row.profit.toLocaleString("ko-KR")}</td><td className="p-4">{row.status === "결제" && <div className="flex gap-2"><form action={refundPayment}><input name="targetId" type="hidden" value={row.id} /><input name="requestKey" type="hidden" value={`${row.id}:refund`} /><input name="reason" type="hidden" value="거래 환불" /><input name="returnTo" type="hidden" value={returnTo} /><button className="text-xs font-medium text-red-700" data-refund-payment={row.id} type="submit">환불</button></form><Link className="text-xs font-medium text-[var(--brand)]" data-correct-payment={row.id} href={`/sales?tab=payment&correction=${encodeURIComponent(row.id)}`}>정정</Link></div>}</td></tr>)}
            {rows.length === 0 && <tr><td className="p-10 text-center text-[var(--muted)]" colSpan={10}>조건에 맞는 거래 기록이 없습니다.</td></tr>}
          </tbody></table>
        </section>
      </main>
    </AppShell>;
  } finally { store.close(); }
}
