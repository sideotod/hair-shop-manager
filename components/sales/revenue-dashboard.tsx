"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { ModalHost } from "../modal-host";
import { PageToolbar } from "../page-toolbar";
import type { JsonObject } from "../../lib/salon-domain";
import type { RevenueAnalyticsView } from "./revenue-analytics";
import { RevenueBarChart } from "./revenue-bar-chart";
import { RevenueDayChart } from "./revenue-day-chart";
import type { RevenueAggregatePoint, RevenueSummary } from "../../lib/revenue-aggregate";
import {
  RevenueDetailDrawer,
  type RevenueSelection,
} from "./revenue-detail-drawer";
import { SalesControls } from "./sales-controls";
import {
  serializeRevenueQuery,
  type RevenueQuery,
} from "./revenue-query";

const card = "rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(13,21,18,0.03)]";
const chartCard = card;

/** 서버가 계산해 넘기는 차트 입력. 프런트는 이 값을 다시 합산하지 않는다 (§14). */
export type RevenueSeries = {
  readonly label: string;
  readonly points: readonly RevenueAggregatePoint[];
  readonly total: number;
  readonly count: number;
};
export type RevenueDayChartData = RevenueSeries & { readonly deltaPrevious: number | null };
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
    animationEasing: "ease-out" as const,
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

/** Figma 6:2 단일 색상 램프. 순위가 곧 농도. 값은 토큰에서만 나온다 (A2-7). */
const barFills = ["var(--brand)", ...[80, 68, 56, 44].map((pct) => `color-mix(in srgb, var(--success) ${pct}%, transparent)`)];
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
    <section className={`${chartCard} flex flex-col overflow-hidden`}>
      <div className="flex items-center justify-between px-[18px] pb-[13px] pt-[15px]">
        <h2 className="text-[14px] font-semibold" id={`revenue-chart-${kind}-title`}>
          {title}
        </h2>
        {meta && <span className="text-[11.5px] text-[var(--muted)]">{meta}</span>}
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
      className="max-h-[280px] overflow-y-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
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

