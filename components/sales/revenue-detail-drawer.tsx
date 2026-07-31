"use client";

import { useEffect, useRef } from "react";

import type { RevenueAnalytics } from "./revenue-analytics";
import { serializeRevenueQuery, type RevenueQuery } from "./revenue-query";

export type RevenueSelection = { kind: "date" | "payment" | "service" | "gender" | "visitType"; key: string };
type FocusTarget = Pick<HTMLElement, "focus"> | null;

export function revenueDrawerFocusTarget(key: string, shiftKey: boolean, activeElement: unknown, first: FocusTarget, last: FocusTarget) {
  if (key !== "Tab" || !first || !last) return null;
  if (shiftKey && activeElement === first) return last;
  return !shiftKey && activeElement === last ? first : null;
}
export function dismissRevenueDrawer(key: string | null, onClose: () => void) { if (key === null || key === "Escape") onClose(); }

function detailFor(selection: RevenueSelection, analytics: RevenueAnalytics) {
  if (selection.kind === "date") { const row = analytics.trend.find((item) => item.date === selection.key); return { label: "매출", rows: [["총매출", row?.gross], ["샵 수익", row?.profit]] as const }; }
  if (selection.kind === "payment") { const row = analytics.payments.find((item) => item.name === selection.key); return { label: "결제수단", rows: [["금액", row?.amount], ["비중", row ? `${row.value}%` : undefined]] as const }; }
  const rows = selection.kind === "service" ? analytics.services : selection.kind === "gender" ? analytics.genders : analytics.visitTypes;
  return { label: selection.kind === "service" ? "시술" : selection.kind === "gender" ? "성별" : "방문", rows: [["매출", rows.find((item) => item.name === selection.key)?.sales]] as const };
}

export function RevenueDetailDrawer({ analytics, onClose, query, selection }: { analytics: RevenueAnalytics; onClose: () => void; query: RevenueQuery; selection: RevenueSelection }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const detail = detailFor(selection, analytics);
  const params = new URLSearchParams(serializeRevenueQuery(query));
  params.set("selection", selection.kind); params.set("selectionKey", selection.key);
  useEffect(() => { closeRef.current?.focus(); }, [selection]);
  return <aside aria-labelledby="revenue-detail-title" aria-modal="true" className="fixed inset-y-0 right-0 z-50 w-[420px] border-l border-[var(--border)] bg-white p-7 shadow-2xl focus:outline-none" data-revenue-drawer onKeyDown={(event) => {
    if (event.key === "Escape") return dismissRevenueDrawer(event.key, onClose);
    const target = revenueDrawerFocusTarget(event.key, event.shiftKey, event.currentTarget.ownerDocument.activeElement, closeRef.current, linkRef.current);
    if (target) { event.preventDefault(); target.focus(); }
  }} role="dialog" tabIndex={-1}>
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium text-[var(--muted)]">{analytics.selectedPeriod.label}</p><h2 className="mt-1 text-xl font-bold" id="revenue-detail-title">{selection.key} {detail.label} 상세</h2></div><button className="rounded-[8px] border border-[var(--border)] px-3 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]" data-revenue-drawer-close onClick={() => dismissRevenueDrawer(null, onClose)} ref={closeRef} type="button">닫기</button></div>
    <dl className="mt-8 grid gap-3">{detail.rows.map(([label, value]) => <div className="flex items-center justify-between rounded-[10px] bg-[var(--background)] px-4 py-3" key={label}><dt className="text-sm text-[var(--muted)]">{label}</dt><dd className="font-bold tabular-nums">{typeof value === "number" ? `₩${value.toLocaleString("ko-KR")}` : value ?? "데이터 없음"}</dd></div>)}</dl>
    <a className="mt-8 flex h-11 items-center justify-center rounded-[10px] bg-[var(--brand)] text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]" data-revenue-drawer-link href={`/sales/transactions?${params}`} ref={linkRef}>거래 기록에서 환불·정정</a>
  </aside>;
}
