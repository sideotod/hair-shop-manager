import Link from "next/link";

import {
  nextRevenueQuery,
  previousRevenueQuery,
  serializeRevenueQuery,
  type RevenueQuery,
} from "./revenue-query";

const card = "rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(13,21,18,0.03)]";

/**
 * 활성/비활성이 같은 박스 크기를 쓰도록 `border` 를 양쪽 모두에 둔다.
 * 예전에는 활성일 때만 테두리가 빠져 1px 씩 줄이 흔들렸다.
 */
export function navChip(active: boolean) {
  return `rounded-[var(--radius-control)] border px-4 py-2 text-sm font-medium ${active ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--border)] bg-[var(--surface)]"}`;
}
const arrow = "no-print rounded border border-[var(--border)] px-3 py-2 aria-disabled:pointer-events-none aria-disabled:opacity-40";

/** 매출 워크스페이스 전체가 쓰는 단일 기간 목록. 탭마다 다르게 재구현하지 않는다. */
const viewOptions = [["day", "일별"], ["week", "주별"], ["month", "월별"], ["year", "연도"], ["total", "누적"]] as const;

function href(query: RevenueQuery, tab?: "payment" | "expenses") {
  const params = new URLSearchParams(serializeRevenueQuery(query));
  if (tab) params.set("tab", tab);
  return `/sales?${params}`;
}

export function SalesControls({ query, label, tab }: { query: RevenueQuery; label: string; tab?: "payment" | "expenses" }) {
  return <>
    {/* 탭 줄은 언제나 본문 첫 줄이다. 설명문 툴바가 앞뒤로 오가면 탭마다 줄이 위아래로 튄다. */}
    <nav aria-label="매출 기능" className="no-print flex gap-2">
      <Link aria-current={!tab ? "page" : undefined} className={navChip(!tab)} href={href(query)}>매출 분석</Link>
      <Link aria-current={tab === "payment" ? "page" : undefined} className={navChip(tab === "payment")} href={href(query, "payment")}>결제 등록</Link>
      <Link aria-current={tab === "expenses" ? "page" : undefined} className={navChip(tab === "expenses")} href={href(query, "expenses")}>지출/정산</Link>
    </nav>
    <nav aria-label="매출 조회" className={`${card} mt-4 flex items-center justify-between p-4`}>
      <div className="no-print flex gap-2">
        {viewOptions.map(([view, viewLabel]) => <Link aria-current={query.view === view ? "page" : undefined} className={navChip(query.view === view)} data-sales-period={view} href={href({ ...query, view }, tab)} key={view}>{viewLabel}</Link>)}
      </div>
      <div className="flex items-center gap-3">
        <Link aria-disabled={query.view === "total"} aria-label="이전 기간" className={arrow} href={href(previousRevenueQuery(query), tab)}>←</Link>
        <strong className="font-mono text-[12px] font-medium tabular-nums text-[var(--muted)]">{label}</strong>
        <Link aria-disabled={query.view === "total"} aria-label="다음 기간" className={arrow} href={href(nextRevenueQuery(query), tab)}>→</Link>
      </div>
    </nav>
  </>;
}