export function RevenueDashboard({
  analytics,
  daily,
  monthly,
  yearly,
  query,
  settings = {},
  summary,
}: {
  analytics: RevenueAnalyticsView;
  daily: RevenueDayChartData;
  monthly: RevenueSeries;
  yearly: RevenueSeries;
  query: RevenueQuery;
  settings?: JsonObject;
  /** 서버 집계 정본 (§14). 없으면 정산 표에서 읽어 같은 값을 쓴다. */
  summary?: RevenueSummary;
}) {
  const motion = revenueChartMotions(usePrefersReducedMotion());
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
  // CSV\uB294 \uC11C\uBC84 \uB77C\uC6B0\uD2B8\uAC00 \uB9CC\uB4E0\uB2E4. data: URL\uB85C \uB9CC\uB4E4\uBA74 \uB204\uC801 \uAE30\uAC04\uC5D0\uC11C \uBB38\uC11C\uAC00 1MB \uAC00\uAE4C\uC774 \uCEE4\uC9C4\uB2E4 (A4-5).
  const csvHref = `/sales/revenue-csv?${serializeRevenueQuery(query)}`;
  // KPI\uB294 \uC11C\uBC84 \uC9D1\uACC4\uC5D0\uC11C \uD544\uB4DC\uB85C \uC9C1\uC811 \uC77D\uB294\uB2E4. \uC774\uB984 \uBB38\uC790\uC5F4\uB85C \uCC3E\uC9C0 \uC54A\uB294\uB2E4 (A3-8).
  const settled = (name: string) => analytics.settlement.find((row) => row.name === name)?.value ?? 0;
  const kpis: readonly { label: string; value: number; delta?: number | null }[] = [
    { label: "\uCD1D \uB9E4\uCD9C", value: summary ? summary.gross : settled("\uCD1D \uB9E4\uCD9C"), delta: summary?.deltaPrevious ?? null },
    { label: "\uC2E4\uACB0\uC81C", value: summary ? summary.netPaid : settled("\uC2E4\uACB0\uC81C") },
    { label: "VAT", value: summary ? summary.vat : settled("VAT") },
    { label: "\uC9C0\uCD9C", value: summary ? summary.expense : settled("\uC9C0\uCD9C") },
    { label: "\uC0F5 \uC218\uC775", value: summary ? summary.profit : settled("\uC0F5 \uC218\uC775") },
  ];
  const serviceTotal = analytics.services.reduce((total, row) => total + row.sales, 0);
  const serviceMax = Math.max(0, ...analytics.services.map((row) => row.sales));
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
              className="flex w-full items-center gap-3 py-[10px] text-left hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
              data-revenue-selection={`${kind}:${row.name}`}
              key={row.name}
              onClick={(event) => open(kind, row.name, event.currentTarget)}
              type="button"
            >
              <span className="flex w-[80px] shrink-0 items-center gap-2">
                <span className="text-[12.5px] font-semibold">{row.name}</span>
                <span className="text-[11.5px] text-[var(--muted)]">{row.count}건</span>
              </span>
              {/* 항목이 하나면 막대는 항상 100%라 비교 정보가 없다. 막대 대신 사실을 쓴다 (A2-2). */}
              {rows.length > 1 ? (
                <span className="relative h-[22px] min-w-0 flex-1 overflow-clip">
                  <span
                    className="absolute left-0 top-[2px] h-[18px] w-full origin-left rounded-[var(--radius-chip)]"
                    style={{
                      background: barFill(index),
                      transform: `scaleX(${barScale(row.sales, serviceMax)})`,
                      transition: chartMotion.isAnimationActive ? `transform ${chartMotion.animationDuration}ms ease-out ${chartMotion.animationBegin}ms` : undefined,
                    }}
                  />
                </span>
              ) : (
                <span className="min-w-0 flex-1 text-[11.5px] text-[var(--muted)]">이 기간의 유일한 유형입니다.</span>
              )}
              <span className="flex w-[145px] shrink-0 items-center justify-end gap-2.5">
                <span className="font-mono text-[12px] font-medium tabular-nums">{won(row.sales)}</span>
                <span className="w-[38px] text-right text-[11.5px] text-[var(--muted)]">{rows.length > 1 ? `${serviceTotal ? Math.round((row.sales / serviceTotal) * 100) : 0}%` : "전액"}</span>
              </span>
            </button>
          ))}
          {rows.length === 0 && <p className="py-6 text-center text-[12px] text-[var(--muted)]">기간에 해당하는 매출이 없습니다.</p>}
        </div>
      </ChartSurface>
      <p className="mt-3 text-[11.5px] text-[var(--muted)]">유형은 설정 › 시술·가격에서 관리합니다.</p>
      <DataTable caption={`${title} 표`} rows={rows} />
    </ChartCard>
  );
  return (
      <main className="px-7 pb-6 pt-5" data-revenue-print>
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
        {/* 인쇄본에는 앱 헤더가 없다. 무엇을 언제 뽑은 종이인지 남긴다 (G7). */}
        <div className="print-only mb-4 border-b border-[var(--border)] pb-3">
          <strong className="text-[17px] font-semibold">매출·결제</strong>
          <span className="ml-3 font-mono text-[12px]">{analytics.selectedPeriod.start} ~ {analytics.selectedPeriod.end}</span>
        </div>
        <PageToolbar description={<>결제 기록과 정산을 같은 기준으로 확인합니다. {analytics.selectedPeriod.start} ~ {analytics.selectedPeriod.end}</>} noPrint>
          <button
            className="h-10 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--brand)]"
            onClick={() => window.print()}
            type="button"
          >
            인쇄
          </button>
          <a
            className="flex h-10 items-center rounded-[var(--radius-card)] bg-[var(--brand)] px-5 text-[13px] font-medium text-white"
            download={`hairhaeyo-revenue-${analytics.selectedPeriod.start}_${analytics.selectedPeriod.end}.csv`}
            href={csvHref}
          >
            CSV 내보내기
          </a>
        </PageToolbar>
        <SalesControls label={analytics.selectedPeriod.label} query={query} />
        <section
          aria-label="매출 핵심 지표"
          className="mt-4 grid grid-cols-5 gap-3"
        >
          {kpis.map(({ label, value, delta }) => (
            <article className={`${card} px-[16px] py-[13px]`} key={label}>
              <h2 className="text-[11.5px] text-[var(--muted)]">
                {label}
              </h2>
              <p className="mt-[6px] font-mono text-[17px] font-semibold leading-none tabular-nums">
                {won(value)}
              </p>
              {delta !== undefined && (
                <p className="mt-[7px] text-[11px] text-[var(--muted)]">
                  직전 기간{" "}
                  {delta === null ? (
                    <span>–</span>
                  ) : (
                    <strong className={`font-mono tabular-nums ${delta < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                      {delta > 0 ? "+" : ""}
                      {delta}%
                    </strong>
                  )}
                </p>
              )}
            </article>
          ))}
        </section>
        <div className="mt-5">
          <RevenueDayChart
            count={daily.count}
            deltaPrevious={daily.deltaPrevious}
            label={daily.label}
            points={daily.points}
            total={daily.total}
            transactionsHref={(date) => `/sales/transactions?${serializeRevenueQuery({ view: "day", cursor: date })}`}
          />
        </div>
        <div className="mt-5 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
          <RevenueBarChart
            count={monthly.count}
            drilldownHref={(key) => `?${serializeRevenueQuery({ view: "month", cursor: `${key}-01` })}`}
            emptyText="이 해에 기록된 매출이 없습니다."
            label={monthly.label}
            points={monthly.points}
            previousLabel="전월"
            title="월별 매출"
            total={monthly.total}
            yearOverYearLabel="전년"
          />
          <RevenueBarChart
            count={yearly.count}
            drilldownHref={(key) => `?${serializeRevenueQuery({ view: "year", cursor: `${key}-01-01` })}`}
            emptyText="아직 기록된 매출이 없습니다."
            label={yearly.label}
            points={yearly.points}
            previousLabel="전년"
            title="연도별 매출"
            total={yearly.total}
          />
        </div>
        <div className="mt-5 grid grid-cols-[minmax(0,2fr)_392px] gap-5">
          <ChartCard kind="payment" title="결제 수단">
            <div className="max-h-[280px] divide-y divide-[var(--border)] overflow-y-auto" data-revenue-chart="payment" ref={ref("payment")}>
              {analytics.payments.map((row) => <button aria-label={`${row.name} 결제수단 상세 보기`} className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-4 py-3 text-left text-sm hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]" data-revenue-selection={`payment:${row.name}`} key={row.name} onClick={(event) => open("payment", row.name, event.currentTarget)} type="button"><span className="font-medium">{row.name}</span><span className="text-[var(--muted)]">{analytics.payments.length > 1 ? `${row.value}%` : "전액"}</span><span className="font-mono font-semibold tabular-nums">{won(row.amount)}</span></button>)}
            </div>
            <DataTable
              caption="결제수단 표"
              rows={analytics.payments.map((row) => ({
                name: row.name,
                sales: row.amount,
              }))}
            />
          </ChartCard>
          {bars("service", analytics.services, "시술 카테고리", motion.service)}
          <section className={`${card} p-5`}>
            <h2 className="text-[17px] font-bold">정산</h2>
            <table className="mt-4 w-full text-sm">
              <tbody>
                {analytics.settlement.map((row) => (
                  <tr
                    className="border-b border-[var(--border)] last:border-0"
                    key={row.name}
                  >
                    <th className="py-3 text-left font-medium">{row.name}</th>
                    <td className="py-3 text-right font-bold tabular-nums">
                      {won(row.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </main>
  );
}
