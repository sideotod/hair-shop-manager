"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import type { RevenueAnalytics } from "./revenue-analytics";
import { createRevenueCsv } from "./revenue-csv";
import { RevenueDetailDrawer, type RevenueSelection } from "./revenue-detail-drawer";
import {
  DEFAULT_REVENUE_QUERY,
  REVENUE_PAYMENT_OPTIONS,
  REVENUE_SERVICE_OPTIONS,
  REVENUE_STAFF_OPTIONS,
  revenuePresetRange,
  type RevenuePreset,
  type RevenueQuery,
  serializeRevenueQuery,
} from "./revenue-query";

const card = "rounded-[14px] border border-[var(--border)] bg-white";
const money = (value: number) => `${Math.round(value / 10000).toLocaleString("ko-KR")}만`;
const won = (value: number) => `₩${value.toLocaleString("ko-KR")}`;

export function revenueChartMotion(reduced: boolean, begin: number, duration: number) {
  return {
    isAnimationActive: !reduced,
    animationBegin: reduced ? 0 : begin,
    animationDuration: reduced ? 0 : duration,
    animationEasing: "ease-out" as const,
  };
}

export function revenueChartMotions(reduced: boolean) {
  return {
    daily: revenueChartMotion(reduced, 0, 560),
    payment: revenueChartMotion(reduced, 80, 520),
    service: revenueChartMotion(reduced, 0, 500),
    staffSales: revenueChartMotion(reduced, 0, 480),
    staffProfit: revenueChartMotion(reduced, 80, 480),
    deduction: revenueChartMotion(reduced, 0, 520),
  };
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeToReducedMotion, reducedMotionSnapshot, () => true);
}

export function resolveRevenueSelection(kind: RevenueSelection["kind"], value: unknown, analytics: RevenueAnalytics): RevenueSelection | null {
  if (!value || typeof value !== "object") return null;
  const chartValue = value as {
    activeLabel?: unknown;
    activePayload?: readonly { payload?: { date?: unknown; name?: unknown } }[];
    activeTooltipIndex?: unknown;
  };
  const payload = chartValue.activePayload?.[0]?.payload;
  const payloadKey = kind === "date" ? payload?.date : payload?.name;
  if (typeof payloadKey === "string") return { kind, key: payloadKey };
  if (kind === "date" && typeof chartValue.activeLabel === "string") return { kind, key: chartValue.activeLabel };

  const index = Number(chartValue.activeTooltipIndex);
  if (!Number.isInteger(index) || index < 0) return null;
  const item = kind === "date" ? analytics.daily[index]
    : kind === "payment" ? analytics.payments[index]
      : kind === "service" ? analytics.services[index]
        : kind === "staff" ? analytics.staff[index]
          : analytics.deductions[index];
  const key = item && ("date" in item ? item.date : item.name);
  return typeof key === "string" ? { kind, key } : null;
}

export function focusChartSurface<T extends Pick<HTMLElement, "focus"> | null>(target: T) {
  target?.focus();
  return target;
}

export function nextRevenueQuery(current: RevenueQuery, change: Partial<RevenueQuery>) {
  const next = { ...current, ...change };
  return change.preset ? { ...next, ...revenuePresetRange(change.preset) } : next;
}

export function replaceRevenueQuery(router: { replace: (href: string) => void }, query: RevenueQuery) {
  router.replace(`?${serializeRevenueQuery(query)}`);
}

export function restoreRevenueDrawerFocus(open: boolean, target: Pick<HTMLElement, "focus"> | null) {
  if (!open) target?.focus();
}

