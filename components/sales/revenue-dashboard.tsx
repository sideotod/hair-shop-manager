"use client";

import { useEffect, useState } from "react";
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
import { revenueAnalyticsFixture, type RevenueAnalytics } from "./revenue-analytics";
import { createRevenueCsv } from "./revenue-csv";
import { DEFAULT_REVENUE_QUERY, parseRevenueQuery, type RevenuePreset, type RevenueQuery, serializeRevenueQuery } from "./revenue-query";

const card = "rounded-[14px] border border-[var(--border)] bg-white";
const money = (value: number) => `${Math.round(value / 10000).toLocaleString("ko-KR")}만`;

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${card} min-h-[330px] p-5`}>
      <h2 className="text-[17px] font-bold">{title}</h2>
      <div className="mt-5 h-[250px]">{children}</div>
    </section>
  );
}

export function RevenueDashboard({ analytics = revenueAnalyticsFixture }: { analytics?: RevenueAnalytics }) {
  const [query, setQuery] = useState<RevenueQuery>(DEFAULT_REVENUE_QUERY);
  const [visibleSeries, setVisibleSeries] = useState({ gross: true, profit: true });

  useEffect(() => {
    setQuery(parseRevenueQuery(window.location.search));
  }, []);

  const updateQuery = (change: Partial<RevenueQuery>) => {
    const next = { ...query, ...change };
    setQuery(next);
    window.history.replaceState(null, "", `${window.location.pathname}?${serializeRevenueQuery(next)}`);
  };

  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${createRevenueCsv(analytics.daily)}`)}`;

  return (
    <AppShell activeHref="/sales">
      <main className="px-10 pb-16 pt-9">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.03em]">매출 분석</h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">매출 구조와 샵 수익 변화를 비교하고 원인을 확인합니다.</p>
          </div>
          <div className="flex gap-2">
            <button className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-4 text-[13px] font-medium text-[var(--brand)]" onClick={() => window.print()} type="button">인쇄</button>
            <a className="flex h-10 items-center rounded-[10px] bg-[var(--brand)] px-5 text-[13px] font-medium text-white" download="hairhaeyo-revenue-2026-07-24_2026-07-30.csv" href={csvHref}>CSV 내보내기</a>
          </div>
        </div>

        <section aria-label="매출 조회 조건" className={`${card} mt-8 grid grid-cols-[128px_144px_144px_140px_120px_120px_1fr] items-end gap-3 p-4`}>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">기간
            <select className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[13px] text-[var(--foreground)]" onChange={(event) => updateQuery({ preset: event.target.value as RevenuePreset })} value={query.preset}>
              <option value="today">오늘</option><option value="week">최근 7일</option><option value="month">이번 달</option><option value="previous">이전 달</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">시작일<input className="h-10 rounded-[10px] border border-[var(--border)] px-3 text-[13px] text-[var(--foreground)]" onChange={(event) => updateQuery({ start: event.target.value })} type="date" value={query.start} /></label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">종료일<input className="h-10 rounded-[10px] border border-[var(--border)] px-3 text-[13px] text-[var(--foreground)]" onChange={(event) => updateQuery({ end: event.target.value })} type="date" value={query.end} /></label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">담당자<select className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[13px] text-[var(--foreground)]" onChange={(event) => updateQuery({ staff: event.target.value })} value={query.staff}><option value="all">전체</option><option value="seoyun">서윤 원장</option><option value="harin">하린 실장</option></select></label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">시술<select className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[13px] text-[var(--foreground)]" onChange={(event) => updateQuery({ service: event.target.value })} value={query.service}><option value="all">전체</option><option value="color">컬러</option><option value="perm">펌</option></select></label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">결제수단<select className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[13px] text-[var(--foreground)]" onChange={(event) => updateQuery({ payment: event.target.value })} value={query.payment}><option value="all">전체</option><option value="card">카드</option><option value="cash">현금</option></select></label>
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
          <ChartCard title="일별 매출 · 순이익 추이">
            <div className="mb-1 flex justify-end gap-2">
              <button aria-pressed={visibleSeries.gross} className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-medium" onClick={() => setVisibleSeries((current) => ({ ...current, gross: !current.gross }))} type="button">총매출 표시</button>
              <button aria-pressed={visibleSeries.profit} className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-medium" onClick={() => setVisibleSeries((current) => ({ ...current, profit: !current.profit }))} type="button">샵 수익 표시</button>
            </div>
            <div className="h-[218px]"><ResponsiveContainer height="100%" width="100%"><LineChart data={analytics.daily} margin={{ left: 8, right: 12 }}>
              <CartesianGrid stroke="#ece8e3" vertical={false} /><XAxis dataKey="date" tickLine={false} /><YAxis tickFormatter={money} tickLine={false} width={58} />
              <Tooltip formatter={(value) => `₩${Number(value).toLocaleString("ko-KR")}`} /><Legend />
              {visibleSeries.gross && <Line dataKey="gross" isAnimationActive={false} name="총매출" stroke="#5c344f" strokeWidth={3} type="monotone" />}
              {visibleSeries.profit && <Line dataKey="profit" isAnimationActive={false} name="샵 수익" stroke="#5b806d" strokeWidth={3} type="monotone" />}
            </LineChart></ResponsiveContainer></div>
          </ChartCard>

          <ChartCard title="결제수단 비중">
            <ResponsiveContainer height="100%" width="100%"><PieChart><Pie data={analytics.payments} dataKey="value" innerRadius={62} isAnimationActive={false} nameKey="name" outerRadius={96} paddingAngle={3}>
              {analytics.payments.map((item) => <Cell fill={item.color} key={item.name} />)}
            </Pie><Tooltip formatter={(value) => `${value}%`} /><Legend /></PieChart></ResponsiveContainer>
          </ChartCard>

          <ChartCard title="시술 카테고리 순위">
            <ResponsiveContainer height="100%" width="100%"><BarChart data={analytics.services} layout="vertical" margin={{ left: 18, right: 24 }}>
              <CartesianGrid horizontal={false} stroke="#ece8e3" /><XAxis tickFormatter={money} type="number" /><YAxis dataKey="name" tickLine={false} type="category" width={54} />
              <Tooltip formatter={(value) => `₩${Number(value).toLocaleString("ko-KR")}`} /><Bar dataKey="sales" fill="#5c344f" isAnimationActive={false} name="매출" radius={[0, 7, 7, 0]} />
            </BarChart></ResponsiveContainer>
          </ChartCard>

          <ChartCard title="디자이너 매출 · 순이익">
            <ResponsiveContainer height="100%" width="100%"><BarChart data={analytics.staff} margin={{ left: 8, right: 12 }}>
              <CartesianGrid stroke="#ece8e3" vertical={false} /><XAxis dataKey="name" tickLine={false} /><YAxis tickFormatter={money} tickLine={false} width={58} />
              <Tooltip formatter={(value) => `₩${Number(value).toLocaleString("ko-KR")}`} /><Legend />
              <Bar dataKey="sales" fill="#5c344f" isAnimationActive={false} name="매출" radius={[6, 6, 0, 0]} /><Bar dataKey="profit" fill="#b77d8f" isAnimationActive={false} name="샵 수익" radius={[6, 6, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="mt-5 grid grid-cols-[2fr_1fr] gap-5">
          <ChartCard title="총매출에서 샵 수익까지">
            <ResponsiveContainer height="100%" width="100%"><BarChart data={analytics.deductions} margin={{ left: 8, right: 12 }}>
              <CartesianGrid stroke="#ece8e3" vertical={false} /><XAxis dataKey="name" tickLine={false} /><YAxis tickFormatter={money} tickLine={false} width={60} />
              <Tooltip formatter={(value) => `₩${Number(value).toLocaleString("ko-KR")}`} /><Bar dataKey="value" isAnimationActive={false} name="금액" radius={[7, 7, 0, 0]}>
                {analytics.deductions.map((item) => <Cell fill={item.color} key={item.name} />)}
              </Bar>
            </BarChart></ResponsiveContainer>
          </ChartCard>

          <section className={`${card} p-5`}>
            <h2 className="text-[17px] font-bold">해석 요약</h2>
            <ul className="mt-5 space-y-4 text-[13px] leading-6">
              <li><strong className="text-[var(--success)]">수익 개선</strong><br />컬러 매출 증가로 샵 수익이 7.4% 상승했습니다.</li>
              <li><strong className="text-[var(--warning)]">확인 필요</strong><br />객단가는 2.1% 하락해 패키지 제안율 확인이 필요합니다.</li>
              <li><strong className="text-[var(--brand)]">결제 구조</strong><br />카드 비중 61%, 선불권 비중 14%입니다.</li>
            </ul>
          </section>
        </div>

        <details className={`${card} mt-5 p-5`}>
          <summary className="cursor-pointer text-[15px] font-bold">차트 데이터 표</summary>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
              <caption className="sr-only">일별 총매출과 샵 수익</caption>
              <thead><tr className="border-b border-[var(--border)] text-[var(--muted)]"><th className="p-3">날짜</th><th className="p-3">총매출</th><th className="p-3">샵 수익</th><th className="p-3">결제수단 1위</th><th className="p-3">시술 매출 1위</th></tr></thead>
              <tbody>{analytics.daily.map((row) => <tr className="border-b border-[var(--border)]" key={row.date}><th className="p-3 font-medium">{row.date}</th><td className="p-3 tabular-nums">₩{row.gross.toLocaleString("ko-KR")}</td><td className="p-3 tabular-nums">₩{row.profit.toLocaleString("ko-KR")}</td><td className="p-3">{analytics.payments[0] ? `${analytics.payments[0].name} ${analytics.payments[0].value}%` : "없음"}</td><td className="p-3">{analytics.services[0]?.name ?? "없음"}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      </main>
    </AppShell>
  );
}
