"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { button, focusRing } from "../button";
import { ModalHost } from "../modal-host";
import type { JsonObject } from "../../lib/salon-domain";
import type { RevenueAnalyticsView } from "./revenue-analytics";
import { RevenueBarChart } from "./revenue-bar-chart";
import { chartEase, chartShell, chartWell } from "./revenue-chart-style";
import { RevenueDayChart } from "./revenue-day-chart";
import type { RevenueAggregatePoint, RevenueSummary } from "../../lib/revenue-aggregate";
import type { CustomerBriefing, SalonBriefing, VisitPattern } from "../../lib/salon-briefing";
import {
  RevenueDetailDrawer,
  type RevenueSelection,
} from "./revenue-detail-drawer";
import { surface as card } from "../surface";
import { typeScale } from "../type";
import {
  nextRevenueQuery,
  previousRevenueQuery,
  revenueQueryMoves,
  serializeRevenueQuery,
  type RevenueQuery,
} from "./revenue-query";

const chartCard = chartShell;

/** 기간 칩 4개. 각 칩은 막대 단위이고, 창은 그 단위가 읽히는 크기다. */
const viewOptions = [
  ["day", "일별"],
  ["week", "주별"],
  ["month", "월별"],
  ["year", "년별"],
] as const;

/** 서버가 계산해 넘기는 차트 입력. 프런트는 이 값을 다시 합산하지 않는다 (§14). */
export type RevenueSeries = {
  readonly label: string;
  readonly points: readonly RevenueAggregatePoint[];
  readonly total: number;
  readonly count: number;
};
/** 잘게 쪼갠 막대 — 한 달의 날(28~31칸) 또는 한 해의 주(52~53칸). */
export type RevenueDayChartData = RevenueSeries & {
  readonly kind: "day";
  readonly span: "month" | "year";
  readonly title: string;
  /** 달이 바뀌는 칸 번호. 주별에서만 채운다. */
  readonly dividers?: readonly number[];
  /** 그림이 못 말하는 규칙 한 줄 (연 경계 주 합산 등). */
  readonly footNote?: string;
  /** 고른 기간과 그린 기간이 다를 때만 채운다. */
  readonly contextNote?: string;
  /** 진행 중인 기간을 잘라 견줬을 때 며칠까지인지. */
  readonly comparisonNote?: string;
  readonly deltaPrevious: number | null;
};
/** 월 또는 연 단위 막대. */
export type RevenueBarChartData = RevenueSeries & {
  readonly kind: "bar";
  readonly title: string;
  readonly previousLabel: string;
  readonly yearOverYearLabel?: string;
  readonly emptyText: string;
  readonly drilldown: "month" | "year";
};
/** 기간 버튼이 고른 단 하나의 차트. 세 벌을 함께 그리지 않는다. */
export type RevenueChartData = RevenueDayChartData | RevenueBarChartData;

/** 서버가 만든 브리핑. 화면은 문장을 조립하지 않고 받아 쓴다. */
export type RevenueBriefing = {
  readonly revenue: SalonBriefing;
  /** KPI 카드의 증감 라벨. 진행 중인 기간이면 "지난달 같은 기간" 처럼 잘라 견준 사실을 말한다. */
  readonly comparisonLabel: string;
  /** 아직 끝나지 않은 기간인가. 점선 테두리로 "확정 아님"을 알린다. */
  readonly inProgress: boolean;
  readonly weekdayHeadline: string;
  readonly hourHeadline: string;
  readonly weekday: readonly VisitPattern[];
  readonly hour: readonly VisitPattern[];
  /** 원본 이관 레코드에 실제 시간 정보가 있을 때만 시간대 분석을 표시한다. */
  readonly availability?: { readonly hour: boolean };
  readonly customers: CustomerBriefing;
  readonly averageTicket: number | null;
};
const won = (value: number) => `₩${value.toLocaleString("ko-KR")}`;
export function revenueChartMotion(
  reduced: boolean,
  begin = 0,
  duration = 480,
) {
  return {
    isAnimationActive: !reduced,
    animationBegin: reduced ? 0 : begin,
    animationDuration: reduced ? 0 : duration,
    animationEasing: chartEase,
  };
}
export function revenueChartMotions(reduced: boolean) {
  return {
    service: revenueChartMotion(reduced, 0, 460),
  };
}
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(reducedMotionQuery);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(reducedMotionQuery).matches,
    () => true,
  );
}
export function focusChartSurface<T extends Pick<HTMLElement, "focus"> | null>(
  target: T,
) {
  target?.focus();
  return target;
}
export function restoreRevenueDrawerFocus(
  open: boolean,
  target: Pick<HTMLElement, "focus"> | null,
) {
  if (!open) target?.focus();
}

