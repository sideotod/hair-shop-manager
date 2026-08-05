"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "../app-shell";
import type { JsonObject } from "../../lib/salon-domain";
import type { RevenueAnalytics } from "./revenue-analytics";
import { createRevenueCsv } from "./revenue-csv";
import {
  RevenueDetailDrawer,
  type RevenueSelection,
} from "./revenue-detail-drawer";
import {
  nextRevenueQuery,
  previousRevenueQuery,
  serializeRevenueQuery,
  type RevenueQuery,
} from "./revenue-query";

const card = "rounded-[8px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(13,21,18,0.03)]";
const won = (value: number) => `₩${value.toLocaleString("ko-KR")}`;
const money = (value: number) =>
  `${Math.round(value / 10000).toLocaleString("ko-KR")}만`;
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
    trend: revenueChartMotion(reduced, 0, 480),
    payment: revenueChartMotion(reduced, 40, 480),
    service: revenueChartMotion(reduced, 0, 460),
    gender: revenueChartMotion(reduced, 20, 440),
    visitType: revenueChartMotion(reduced, 40, 440),
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
export function replaceRevenueQuery(
  router: { replace: (href: string) => void },
  query: RevenueQuery,
) {
  router.replace(`?${serializeRevenueQuery(query)}`);
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
  analytics: RevenueAnalytics,
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
    kind === "payment"
      ? analytics.payments
      : kind === "service"
        ? analytics.services
        : kind === "gender"
          ? analytics.genders
          : analytics.visitTypes;
  return items[index] ? { kind, key: items[index].name } : null;
}