function ChartCard({ title, kind, children }: { title: string; kind: RevenueSelection["kind"]; children: React.ReactNode }) {
  return (
    <section className={`${card} min-h-[330px] p-5`}>
      <h2 className="text-[17px] font-bold" id={`revenue-chart-${kind}-title`}>{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ChartSurface({
  children,
  className,
  kind,
  label,
  onReady,
}: {
  children: React.ReactNode;
  className: string;
  kind: RevenueSelection["kind"];
  label: string;
  onReady: (element: HTMLDivElement | null) => void;
}) {
  return (
    <div
      aria-label={`${label} 차트 상호작용 영역`}
      aria-describedby={`revenue-chart-${kind}-title`}
      className={`${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]`}
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
  items,
  kind,
  label,
  onSelect,
}: {
  items: readonly { key: string; text: string }[];
  kind: RevenueSelection["kind"];
  label: string;
  onSelect: (key: string, trigger: HTMLButtonElement) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label={`${label} 값`}>
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

export function RevenueDashboard({ analytics, query: initialQuery = DEFAULT_REVENUE_QUERY }: { analytics: RevenueAnalytics; query?: RevenueQuery }) {
  const router = useRouter();
  const chartMotion = revenueChartMotions(usePrefersReducedMotion());
  const [query, setQuery] = useState<RevenueQuery>(initialQuery);
  const [visibleSeries, setVisibleSeries] = useState({ gross: true, profit: true });
  const [selection, setSelection] = useState<RevenueSelection | null>(null);
  const [selectionTrigger, setSelectionTrigger] = useState<Pick<HTMLElement, "focus"> | null>(null);
  const chartSurfaces = useRef<Partial<Record<RevenueSelection["kind"], HTMLDivElement>>>({});

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    restoreRevenueDrawerFocus(selection !== null, selectionTrigger);
  }, [selection, selectionTrigger]);

  const updateQuery = (change: Partial<RevenueQuery>) => {
    const next = nextRevenueQuery(query, change);
    setQuery(next);
    replaceRevenueQuery(router, next);
  };

  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${createRevenueCsv(analytics.daily)}`)}`;
  const openSelection = (kind: RevenueSelection["kind"], key: string, trigger: Pick<HTMLElement, "focus"> | null = null) => {
    setSelectionTrigger(trigger);
    setSelection({ kind, key });
  };
  const select = (kind: RevenueSelection["kind"]) => (key: string, trigger: HTMLButtonElement) => openSelection(kind, key, trigger);
  const selectChartValue = (kind: RevenueSelection["kind"], value: unknown) => {
    const next = resolveRevenueSelection(kind, value, analytics);
    if (next) openSelection(next.kind, next.key, chartSurfaces.current[kind] ?? null);
  };
  const chartRef = (kind: RevenueSelection["kind"]) => (element: HTMLDivElement | null) => {
    chartSurfaces.current[kind] = element ?? undefined;
  };

  return (
    <AppShell
      activeHref="/sales"
      overlay={selection ? <RevenueDetailDrawer analytics={analytics} onClose={() => setSelection(null)} query={query} selection={selection} /> : undefined}
    >
      <main className="px-10 pb-16 pt-9">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.03em]">매출 분석</h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">매출 구조와 샵 수익 변화를 비교하고 원인을 확인합니다.</p>
          </div>
          <div className="flex gap-2">
            <button className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-4 text-[13px] font-medium text-[var(--brand)]" onClick={() => window.print()} type="button">인쇄</button>
            <a className="flex h-10 items-center rounded-[10px] bg-[var(--brand)] px-5 text-[13px] font-medium text-white" download={`hairhaeyo-revenue-${analytics.selectedPeriod.start}_${analytics.selectedPeriod.end}.csv`} href={csvHref}>CSV 내보내기</a>
          </div>
        </div>

        <section aria-label="매출 조회 조건" className={`${card} mt-8 grid grid-cols-[112px_132px_132px_128px_108px_108px_minmax(110px,1fr)] items-end gap-2 p-4`}>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">기간
            <select className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[13px] text-[var(--foreground)]" onChange={(event) => updateQuery({ preset: event.target.value as RevenuePreset })} value={query.preset}>
              <option value="today">오늘</option><option value="week">최근 7일</option><option value="month">이번 달</option><option value="previous">이전 달</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">시작일<input className="h-10 rounded-[10px] border border-[var(--border)] px-3 text-[13px] text-[var(--foreground)]" onChange={(event) => updateQuery({ start: event.target.value })} type="date" value={query.start} /></label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">종료일<input className="h-10 rounded-[10px] border border-[var(--border)] px-3 text-[13px] text-[var(--foreground)]" onChange={(event) => updateQuery({ end: event.target.value })} type="date" value={query.end} /></label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">담당자<select className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[13px] text-[var(--foreground)]" onChange={(event) => updateQuery({ staff: event.target.value })} value={query.staff}>{REVENUE_STAFF_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">시술<select className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[13px] text-[var(--foreground)]" onChange={(event) => updateQuery({ service: event.target.value })} value={query.service}>{REVENUE_SERVICE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">결제수단<select className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[13px] text-[var(--foreground)]" onChange={(event) => updateQuery({ payment: event.target.value })} value={query.payment}>{REVENUE_PAYMENT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="ml-auto flex h-10 items-center gap-2 whitespace-nowrap text-[13px] font-medium"><input checked={query.compare} onChange={(event) => updateQuery({ compare: event.target.checked })} type="checkbox" /> 이전 기간 비교</label>
        </section>

        <section aria-label="매출 핵심 지표" className="mt-4 grid grid-cols-4 gap-4">
          {analytics.metrics.map(([label, value, meta, tone]) => (
            <article className={`${card} px-5 py-4`} key={label}>
              <h2 className="text-[13px] font-medium text-[var(--muted)]">{label}</h2>
              <p className="mt-3 text-[27px] font-bold leading-none tabular-nums">{value}</p>
              <p className={`mt-3 text-xs font-medium ${tone}`}>{meta}</p>
            </article>
          ))}
        </section>

        <div className="mt-5 grid grid-cols-2 gap-5">
          <ChartCard kind="date" title="일별 매출 · 순이익 추이">
            <div className="mb-1 flex justify-end gap-2">
              <button aria-pressed={visibleSeries.gross} className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-medium" onClick={() => setVisibleSeries((current) => ({ ...current, gross: !current.gross }))} type="button">총매출 표시</button>
              <button aria-pressed={visibleSeries.profit} className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-medium" onClick={() => setVisibleSeries((current) => ({ ...current, profit: !current.profit }))} type="button">샵 수익 표시</button>
            </div>
            <ChartSurface className="h-[218px]" kind="date" label="일별 매출" onReady={chartRef("date")}><ResponsiveContainer height="100%" width="100%"><LineChart data={analytics.daily} margin={{ left: 8, right: 12 }} onClick={(value) => selectChartValue("date", value)}>
              <CartesianGrid stroke="#ece8e3" vertical={false} /><XAxis dataKey="date" tickLine={false} /><YAxis tickFormatter={money} tickLine={false} width={58} />
              <Tooltip formatter={(value) => `₩${Number(value).toLocaleString("ko-KR")}`} /><Legend />
              {visibleSeries.gross && <Line {...chartMotion.daily} dataKey="gross" name="총매출" stroke="#5c344f" strokeWidth={3} type="monotone" />}
              {visibleSeries.profit && <Line {...chartMotion.daily} dataKey="profit" name="샵 수익" stroke="#5b806d" strokeWidth={3} type="monotone" />}
            </LineChart></ResponsiveContainer></ChartSurface>
            <ValueButtons items={analytics.daily.map((item) => ({ key: item.date, text: `${item.date} · ${won(item.gross)} / ${won(item.profit)}` }))} kind="date" label="매출" onSelect={select("date")} />
          </ChartCard>

          <ChartCard kind="payment" title="결제수단 비중">
            <ChartSurface className="h-[250px]" kind="payment" label="결제수단" onReady={chartRef("payment")}><ResponsiveContainer height="100%" width="100%"><PieChart onClick={(value) => selectChartValue("payment", value)}><Pie {...chartMotion.payment} data={analytics.payments} dataKey="value" innerRadius={62} nameKey="name" outerRadius={96} paddingAngle={3}>
              {analytics.payments.map((item) => <Cell fill={item.color} key={item.name} />)}
            </Pie><Tooltip formatter={(value) => `${value}%`} /><Legend /></PieChart></ResponsiveContainer></ChartSurface>
            <ValueButtons items={analytics.payments.map((item) => ({ key: item.name, text: `${item.name} ${item.value}%` }))} kind="payment" label="결제수단" onSelect={select("payment")} />
          </ChartCard>

          <ChartCard kind="service" title="시술 카테고리 순위">
            <ChartSurface className="h-[250px]" kind="service" label="시술 카테고리" onReady={chartRef("service")}><ResponsiveContainer height="100%" width="100%"><BarChart data={analytics.services} layout="vertical" margin={{ left: 18, right: 24 }} onClick={(value) => selectChartValue("service", value)}>
              <CartesianGrid horizontal={false} stroke="#ece8e3" /><XAxis tickFormatter={money} type="number" /><YAxis dataKey="name" tickLine={false} type="category" width={54} />
              <Tooltip formatter={(value) => `₩${Number(value).toLocaleString("ko-KR")}`} /><Bar {...chartMotion.service} dataKey="sales" fill="#5c344f" name="매출" radius={[0, 7, 7, 0]} />
            </BarChart></ResponsiveContainer></ChartSurface>
            <ValueButtons items={analytics.services.map((item) => ({ key: item.name, text: `${item.name} ${won(item.sales)}` }))} kind="service" label="시술" onSelect={select("service")} />
          </ChartCard>

          <ChartCard kind="staff" title="디자이너 매출 · 순이익">
            <ChartSurface className="h-[250px]" kind="staff" label="디자이너 매출" onReady={chartRef("staff")}><ResponsiveContainer height="100%" width="100%"><BarChart data={analytics.staff} margin={{ left: 8, right: 12 }} onClick={(value) => selectChartValue("staff", value)}>
              <CartesianGrid stroke="#ece8e3" vertical={false} /><XAxis dataKey="name" tickLine={false} /><YAxis tickFormatter={money} tickLine={false} width={58} />
              <Tooltip formatter={(value) => `₩${Number(value).toLocaleString("ko-KR")}`} /><Legend />
              <Bar {...chartMotion.staffSales} dataKey="sales" fill="#5c344f" name="매출" radius={[6, 6, 0, 0]} /><Bar {...chartMotion.staffProfit} dataKey="profit" fill="#b77d8f" name="샵 수익" radius={[6, 6, 0, 0]} />
            </BarChart></ResponsiveContainer></ChartSurface>
            <ValueButtons items={analytics.staff.map((item) => ({ key: item.name, text: `${item.name} · ${won(item.sales)} / ${won(item.profit)}` }))} kind="staff" label="담당자" onSelect={select("staff")} />
          </ChartCard>
        </div>

        <div className="mt-5">
          <ChartCard kind="deduction" title="총매출에서 샵 수익까지">
            <ChartSurface className="h-[250px]" kind="deduction" label="공제" onReady={chartRef("deduction")}><ResponsiveContainer height="100%" width="100%"><BarChart data={analytics.deductions} margin={{ left: 8, right: 12 }} onClick={(value) => selectChartValue("deduction", value)}>
              <CartesianGrid stroke="#ece8e3" vertical={false} /><XAxis dataKey="name" tickLine={false} /><YAxis tickFormatter={money} tickLine={false} width={60} />
              <Tooltip formatter={(value) => `₩${Number(value).toLocaleString("ko-KR")}`} /><Bar {...chartMotion.deduction} dataKey="value" name="금액" radius={[7, 7, 0, 0]}>
                {analytics.deductions.map((item) => <Cell fill={item.color} key={item.name} />)}
              </Bar>
            </BarChart></ResponsiveContainer></ChartSurface>
            <ValueButtons items={analytics.deductions.map((item) => ({ key: item.name, text: `${item.name} ${won(item.value)}` }))} kind="deduction" label="공제" onSelect={select("deduction")} />
          </ChartCard>
        </div>

        <details className={`${card} mt-5 p-5`}>
          <summary className="cursor-pointer text-[15px] font-bold">차트 데이터 표</summary>
          <div className="mt-5 grid grid-cols-2 gap-5 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]"><caption className="sr-only">일별 총매출과 샵 수익</caption><thead><tr className="border-b border-[var(--border)] text-[var(--muted)]"><th className="p-3">날짜</th><th className="p-3">총매출</th><th className="p-3">샵 수익</th></tr></thead><tbody>{analytics.daily.map((row) => <tr className="border-b border-[var(--border)]" key={row.date}><th className="p-3 font-medium">{row.date}</th><td className="p-3">₩{row.gross.toLocaleString("ko-KR")}</td><td className="p-3">₩{row.profit.toLocaleString("ko-KR")}</td></tr>)}</tbody></table>
            <table className="w-full border-collapse text-left text-[13px]"><caption className="sr-only">결제수단별 비중과 건수</caption><thead><tr className="border-b border-[var(--border)] text-[var(--muted)]"><th className="p-3">결제수단</th><th className="p-3">비중</th><th className="p-3">건수</th></tr></thead><tbody>{analytics.payments.map((row) => <tr className="border-b border-[var(--border)]" key={row.name}><th className="p-3 font-medium">{row.name}</th><td className="p-3">{row.value}%</td><td className="p-3">{row.count.toLocaleString("ko-KR")}건</td></tr>)}</tbody></table>
            <table className="w-full border-collapse text-left text-[13px]"><caption className="sr-only">시술별 매출</caption><thead><tr className="border-b border-[var(--border)] text-[var(--muted)]"><th className="p-3">시술</th><th className="p-3">매출</th></tr></thead><tbody>{analytics.services.map((row) => <tr className="border-b border-[var(--border)]" key={row.name}><th className="p-3 font-medium">{row.name}</th><td className="p-3">₩{row.sales.toLocaleString("ko-KR")}</td></tr>)}</tbody></table>
            <table className="w-full border-collapse text-left text-[13px]"><caption className="sr-only">담당자별 매출과 샵 수익</caption><thead><tr className="border-b border-[var(--border)] text-[var(--muted)]"><th className="p-3">담당자</th><th className="p-3">매출</th><th className="p-3">샵 수익</th></tr></thead><tbody>{analytics.staff.map((row) => <tr className="border-b border-[var(--border)]" key={row.name}><th className="p-3 font-medium">{row.name}</th><td className="p-3">₩{row.sales.toLocaleString("ko-KR")}</td><td className="p-3">₩{row.profit.toLocaleString("ko-KR")}</td></tr>)}</tbody></table>
            <table className="col-span-2 w-full border-collapse text-left text-[13px]"><caption className="sr-only">총매출과 공제 및 샵 수익</caption><thead><tr className="border-b border-[var(--border)] text-[var(--muted)]"><th className="p-3">항목</th><th className="p-3">금액</th></tr></thead><tbody>{analytics.deductions.map((row) => <tr className="border-b border-[var(--border)]" key={row.name}><th className="p-3 font-medium">{row.name}</th><td className="p-3">₩{row.value.toLocaleString("ko-KR")}</td></tr>)}</tbody></table>
          </div>
        </details>
      </main>
    </AppShell>
  );
}