export function resolveRevenueSelection(
  kind: RevenueSelection["kind"],
  value: unknown,
  analytics: RevenueAnalyticsView,
): RevenueSelection | null {
  if (!value || typeof value !== "object") return null;
  const chart = value as {
    activeLabel?: unknown;
    activePayload?: readonly { payload?: { date?: unknown; name?: unknown } }[];
    activeTooltipIndex?: unknown;
  };
  const payload = chart.activePayload?.[0]?.payload;
  const key =
    kind === "date" ? (payload?.date ?? chart.activeLabel) : payload?.name;
  if (typeof key === "string") return { kind, key };
  const index = Number(chart.activeTooltipIndex);
  if (!Number.isInteger(index) || index < 0) return null;
  if (kind === "date")
    return analytics.trend[index]
      ? { kind, key: analytics.trend[index].date }
      : null;
  const items =
    kind === "payment" ? analytics.payments : analytics.services;
  return items[index] ? { kind, key: items[index].name } : null;
}

/**
 * 단일 색상(brand) 램프. 순위가 곧 농도다 (A2-7).
 * `transparent` 대신 `--surface` 로 섞어 불투명하게 만든다 — 움푹한 우물 위에서도 대비가 유지된다.
 */
const barFills = ["var(--brand)", ...[78, 62, 48, 36].map((pct) => `color-mix(in srgb, var(--brand) ${pct}%, var(--surface))`)];
export function barFill(index: number) {
  return barFills[Math.min(index, barFills.length - 1)];
}
/** 0~1 배율. scaleX로 그려 레이아웃 없이 합성만 시킨다. 최소 2%는 남겨 작은 값도 보이게. */
export function barScale(sales: number, max: number) {
  return max > 0 ? Math.max(sales / max, 0.02) : 0;
}