function ChartCard({
  title,
  kind,
  children,
}: {
  title: string;
  kind: RevenueSelection["kind"];
  children: React.ReactNode;
}) {
  return (
    <section className={`${card} min-h-[320px] p-5`}>
      <h2 className="text-[17px] font-bold" id={`revenue-chart-${kind}-title`}>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
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
      className="h-[230px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
      data-revenue-chart={kind}
      onPointerDown={(event) => focusChartSurface(event.currentTarget)}
      ref={onReady}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
function ValueButtons({
  kind,
  label,
  items,
  onSelect,
}: {
  kind: RevenueSelection["kind"];
  label: string;
  items: readonly { key: string; text: string }[];
  onSelect: (key: string, trigger: HTMLButtonElement) => void;
}) {
  return (
    <div aria-label={`${label} 값`} className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          aria-label={`${item.key} ${label} 상세 보기`}
          className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          data-revenue-selection={`${kind}:${item.key}`}
          key={item.key}
          onClick={(event) => onSelect(item.key, event.currentTarget)}
          type="button"
        >
          {item.text}
        </button>
      ))}
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
  query,
  settings = {},
}: {
  analytics: RevenueAnalytics;
  query: RevenueQuery;
  settings?: JsonObject;
}) {
  const router = useRouter();
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
  const selectChart = (kind: RevenueSelection["kind"]) => (value: unknown) => {
    const next = resolveRevenueSelection(kind, value, analytics);
    if (next) open(next.kind, next.key, surfaces.current[kind] ?? null);
  };
  const ref =
    (kind: RevenueSelection["kind"]) => (element: HTMLDivElement | null) => {
      surfaces.current[kind] = element ?? undefined;
    };
  const navigate = (direction: -1 | 1) =>
    replaceRevenueQuery(
      router,
      direction < 0 ? previousRevenueQuery(query) : nextRevenueQuery(query),
    );
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${createRevenueCsv(analytics.transactions)}`)}`;
  const bars = (
    kind: "service" | "gender" | "visitType",
    rows: readonly { name: string; sales: number }[],
    title: string,
    chartMotion: ReturnType<typeof revenueChartMotion>,
  ) => (
    <ChartCard kind={kind} title={title}>
      <ChartSurface kind={kind} label={title} onReady={ref(kind)}>
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ left: 18, right: 88 }}
            onClick={selectChart(kind)}
          >
            <XAxis hide type="number" />
            <YAxis dataKey="name" tickLine={false} type="category" width={96} />
            <Bar
              {...chartMotion}
              dataKey="sales"
              fill="#0d3a33"
              radius={[0, 5, 5, 0]}
            >
              <LabelList dataKey="sales" formatter={(value) => won(Number(value ?? 0))} position="right" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartSurface>
      <ValueButtons
        items={rows.map((row) => ({
          key: row.name,
          text: `${row.name} ${won(row.sales)}`,
        }))}
        kind={kind}
        label={title}
        onSelect={(key, source) => open(kind, key, source)}
      />
      <DataTable caption={`${title} 표`} rows={rows} />
    </ChartCard>
  );
  return (
    <AppShell
      activeHref="/sales"
      settings={settings}
      overlay={
        selection ? (
          <RevenueDetailDrawer
            analytics={analytics}
            onClose={() => setSelection(null)}
            query={query}
            selection={selection}
          />
        ) : undefined
      }
    >
      <main className="px-10 pb-16 pt-9">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.03em]">
              매출 분석
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              결제 기록 한 곳에서 보는 매출과 정산입니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-4 text-[13px] font-medium text-[var(--brand)]"
              onClick={() => window.print()}
              type="button"
            >
              인쇄
            </button>
            <a
              className="flex h-10 items-center rounded-[10px] bg-[var(--brand)] px-5 text-[13px] font-medium text-white"
              download={`hairhaeyo-revenue-${analytics.selectedPeriod.start}_${analytics.selectedPeriod.end}.csv`}
              href={csvHref}
            >
              CSV 내보내기
            </a>
          </div>
        </div>
        <nav aria-label="매출 기능" className="mt-6 flex gap-2">
          <Link
            className="rounded-[10px] bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
            href={`?${serializeRevenueQuery(query)}`}
          >
            매출 분석
          </Link>
          <Link
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium"
            href="?tab=payment"
          >
            결제 등록
          </Link>
          <Link
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium"
            href="?tab=expenses"
          >
            지출·정산
          </Link>
        </nav>
        <section
          aria-label="매출 조회"
          className={`${card} mt-4 flex items-center justify-between p-4`}
        >
          <div className="flex gap-2">
            {(["day", "month", "total"] as const).map((view) => (
              <Link
                aria-current={query.view === view ? "page" : undefined}
                className={`rounded-[9px] px-4 py-2 text-sm font-medium ${query.view === view ? "bg-[var(--brand)] text-white" : "border border-[var(--border)]"}`}
                href={`?${serializeRevenueQuery({ ...query, view })}`}
                key={view}
              >
                {view === "day" ? "일별" : view === "month" ? "월별" : "누적"}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              aria-label="이전 기간"
              className="rounded border border-[var(--border)] px-3 py-2 disabled:opacity-40"
              disabled={query.view === "total"}
              onClick={() => navigate(-1)}
              type="button"
            >
              ←
            </button>
            <strong>{analytics.selectedPeriod.label}</strong>
            <button
              aria-label="다음 기간"
              className="rounded border border-[var(--border)] px-3 py-2 disabled:opacity-40"
              disabled={query.view === "total"}
              onClick={() => navigate(1)}
              type="button"
            >
              →
            </button>
          </div>
        </section>
        <section
          aria-label="매출 핵심 지표"
          className="mt-4 grid grid-cols-3 gap-4"
        >
          {[
            ["오늘 매출", analytics.totals.today],
            ["이번 달 매출", analytics.totals.month],
            ["누적 매출", analytics.totals.total],
          ].map(([label, value]) => (
            <article className={`${card} px-5 py-4`} key={String(label)}>
              <h2 className="text-[13px] font-medium text-[var(--muted)]">
                {label}
              </h2>
              <p className="mt-3 text-[27px] font-bold leading-none tabular-nums">
                {won(Number(value))}
              </p>
            </article>
          ))}
        </section>
        <div className="mt-5 grid grid-cols-2 gap-5">
          <ChartCard kind="date" title="매출 · 샵 수익 추이">
            <ChartSurface kind="date" label="매출 추이" onReady={ref("date")}>
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={analytics.trend} onClick={selectChart("date")}>
                  <CartesianGrid stroke="#e0ded7" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} />
                  <YAxis tickFormatter={money} tickLine={false} width={58} />
                  <Tooltip formatter={(value) => won(Number(value))} />
                  <Legend />
                  <Line
                    {...motion.trend}
                    dataKey="gross"
                    name="총매출"
                    stroke="#0d3a33"
                    strokeWidth={3}
                    type="monotone"
                  />
                  <Line
                    {...motion.trend}
                    dataKey="profit"
                    name="샵 수익"
                    stroke="#2f6b4f"
                    strokeWidth={3}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartSurface>
            <ValueButtons
              items={analytics.trend.map((row) => ({
                key: row.date,
                text: `${row.date} ${won(row.gross)}`,
              }))}
              kind="date"
              label="매출"
              onSelect={(key, source) => open("date", key, source)}
            />
            <DataTable
              caption="일별 매출 표"
              rows={analytics.trend.map((row) => ({
                name: row.date,
                sales: row.gross,
              }))}
            />
          </ChartCard>
          <ChartCard kind="payment" title="결제수단 비중">
            <ChartSurface
              kind="payment"
              label="결제수단"
              onReady={ref("payment")}
            >
              <ResponsiveContainer height="100%" width="100%">
                <PieChart onClick={selectChart("payment")}>
                  <Pie
                    {...motion.payment}
                    data={analytics.payments}
                    dataKey="amount"
                    innerRadius={62}
                    nameKey="name"
                    outerRadius={96}
                    paddingAngle={3}
                  >
                    {analytics.payments.map((item) => (
                      <Cell fill={item.color} key={item.name} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => won(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartSurface>
            <ValueButtons
              items={analytics.payments.map((row) => ({
                key: row.name,
                text: `${row.name} ${row.value}%`,
              }))}
              kind="payment"
              label="결제수단"
              onSelect={(key, source) => open("payment", key, source)}
            />
            <DataTable
              caption="결제수단 표"
              rows={analytics.payments.map((row) => ({
                name: row.name,
                sales: row.amount,
              }))}
            />
          </ChartCard>
          {bars("service", analytics.services, "시술 카테고리", motion.service)}
          {bars("gender", analytics.genders, "성별 매출", motion.gender)}
          {bars(
            "visitType",
            analytics.visitTypes,
            "신규 · 재방문",
            motion.visitType,
          )}
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
    </AppShell>
  );
}
