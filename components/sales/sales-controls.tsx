import Link from "next/link";

import {
  nextRevenueQuery,
  previousRevenueQuery,
  serializeRevenueQuery,
  type RevenueQuery,
} from "./revenue-query";

const card = "rounded-[8px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(13,21,18,0.03)]";

function href(query: RevenueQuery, tab?: "payment" | "expenses") {
  const params = new URLSearchParams(serializeRevenueQuery(query));
  if (tab) params.set("tab", tab);
  return `/sales?${params}`;
}

export function SalesControls({ query, label, tab }: { query: RevenueQuery; label: string; tab?: "payment" | "expenses" }) {
  return <>
    <nav aria-label="매출 기능" className="mt-6 flex gap-2">
      <Link aria-current={!tab ? "page" : undefined} className={`rounded-[9px] px-4 py-2 text-sm font-medium ${!tab ? "bg-[var(--brand)] text-white" : "border border-[var(--border)] bg-white"}`} href={href(query)}>매출 분석</Link>
      <Link aria-current={tab === "payment" ? "page" : undefined} className={`rounded-[9px] px-4 py-2 text-sm font-medium ${tab === "payment" ? "bg-[var(--brand)] text-white" : "border border-[var(--border)] bg-white"}`} href={href(query, "payment")}>결제 등록</Link>
      <Link aria-current={tab === "expenses" ? "page" : undefined} className={`rounded-[9px] px-4 py-2 text-sm font-medium ${tab === "expenses" ? "bg-[var(--brand)] text-white" : "border border-[var(--border)] bg-white"}`} href={href(query, "expenses")}>지출/정산</Link>
    </nav>
    <section aria-label="매출 조회" className={`${card} mt-4 flex items-center justify-between p-4`}>
      <div className="flex gap-2">
        {(["day", "month", "total"] as const).map((view) => <Link aria-current={query.view === view ? "page" : undefined} className={`rounded-[9px] px-4 py-2 text-sm font-medium ${query.view === view ? "bg-[var(--brand)] text-white" : "border border-[var(--border)]"}`} href={href({ ...query, view }, tab)} key={view}>{view === "day" ? "일별" : view === "month" ? "월별" : "누적"}</Link>)}
      </div>
      <div className="flex items-center gap-3">
        <Link aria-disabled={query.view === "total"} aria-label="이전 기간" className="rounded border border-[var(--border)] px-3 py-2 aria-disabled:pointer-events-none aria-disabled:opacity-40" href={href(previousRevenueQuery(query), tab)}>←</Link>
        <strong>{label}</strong>
        <Link aria-disabled={query.view === "total"} aria-label="다음 기간" className="rounded border border-[var(--border)] px-3 py-2 aria-disabled:pointer-events-none aria-disabled:opacity-40" href={href(nextRevenueQuery(query), tab)}>→</Link>
      </div>
    </section>
  </>;
}