function ChartCard({
  title,
  kind,
  children,
  meta,
}: {
  title: string;
  kind: RevenueSelection["kind"];
  children: React.ReactNode;
  meta?: string;
}) {
  return (
    <section className={`${chartCard} overflow-hidden`}>
      <div className="flex items-center justify-between px-[18px] pb-[13px] pt-[16px]">
        <h2 className={`${typeScale.micro} text-[var(--muted)]`} id={`revenue-chart-${kind}-title`}>
          {title}
        </h2>
        {meta && <span className="text-[12px] text-[var(--muted)]">{meta}</span>}
      </div>
      <div className="border-t border-[var(--border)] px-[18px] pb-[10px] pt-[8px]">{children}</div>
    </section>
  );
}
function ChartSurface({
  kind,
  label,
  children,
  onReady,
}: {
  kind: RevenueSelection["kind"];
  label: string;
  children: React.ReactNode;
  onReady: (element: HTMLDivElement | null) => void;
}) {
  return (
    <div
      aria-describedby={`revenue-chart-${kind}-title`}
      aria-label={`${label} 차트 상호작용 영역`}
      // 시술 유형은 설정에서 관리하는 목록이라 열 몇 개로 끝난다. 280px 에 잘리면
      // 마지막 한 줄이 반쯤 잘린 채 스크롤을 강요한다 — 다 보여줄 수 있으면 다 보여준다.
      // 상한은 남겨 둔다: 유형이 스무 개가 되면 그때는 스크롤이 맞다.
      className={`max-h-[420px] overflow-y-auto ${focusRing}`}
      data-revenue-chart={kind}
      onPointerDown={(event) => focusChartSurface(event.currentTarget)}
      ref={onReady}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
function DataTable({
  caption,
  rows,
}: {
  caption: string;
  rows: readonly { name: string; sales: number }[];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <th>{row.name}</th>
            <td>{won(row.sales)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * 브리핑 머리글. 이 화면에서 사용자가 처음 읽는 한 문장이고, 나머지는 그 문장의 근거다.
 * 색은 방향(늘었다/줄었다)에만 쓴다 — 비교할 수 없을 때는 색도 쓰지 않는다.
 *
 * 아직 끝나지 않은 기간이면 점선 테두리를 두른다. Amplitude 가 진행 중인 구간을
 * 점선으로 감싸고 Datawrapper 가 추정 구간을 점선으로 그리는 것과 같은 문법이다 —
 * "이 숫자는 아직 확정이 아니다"를 색이나 문장 없이도 알아보게 한다.
 */
function BriefingHeadline({ briefing, inProgress }: { briefing: SalonBriefing; inProgress: boolean }) {
  const tone = briefing.tone === "up" ? "text-[var(--success)]" : briefing.tone === "down" ? "text-[var(--danger)]" : "text-[var(--foreground)]";
  return (
    <section aria-label="기간 요약" className={`${card} p-5 ${inProgress ? "border-dashed" : ""}`}>
      <h2 className={`${typeScale.micro} text-[var(--muted)]`}>
        이번 기간 한 줄{inProgress && <span className="ml-2 font-normal tracking-normal">아직 진행 중</span>}
      </h2>
      <p className={`mt-[10px] ${typeScale.title} ${tone}`}>{briefing.headline}</p>
      <p className="mt-[8px] font-mono text-[11px] tabular-nums text-[var(--muted)]">{briefing.evidence}</p>
    </section>
  );
}

/**
 * 방문 분포 한 벌 (요일 또는 시간대). 문장이 먼저 오고 막대는 근거다 —
 * 막대만 있으면 사용자는 눈으로 최대값을 찾아야 한다.
 */
function PatternCard({ title, headline, rows, reduced }: { title: string; headline: string; rows: readonly VisitPattern[]; reduced: boolean }) {
  return (
    <section className={`${card} flex flex-col p-5`}>
      <h2 className={`${typeScale.micro} text-[var(--muted)]`}>{title}</h2>
      <p className="mt-[10px] text-[13px]">{headline}</p>
      <ul className="mt-4 grid content-start gap-[6px]">
        {rows.map((row) => (
          <li className="grid grid-cols-[34px_minmax(0,1fr)_58px] items-center gap-3" key={row.label}>
            <span className={`text-[12px] ${row.busiest ? "font-semibold" : "text-[var(--muted)]"}`}>{row.label}</span>
            <span className={`relative h-[16px] overflow-clip ${chartWell} rounded-[var(--radius-chip)]`}>
              <span
                className="absolute inset-y-[2px] left-0 w-full origin-left rounded-[var(--radius-chip)]"
                style={{
                  background: row.busiest ? "var(--brand)" : "color-mix(in srgb, var(--brand) 42%, var(--surface))",
                  transform: `scaleX(${row.ratio})`,
                  transition: reduced ? undefined : `transform 460ms ${chartEase}`,
                }}
              />
            </span>
            <span className="text-right font-mono text-[11px] tabular-nums text-[var(--muted)]">{row.count}건</span>
          </li>
        ))}
      </ul>
      <table className="sr-only">
        <caption>{`${title} 표`}</caption>
        <tbody>
          {rows.map((row) => <tr key={row.label}><th>{row.label}</th><td>{`${row.count}건 · ${won(row.gross)}`}</td></tr>)}
        </tbody>
      </table>
    </section>
  );
}

/** 결손값을 순위나 비중으로 꾸미지 않는다. 금액 정산은 여전히 원장 정본에서 읽힌다. */
function UnavailableAnalysisCard({ title }: { title: string }) {
  return (
    <section aria-label={`${title} 원본 정보 없음`} className={`${card} p-5`}>
      <h2 className={`${typeScale.micro} text-[var(--muted)]`}>{title}</h2>
      <p className="mt-[10px] text-[13px] font-semibold">원본 정보 없음</p>
      <p className="mt-[6px] text-[12px] leading-5 text-[var(--muted)]">
        가져온 기록에 이 분석에 필요한 정보가 없습니다. 데이터 이관 시 복원됩니다.
      </p>
      <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] leading-5 text-[var(--muted)]">
        금액 기준 매출과 정산은 원장 기록으로 계속 확인할 수 있습니다.
      </p>
    </section>
  );
}

/**
 * 누가 왔는가. 비율을 못 내는 자리는 숫자 대신 `–` 를 둔다 — 0%로 속이지 않는다.
 * 건당 결제액은 KPI 카드가 이미 보여주므로 여기서 되풀이하지 않는다.
 */
function CustomerCard({ customers }: { customers: CustomerBriefing }) {
  // 각 줄이 자기 계산법을 달고 다닌다. 조사해 보니 "재방문율"이 업계에서 최소 네 가지
  // 서로 호환되지 않는 뜻으로 쓰이고 있었다 — 다른 프로그램을 쓰던 사용자가 같은 말을
  // 다른 뜻으로 알고 온다. Phorest 만이 숫자마다 계산법을 붙이는데, 그 편이 옳다.
  const rows: readonly { label: string; value: string; note?: string; how: string }[] = [
    // 방문은 결제 건수가 아니다. 한 손님이 같은 날 두 번 결제해도 온 것은 한 번이다.
    { label: "방문", value: `${customers.visits.toLocaleString("ko-KR")}회`, how: "손님이 온 날 수 (같은 날 두 번 결제해도 1회)" },
    { label: "다녀간 고객", value: `${customers.customers.toLocaleString("ko-KR")}명`, note: customers.visitsPerCustomer === null ? undefined : `1인당 ${customers.visitsPerCustomer}회`, how: "이 기간에 온 사람 수 (중복 제외)" },
    { label: "이번이 첫 방문", value: `${customers.newCustomers.toLocaleString("ko-KR")}명`, how: "전체 기록에서 이 기간에 처음 결제한 사람" },
    // "재방문율"이 아니라 "비중"이다. 코호트 추적이 아니므로 이름을 섞지 않는다.
    { label: "재방문 고객 비중", value: customers.returningShare === null ? "–" : `${customers.returningShare}%`, note: `${customers.returning.toLocaleString("ko-KR")}명`, how: "다녀간 고객 중 전에도 왔던 사람의 비율" },
  ];
  return (
    <section className={`${card} p-5`}>
      <h2 className={`${typeScale.micro} text-[var(--muted)]`}>누가 왔나</h2>
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">고객 구성</caption>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-[var(--border)] last:border-0" key={row.label}>
              <th className="py-[10px] text-left font-medium" scope="row">
                {row.label}
                <span className="mt-[3px] block text-[11px] font-normal text-[var(--muted)]">{row.how}</span>
              </th>
              <td className="py-[10px] text-right align-top">
                <span className="font-mono font-semibold tabular-nums">{row.value}</span>
                {row.note && <span className="ml-2 text-[11px] font-normal text-[var(--muted)]">{row.note}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-[var(--muted)]">
        지난 기간에 온 손님이 다시 왔는지를 따로 추적하지는 않습니다 — 이 비중은 &ldquo;재방문율&rdquo;과 다른 값입니다.
      </p>
    </section>
  );
}

export function RevenueDashboard({
  analytics,
  briefing,
  chart,
  query,
  settings = {},
  summary,
}: {
  analytics: RevenueAnalyticsView;
  /** 서버가 만든 브리핑 문장과 방문 분포. */
  briefing?: RevenueBriefing;
  /** 기간 버튼이 고른 차트 한 벌 (§11). */
  chart: RevenueChartData;
  query: RevenueQuery;
  settings?: JsonObject;
  /** 서버 집계 정본 (§14). 없으면 정산 표에서 읽어 같은 값을 쓴다. */
  summary?: RevenueSummary;
}) {
  const reduced = usePrefersReducedMotion();
  const motion = revenueChartMotions(reduced);
  const [selection, setSelection] = useState<RevenueSelection | null>(null);
  const [trigger, setTrigger] = useState<Pick<HTMLElement, "focus"> | null>(
    null,
  );
  const surfaces = useRef<
    Partial<Record<RevenueSelection["kind"], HTMLDivElement>>
  >({});
  useEffect(() => {
    restoreRevenueDrawerFocus(selection !== null, trigger);
  }, [selection, trigger]);
  const open = (
    kind: RevenueSelection["kind"],
    key: string,
    source: Pick<HTMLElement, "focus"> | null = null,
  ) => {
    setTrigger(source);
    setSelection({ kind, key });
  };
  const ref =
    (kind: RevenueSelection["kind"]) => (element: HTMLDivElement | null) => {
      surfaces.current[kind] = element ?? undefined;
    };
  // 기간 표시는 조작기가 아니라 결과다. 차트 제목 아래 작은 글씨로만 둔다.
  const periodNote = `${analytics.selectedPeriod.start} ~ ${analytics.selectedPeriod.end}`;
  // 년별은 창이 전체 하나라 이동할 곳이 없다. 화살표를 지우면 칩 줄이 짧아지며 흔들려서
  // 자리는 남기고 링크만 뺀다 — 칩 위치가 기간마다 튀지 않는다.
  const moves = revenueQueryMoves(query);
  const arrow = (target: RevenueQuery, glyph: string, arrowLabel: string) =>
    moves ? (
      <Link aria-label={arrowLabel} className={button("md", "secondary", "w-[40px] px-0")} data-sales-move={glyph} href={`?${serializeRevenueQuery(target)}`}>
        {glyph}
      </Link>
    ) : (
      <span aria-hidden="true" className={button("md", "secondary", "w-[40px] px-0 invisible")} />
    );
  const periodChips = (
    <nav aria-label="매출 기간" className="flex gap-2">
      {arrow(previousRevenueQuery(query), "←", "이전 기간")}
      {viewOptions.map(([view, viewLabel]) => (
        <Link
          aria-current={query.view === view ? "page" : undefined}
          className={button("md", query.view === view ? "primary" : "secondary", "w-[72px] px-0")}
          data-sales-period={view}
          href={`?${serializeRevenueQuery({ ...query, view })}`}
          key={view}
        >
          {viewLabel}
        </Link>
      ))}
      {arrow(nextRevenueQuery(query), "→", "다음 기간")}
    </nav>
  );
  // KPI는 서버 집계에서 필드로 직접 읽는다. 이름 문자열로 찾지 않는다 (A3-8).
  const settled = (name: string) => analytics.settlement.find((row) => row.name === name)?.value ?? 0;
  // 넉 장만 남긴다. VAT·지출은 정산 표가 이미 아홉 줄로 보여준다 —
  // 같은 숫자를 카드로 한 번 더 띄우면 화면 첫 줄에서 "봐야 할 것"이 다섯으로 늘어난다.
  const ticket = briefing?.averageTicket ?? null;
  // 진행 중인 기간은 지난 기간을 같은 날짜까지 잘라 견준다. 카드의 라벨도 그 사실을 말해야
  // 브리핑 문장과 어긋나지 않는다.
  const deltaLabel = briefing?.comparisonLabel ?? "직전 기간";
  const kpis: readonly { label: string; value: string; delta?: number | null; note?: string }[] = [
    { label: "총 매출", value: won(summary ? summary.gross : settled("총 매출")), delta: summary?.deltaPrevious ?? null },
    { label: "실결제", value: won(summary ? summary.netPaid : settled("실결제")), note: "할인·포인트를 뺀 금액" },
    { label: "수수료 차감 후", value: won(summary ? summary.profit : settled("수수료 차감 후")), note: "VAT·수수료를 뺀 금액" },
    { label: "객단가", value: ticket === null ? "–" : won(ticket), note: "총 매출 ÷ 방문 수" },
  ];
  const serviceTotal = analytics.services.reduce((total, row) => total + row.sales, 0);
  const serviceMax = Math.max(0, ...analytics.services.map((row) => row.sales));
  const paymentMax = Math.max(0, ...analytics.payments.map((row) => row.amount));
  const bars = (
    kind: "service",
    rows: readonly { name: string; sales: number; count: number }[],
    title: string,
    chartMotion: ReturnType<typeof revenueChartMotion>,
  ) => (
    <ChartCard kind={kind} meta={`${rows.length}개 유형`} title={title}>
      <ChartSurface kind={kind} label={title} onReady={ref(kind)}>
        <div className="divide-y divide-[var(--border)]">
          {rows.map((row, index) => (
            <button
              aria-label={`${row.name} ${title} 상세 보기`}
              className="flex w-full items-center gap-3 py-[10px] text-left hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--brand)]"
              data-revenue-selection={`${kind}:${row.name}`}
              key={row.name}
              onClick={(event) => open(kind, row.name, event.currentTarget)}
              type="button"
            >
              <span className="flex w-[80px] shrink-0 items-center gap-2">
                <span className="text-[13px] font-semibold">{row.name}</span>
                <span className="text-[12px] text-[var(--muted)]">{row.count}건</span>
              </span>
              {/* 항목이 하나면 막대는 항상 100%라 비교 정보가 없다. 막대 대신 사실을 쓴다 (A2-2). */}
              {rows.length > 1 ? (
                <span className={`relative h-[22px] min-w-0 flex-1 overflow-clip ${chartWell} rounded-[var(--radius-chip)]`}>
                  <span
                    className="absolute left-0 top-[2px] h-[18px] w-full origin-left rounded-[var(--radius-chip)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                    style={{
                      background: barFill(index),
                      transform: `scaleX(${barScale(row.sales, serviceMax)})`,
                      transition: chartMotion.isAnimationActive ? `transform ${chartMotion.animationDuration}ms ${chartEase} ${chartMotion.animationBegin}ms` : undefined,
                    }}
                  />
                </span>
              ) : (
                <span className="min-w-0 flex-1 text-[12px] text-[var(--muted)]">이 기간의 유일한 유형입니다.</span>
              )}
              <span className="flex w-[145px] shrink-0 items-center justify-end gap-2.5">
                <span className="font-mono text-[12px] font-medium tabular-nums">{won(row.sales)}</span>
                <span className="w-[38px] text-right text-[12px] text-[var(--muted)]">{rows.length > 1 ? `${serviceTotal ? Math.round((row.sales / serviceTotal) * 100) : 0}%` : "전액"}</span>
              </span>
            </button>
          ))}
          {rows.length === 0 && <p className="py-6 text-center text-[12px] text-[var(--muted)]">기간에 해당하는 매출이 없습니다.</p>}
        </div>
      </ChartSurface>
      <p className="mt-3 text-[12px] text-[var(--muted)]">유형은 설정 › 시술·가격에서 관리합니다.</p>
      <DataTable caption={`${title} 표`} rows={rows} />
    </ChartCard>
  );
  return (
      <main className="px-7 pb-6 pt-5">
        {selection && (
          <ModalHost label="매출 상세">
            <RevenueDetailDrawer
              analytics={analytics}
              onClose={() => setSelection(null)}
              query={query}
              selection={selection}
            />
          </ModalHost>
        )}
        {briefing && <BriefingHeadline briefing={briefing.revenue} inProgress={briefing.inProgress} />}
        <section
          aria-label="매출 핵심 지표"
          className="mt-5 grid grid-cols-4 gap-3"
        >
          {kpis.map(({ label, value, delta, note }) => (
            <article className={`${card} px-[16px] py-[13px] transition-shadow duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_1px_2px_rgba(13,21,18,0.05),0_20px_36px_-22px_rgba(13,21,18,0.35)]`} key={label}>
              <h2 className={`${typeScale.micro} text-[var(--muted)]`}>
                {label}
              </h2>
              <p className={`mt-[8px] font-mono ${typeScale.figure} tabular-nums`}>
                {value}
              </p>
              {delta !== undefined ? (
                <p className="mt-[7px] text-[11px] text-[var(--muted)]">
                  {deltaLabel}{" "}
                  {delta === null ? (
                    <span>–</span>
                  ) : (
                    <strong className={`font-mono tabular-nums ${delta < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                      {delta > 0 ? "+" : ""}
                      {delta}%
                    </strong>
                  )}
                </p>
              ) : (
                <p className="mt-[7px] text-[11px] text-[var(--muted)]">{note}</p>
              )}
            </article>
          ))}
        </section>
        {/* 기간 칩은 차트 카드 머리줄에 산다. 아무것도 안 하는 `매출 조회` 박스 한 줄이 사라졌다.
            폭은 글자가 아니라 서로에 맞춘다 — `일별`(2자)과 `연도`(2자)가 다른 폭이면 줄이 흔들린다. */}
        <div className="mt-5">
          {chart.kind === "day" ? (
            <RevenueDayChart
              comparisonNote={chart.comparisonNote}
              contextNote={chart.contextNote}
              controls={periodChips}
              count={chart.count}
              deltaPrevious={chart.deltaPrevious}
              dividers={chart.dividers}
              footNote={chart.footNote}
              label={chart.label}
              periodNote={periodNote}
              points={chart.points}
              span={chart.span}
              title={chart.title}
              total={chart.total}
              transactionsHref={(date) => `/sales/transactions?${serializeRevenueQuery({ view: "day", cursor: date })}`}
            />
          ) : (
            <RevenueBarChart
              controls={periodChips}
              count={chart.count}
              // 막대를 누르면 한 단계 잘게 본다. 달 막대는 그 달의 일별로, 해 막대는 그 해의 월별로.
              // 예전에는 달 막대가 `view=month`(=그 해 전체)로 가서 누른 막대가 있던 화면이 그대로 나왔다.
              drilldownHref={(key) =>
                chart.drilldown === "month"
                  ? `?${serializeRevenueQuery({ view: "day", cursor: `${key}-01` })}`
                  : `?${serializeRevenueQuery({ view: "month", cursor: `${key}-01-01` })}`
              }
              emptyText={chart.emptyText}
              label={chart.label}
              periodNote={periodNote}
              points={chart.points}
              previousLabel={chart.previousLabel}
              title={chart.title}
              total={chart.total}
              yearOverYearLabel={chart.yearOverYearLabel}
            />
          )}
        </div>
        {briefing && (
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_392px] items-stretch gap-5">
            <PatternCard headline={briefing.weekdayHeadline} reduced={reduced} rows={briefing.weekday} title="요일별 방문" />
            {briefing.availability?.hour === false ? <UnavailableAnalysisCard title="시간대별 방문" /> : <PatternCard headline={briefing.hourHeadline} reduced={reduced} rows={briefing.hour} title="시간대별 방문" />}
            <CustomerCard customers={briefing.customers} />
          </div>
        )}
        {/* 세 카드가 한 줄에 선다. 예전에는 결제 수단이 2fr 을 차지해 네 줄짜리 목록 아래로
            죽은 여백이 남았고, 정산 표는 오른쪽 392px 를 통째로 비운 채 홀로 서 있었다.
            내용의 양이 칸의 너비를 정하게 한다. */}
        <div className="mt-5 grid grid-cols-3 items-start gap-5">
          {analytics.availability.payment ? <ChartCard kind="payment" title="결제 수단">
            {/* 서비스 차트와 같은 `ChartSurface` 를 쓴다. 예전에는 이 칸만 맨 `div` 라
                스크롤 영역이 키보드로 잡히지 않았다. */}
            <ChartSurface kind="payment" label="결제 수단" onReady={ref("payment")}>
              <div className="divide-y divide-[var(--border)]">
              {analytics.payments.map((row, index) => (
                <button
                  aria-label={`${row.name} 결제수단 상세 보기`}
                  className="grid w-full grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-4 py-[10px] text-left text-sm transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--brand)]"
                  data-revenue-selection={`payment:${row.name}`}
                  key={row.name}
                  onClick={(event) => open("payment", row.name, event.currentTarget)}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold">{row.name}</span>
                    <span className="text-[12px] text-[var(--muted)]">{analytics.payments.length > 1 ? `${row.value}%` : "전액"}</span>
                  </span>
                  {/* 항목이 하나면 막대는 항상 100%라 비교 정보가 없다 (A2-2). */}
                  {analytics.payments.length > 1 ? (
                    <span className={`relative h-[22px] min-w-0 overflow-clip ${chartWell} rounded-[var(--radius-chip)]`}>
                      <span
                        className="absolute left-0 top-[2px] h-[18px] w-full origin-left rounded-[var(--radius-chip)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                        style={{
                          background: barFill(index),
                          transform: `scaleX(${barScale(row.amount, paymentMax)})`,
                          transition: motion.service.isAnimationActive ? `transform ${motion.service.animationDuration}ms ${chartEase}` : undefined,
                        }}
                      />
                    </span>
                  ) : (
                    <span className="min-w-0 text-[12px] text-[var(--muted)]">이 기간의 유일한 결제 수단입니다.</span>
                  )}
                  <span className="font-mono text-[12px] font-medium tabular-nums">{won(row.amount)}</span>
                </button>
              ))}
              </div>
            </ChartSurface>
            <DataTable
              caption="결제수단 표"
              rows={analytics.payments.map((row) => ({
                name: row.name,
                sales: row.amount,
              }))}
            />
          </ChartCard> : <UnavailableAnalysisCard title="결제 수단" />}
          {analytics.availability.service ? bars("service", analytics.services, "시술 카테고리", motion.service) : <UnavailableAnalysisCard title="시술 카테고리" />}
          <section className={`${card} p-5`}>
            <h2 className={`${typeScale.micro} text-[var(--muted)]`}>정산</h2>
            <table className="mt-3 w-full text-sm">
              <caption className="sr-only">정산 내역</caption>
              <tbody>
                {analytics.settlement.map((row) => (
                  <tr
                    className="border-b border-[var(--border)] last:border-0"
                    key={row.name}
                  >
                    <th className="py-3 text-left font-medium" scope="row">{row.name}</th>
                    <td className="py-3 text-right font-bold tabular-nums">
                      {won(row.value)}
                      {/* ₩0 이 "정말 0원"인지 "기록이 없어 0원"인지는 숫자만으로 구별되지 않는다.
                          지출은 실제로 한 건도 없고 VAT 는 5,578건 중 1건이다(실측). */}
                      {row.value === 0 && <span className="ml-2 text-[11px] font-normal text-[var(--muted)]">기록 없음</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* 표에 아홉 줄이 있어도 "무엇에서 무엇을 뺐는지"는 보이지 않는다. 관계식을 적는다.
                앞의 것은 국내 POS(페이히어)가 공개한 정의와 같고, 뒤의 것은 lib/finance.ts 의 계산이다.
                빠지지 **않은** 비용은 이름을 대서 밝힌다 — 이 숫자를 순이익으로 읽는 것이 가장 비싼 오해다. */}
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] leading-[1.7] text-[var(--muted)]">
              총 매출 = 실결제 + 할인 + 포인트 사용<br />
              수수료 차감 후 = 실결제 − VAT − 결제 수수료 − 지출<br />
              <span className="text-[var(--warning)]">임대료·재료비·인건비는 빠지지 않았습니다.</span>
            </p>
          </section>
        </div>
      </main>
  );
}
