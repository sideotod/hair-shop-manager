import Link from "next/link";

import { AppShell } from "../../../components/app-shell";
import { parseRevenueSearchParams, serializeRevenueQuery } from "../../../components/sales/revenue-query";
import { filterRevenueSelection, filterRevenueTransactions, revenueTransactions } from "../../../lib/revenue-data";
import { createSalonStore } from "../../../lib/salon-store";

const labels = { date: "날짜", payment: "결제수단", service: "시술", staff: "담당자", deduction: "공제" } as const;
type SelectionKind = keyof typeof labels;

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input : "";
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selection = typeof params.selection === "string" && params.selection in labels ? params.selection as SelectionKind : null;
  const selectionKey = value(params.selectionKey);
  const customerId = value(params.customer);
  const query = parseRevenueSearchParams(params);
  const rows = filterRevenueSelection(filterRevenueTransactions(revenueTransactions, query), selection && selectionKey ? { kind: selection, key: selectionKey } : null);
  const backHref = `/sales?${serializeRevenueQuery(query)}`;
  const store = createSalonStore();
  const customer = customerId ? store.get<{ name?: string }>("customers", customerId) : null;
  store.close();

  return (
    <AppShell activeHref="/sales">
      <main className="px-10 pb-16 pt-9">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-medium text-[var(--muted)]">매출 · 결제</p>
            <h1 className="mt-1 text-[28px] font-bold tracking-[-0.03em]">거래 기록</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{selection ? `${labels[selection]} · ${selectionKey}` : "필터된 개별 거래"}</p>
          </div>
          <Link className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--brand)]" href={backHref}>매출 분석으로 돌아가기</Link>
        </div>

        {customer && <section aria-label="결제 등록 고객" className="mt-5 rounded-[10px] border border-[var(--border)] bg-white px-5 py-4"><p className="text-sm">결제 등록 고객: <strong>{customer.value.name ?? customer.id}</strong></p><input name="customerId" type="hidden" value={customer.id} /></section>}

        <section className="mt-8 overflow-x-auto rounded-[14px] border border-[var(--border)] bg-white" aria-label="필터된 개별 거래 기록" data-revenue-transactions>
          <table className="w-full min-w-[960px] border-collapse text-left text-[13px]">
            <thead><tr className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]"><th className="p-4">거래 ID</th><th className="p-4">날짜 · 순번</th><th className="p-4">고객 식별자</th><th className="p-4">시술</th><th className="p-4">담당자</th><th className="p-4">결제수단</th><th className="p-4 text-right">금액</th><th className="p-4 text-right">샵 수익</th></tr></thead>
            <tbody>
              {rows.map((row) => <tr className="border-b border-[var(--border)] last:border-0" data-revenue-transaction={row.id} key={row.id}><th className="p-4 font-medium">{row.id}</th><td className="p-4">{row.dateLabel} · #{String(row.sequence).padStart(3, "0")}</td><td className="p-4">{row.customerIdentifier}</td><td className="p-4">{row.service}</td><td className="p-4">{row.staff}</td><td className="p-4">{row.payment}</td><td className="p-4 text-right font-medium tabular-nums">₩{row.gross.toLocaleString("ko-KR")}</td><td className="p-4 text-right font-medium tabular-nums">₩{row.profit.toLocaleString("ko-KR")}</td></tr>)}
              {rows.length === 0 && <tr><td className="p-10 text-center text-[var(--muted)]" colSpan={8}>조건에 맞는 거래 기록이 없습니다.</td></tr>}
            </tbody>
          </table>
        </section>
      </main>
    </AppShell>
  );
}
