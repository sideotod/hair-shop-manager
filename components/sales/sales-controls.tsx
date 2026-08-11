import Link from "next/link";

import { button } from "../button";
import {
  nextRevenueQuery,
  previousRevenueQuery,
  serializeRevenueQuery,
  type RevenueQuery,
} from "./revenue-query";

import { surface as card } from "../surface";

/**
 * 활성/비활성이 같은 박스 크기를 쓰도록 `border` 를 양쪽 모두에 둔다.
 * 예전에는 활성일 때만 테두리가 빠져 1px 씩 줄이 흔들렸다.
 */
export function navChip(active: boolean) {
  return button("md", active ? "primary" : "secondary");
}
const arrow = button("md", "secondary", "no-print aria-disabled:pointer-events-none aria-disabled:opacity-40");


/** 매출 워크스페이스 전체가 쓰는 단일 기간 목록. 탭마다 다르게 재구현하지 않는다. */
const viewOptions = [["day", "일별"], ["week", "주별"], ["month", "월별"], ["year", "연도"], ["total", "누적"]] as const;

function href(query: RevenueQuery, tab?: "payment" | "expenses") {
  const params = new URLSearchParams(serializeRevenueQuery(query));
  if (tab) params.set("tab", tab);
  return `/sales?${params}`;
}

/**
 * 기간 이동 화살표. `누적` 에서는 이동할 기간이 없다.
 *
 * 예전에는 `aria-disabled` 만 붙은 `<Link>` 였다. 마우스는 `pointer-events-none` 이 막았지만
 * 키보드는 Tab 으로 닿고 Enter 로 그대로 이동했다 — "비활성"이라 말만 하는 상태였다.
 * 링크가 아닐 때는 링크를 그리지 않는다. 그러면 탭 순서에서도 함께 빠진다.
 */
function PeriodArrow({ disabled, href, label, children }: { disabled: boolean; href: string; label: string; children: React.ReactNode }) {
  if (disabled) return <span aria-disabled="true" aria-label={label} className={arrow} role="link">{children}</span>;
  return <Link aria-label={label} className={arrow} href={href}>{children}</Link>;
}

/**
 * `tab` 은 탭 줄의 현재 위치이자 기간 줄을 그릴지 말지를 정한다.
 *
 * 결제 등록 탭에는 기간이 없다. 일별/주별/월별/연도/누적 다섯 칸과 ←/→ 두 칸은 누르면
 * URL 만 바뀌고 결제 폼은 한 글자도 달라지지 않는다 — 폼은 `today={seoulDate()}` 만 본다.
 * 아무 일도 안 하는 컨트롤 7개가 폼보다 먼저 Tab 순서에 서 있었다.
 * 매출 분석·지출/정산은 실제로 기간으로 잘라 보는 화면이라 그대로 둔다.
 */
export function SalesControls({ query, label, tab }: { query: RevenueQuery; label: string; tab?: "payment" | "expenses" }) {
  return <>
    {/* 탭 줄은 언제나 본문 첫 줄이다. 설명문 툴바가 앞뒤로 오가면 탭마다 줄이 위아래로 튄다. */}
    <nav aria-label="매출 기능" className="no-print flex gap-2">
      <Link aria-current={!tab ? "page" : undefined} className={navChip(!tab)} href={href(query)}>매출 분석</Link>
      <Link aria-current={tab === "payment" ? "page" : undefined} className={navChip(tab === "payment")} href={href(query, "payment")}>결제 등록</Link>
      <Link aria-current={tab === "expenses" ? "page" : undefined} className={navChip(tab === "expenses")} href={href(query, "expenses")}>지출/정산</Link>
    </nav>
    {tab !== "payment" && <nav aria-label="매출 조회" className={`${card} mt-5 flex items-center justify-between p-5`}>
      <div className="no-print flex gap-2">
        {viewOptions.map(([view, viewLabel]) => <Link aria-current={query.view === view ? "page" : undefined} className={navChip(query.view === view)} data-sales-period={view} href={href({ ...query, view }, tab)} key={view}>{viewLabel}</Link>)}
      </div>
      <div className="flex items-center gap-3">
        <PeriodArrow disabled={query.view === "total"} href={href(previousRevenueQuery(query), tab)} label="이전 기간">←</PeriodArrow>
        <strong className="font-mono text-[12px] font-medium tabular-nums text-[var(--muted)]">{label}</strong>
        <PeriodArrow disabled={query.view === "total"} href={href(nextRevenueQuery(query), tab)} label="다음 기간">→</PeriodArrow>
      </div>
    </nav>}
  </>;
}
