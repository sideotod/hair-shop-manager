"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { button } from "../button";
import { ModalHost } from "../modal-host";
import { PageToolbar } from "../page-toolbar";
import type { JsonObject } from "../../lib/salon-domain";
import type { RevenueAnalyticsView } from "./revenue-analytics";
import { RevenueBarChart } from "./revenue-bar-chart";
import { chartEase, chartShell, chartWell } from "./revenue-chart-style";
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

const card = "rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(13,21,18,0.04),0_14px_30px_-20px_rgba(13,21,18,0.25)]";
const chartCard = chartShell;

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
        <h2 className="text-[10px] font-semibold tracking-[0.04em] text-[var(--muted)]" id={`revenue-chart-${kind}-title`}>
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
  // CSV는 서버 라우트가 만든다. data: URL로 만들면 누적 기간에서 문서가 1MB 가까이 커진다 (A4-5).
  const csvHref = `/sales/revenue-csv?${serializeRevenueQuery(query)}`;
  // KPI는 서버 집계에서 필드로 직접 읽는다. 이름 문자열로 찾지 않는다 (A3-8).
  const settled = (name: string) => analytics.settlement.find((row) => row.name === name)?.value ?? 0;
  const kpis: readonly { label: string; value: number; delta?: number | null }[] = [
    { label: "총 매출", value: summary ? summary.gross : settled("총 매출"), delta: summary?.deltaPrevious ?? null },
    { label: "실결제", value: summary ? summary.netPaid : settled("실결제") },
    { label: "VAT", value: summary ? summary.vat : settled("VAT") },
    { label: "지출", value: summary ? summary.expense : settled("지출") },
    { label: "샵 수익", value: summary ? summary.profit : settled("샵 수익") },
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
        <SalesControls label={analytics.selectedPeriod.label} query={query} />
        <PageToolbar className="mt-5" description={<>결제 기록과 정산을 같은 기준으로 확인합니다. {analytics.selectedPeriod.start} ~ {analytics.selectedPeriod.end}</>} noPrint>
          <button
            className={button("md", "secondary", "text-[var(--brand)]")}
            onClick={() => window.print()}
            type="button"
          >
            인쇄
          </button>
          <a
            className={button("md", "primary")}
            download={`hairhaeyo-revenue-${analytics.selectedPeriod.start}_${analytics.selectedPeriod.end}.csv`}
            href={csvHref}
          >
            CSV 내보내기
          </a>
        </PageToolbar>
        <section
          aria-label="매출 핵심 지표"
          className="mt-5 grid grid-cols-5 gap-3"
        >
          {kpis.map(({ label, value, delta }) => (
            <article className={`${card} px-[16px] py-[13px] transition-shadow duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_1px_2px_rgba(13,21,18,0.05),0_20px_36px_-22px_rgba(13,21,18,0.35)]`} key={label}>
              <h2 className="text-[10px] font-semibold tracking-[0.04em] text-[var(--muted)]">
                {label}
              </h2>
              <p className="mt-[8px] font-mono text-[17px] font-semibold leading-none tracking-[-0.015em] tabular-nums">
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
              {analytics.payments.map((row, index) => (
                <button
                  aria-label={`${row.name} 결제수단 상세 보기`}
                  className="grid w-full grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-4 py-[10px] text-left text-sm transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                  data-revenue-selection={`payment:${row.name}`}
                  key={row.name}
                  onClick={(event) => open("payment", row.name, event.currentTarget)}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold">{row.name}</span>
                    <span className="text-[11.5px] text-[var(--muted)]">{analytics.payments.length > 1 ? `${row.value}%` : "전액"}</span>
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
                    <span className="min-w-0 text-[11.5px] text-[var(--muted)]">이 기간의 유일한 결제 수단입니다.</span>
                  )}
                  <span className="font-mono text-[12px] font-medium tabular-nums">{won(row.amount)}</span>
                </button>
              ))}
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
            <h2 className="text-[10px] font-semibold tracking-[0.04em] text-[var(--muted)]">정산</h2>
            <table className="mt-3 w-full text-sm">
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
