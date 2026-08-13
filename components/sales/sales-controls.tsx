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
const arrow = button("md", "secondary", "aria-disabled:pointer-events-none aria-disabled:opacity-40");


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
 * `tab` 은 기간 줄을 그릴지 말지를 정한다.
 *
 * 결제 등록에는 기간이 없다. 일별/주별/월별/연도/누적 다섯 칸과 ←/→ 두 칸은 누르면
 * URL 만 바뀌고 결제 폼은 한 글자도 달라지지 않는다 — 폼은 자기 기본 날짜만 본다.
 * 아무 일도 안 하는 컨트롤 7개가 폼보다 먼저 Tab 순서에 서 있었다.
 * 매출 분석·지출/정산은 실제로 기간으로 잘라 보는 화면이라 그대로 둔다.
 *
 * 탭 줄(매출 분석 · 결제 등록 · 지출/정산)은 없앴다. 셋은 성격이 다르다 —
 * 분석은 읽는 화면, 결제는 쓰는 작업, 지출은 이 매장이 쓰지 않는 기능이다(지출 원장 0건).
 * 한 줄에 나란히 두면 "이 셋이 한 묶음"으로 배우게 된다. 결제는 업무 문맥에서
 * (예약 행·고객 상세·오늘 화면) 열리고, 거래 기록은 사이드바가 맡는다.
 * 라우트(`?tab=payment`, `?tab=expenses`)는 그대로 살아 있다 — 링크만 내렸다.
 */
export function SalesControls({ query, label, tab }: { query: RevenueQuery; label: string; tab?: "payment" | "expenses" }) {
  if (tab === "payment") return null;
  return <nav aria-label="매출 조회" className={`${card} flex items-center justify-between p-5`}>
    <div className="flex gap-2">
      {viewOptions.map(([view, viewLabel]) => <Link aria-current={query.view === view ? "page" : undefined} className={navChip(query.view === view)} data-sales-period={view} href={href({ ...query, view }, tab)} key={view}>{viewLabel}</Link>)}
    </div>
    <div className="flex items-center gap-3">
      <PeriodArrow disabled={query.view === "total"} href={href(previousRevenueQuery(query), tab)} label="이전 기간">←</PeriodArrow>
      <strong className="font-mono text-[12px] font-medium tabular-nums text-[var(--muted)]">{label}</strong>
      <PeriodArrow disabled={query.view === "total"} href={href(nextRevenueQuery(query), tab)} label="다음 기간">→</PeriodArrow>
    </div>
  </nav>;
}
