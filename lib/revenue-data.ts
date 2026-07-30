import type {
  DeductionRevenue,
  RevenueAnalytics,
  RevenueDeduction,
  RevenueMetric,
  RevenueTransaction,
} from "../components/sales/revenue-analytics";
import { DEFAULT_REVENUE_QUERY, type RevenueQuery } from "../components/sales/revenue-query";

type SourceGroup = {
  readonly date: string;
  readonly dateLabel: string;
  readonly service: string;
  readonly serviceKey: string;
  readonly staff: string;
  readonly staffKey: string;
  readonly payment: string;
  readonly paymentKey: string;
  readonly gross: number;
  readonly profit: number;
  readonly count: number;
  readonly deductions: readonly RevenueDeduction[];
};

const sourceGroups = [
  { date: "2026-07-24", dateLabel: "7/24", service: "컬러", serviceKey: "color", staff: "서윤", staffKey: "seoyun", payment: "카드", paymentKey: "card", gross: 10480000, profit: 6080000, count: 150, deductions: [{ name: "환불", value: 300000 }, { name: "VAT", value: 1000000 }, { name: "수수료", value: 300000 }, { name: "인센티브", value: 2200000 }, { name: "경비", value: 600000 }] },
  { date: "2026-07-25", dateLabel: "7/25", service: "펌", serviceKey: "perm", staff: "하린", staffKey: "harin", payment: "현금", paymentKey: "cash", gross: 8640000, profit: 5010000, count: 42, deductions: [{ name: "환불", value: 200000 }, { name: "VAT", value: 800000 }, { name: "수수료", value: 250000 }, { name: "인센티브", value: 1800000 }, { name: "경비", value: 580000 }] },
  { date: "2026-07-26", dateLabel: "7/26", service: "클리닉", serviceKey: "clinic", staff: "도현", staffKey: "dohyeon", payment: "선불권", paymentKey: "prepaid", gross: 6120000, profit: 3550000, count: 34, deductions: [{ name: "환불", value: 180000 }, { name: "VAT", value: 550000 }, { name: "수수료", value: 200000 }, { name: "인센티브", value: 1250000 }, { name: "경비", value: 390000 }] },
  { date: "2026-07-27", dateLabel: "7/27", service: "컷", serviceKey: "cut", staff: "민아", staffKey: "mina", payment: "기타", paymentKey: "other", gross: 4720000, profit: 2750000, count: 20, deductions: [{ name: "환불", value: 140000 }, { name: "VAT", value: 370000 }, { name: "수수료", value: 160000 }, { name: "인센티브", value: 830000 }, { name: "경비", value: 470000 }] },
] as const satisfies readonly SourceGroup[];

function portion(total: number, count: number, index: number) {
  const base = Math.floor(total / count);
  return base + (index < total % count ? 1 : 0);
}

function sum<T>(items: readonly T[], value: (item: T) => number) {
  return items.reduce((total, item) => total + value(item), 0);
}

function expandGroup(group: SourceGroup): readonly RevenueTransaction[] {
  const dateKey = group.date.replaceAll("-", "");
  const customerDate = group.date.slice(5).replace("-", "");
  const records = Array.from({ length: group.count }, (_, index) => {
    const deductions = Object.freeze(group.deductions.map((item) => Object.freeze({ name: item.name, value: portion(item.value, group.count, index) })));
    const gross = portion(group.gross, group.count, index);
    const profit = gross - sum(deductions, (item) => item.value);
    const sequence = index + 1;
    return Object.freeze({
      id: `TX-${dateKey}-${String(sequence).padStart(3, "0")}`,
      sequence,
      date: group.date,
      dateLabel: group.dateLabel,
      customerIdentifier: `C-${customerDate}-${String(sequence).padStart(3, "0")}`,
      service: group.service,
      serviceKey: group.serviceKey,
      staff: group.staff,
      staffKey: group.staffKey,
      payment: group.payment,
      paymentKey: group.paymentKey,
      gross,
      profit,
      deductions,
    } satisfies RevenueTransaction);
  });

  if (sum(records, (record) => record.gross) !== group.gross
    || sum(records, (record) => record.profit) !== group.profit
    || group.deductions.some((deduction) => sum(records, (record) => record.deductions.find((item) => item.name === deduction.name)?.value ?? 0) !== deduction.value)) {
    throw new Error(`Revenue expansion mismatch: ${group.date}`);
  }
  return records;
}

export const revenueTransactions: readonly RevenueTransaction[] = Object.freeze(sourceGroups.flatMap(expandGroup));

const paymentDefinitions = [["카드", "#5c344f"], ["현금", "#b77d8f"], ["선불권", "#5b806d"], ["기타", "#b27a38"]] as const;
const serviceNames = ["컬러", "펌", "클리닉", "컷"] as const;
const staffNames = ["서윤", "하린", "도현", "민아"] as const;
const deductionDefinitions = [["환불", "#b84a4a"], ["VAT", "#b27a38"], ["수수료", "#b77d8f"], ["인센티브", "#8d7183"], ["경비", "#687078"]] as const;

function periodLabel(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  if (start === end) return `${startDate.getUTCFullYear()}년 ${startDate.getUTCMonth() + 1}월 ${startDate.getUTCDate()}일`;
  if (startDate.getUTCFullYear() === endDate.getUTCFullYear() && startDate.getUTCMonth() === endDate.getUTCMonth()) {
    return `${startDate.getUTCFullYear()}년 ${startDate.getUTCMonth() + 1}월 ${startDate.getUTCDate()}일–${endDate.getUTCDate()}일`;
  }
  return `${start}–${end}`;
}

function comparisonPeriod(query: RevenueQuery) {
  const start = new Date(`${query.start}T00:00:00Z`);
  const end = new Date(`${query.end}T00:00:00Z`);
  const days = Math.round((end.valueOf() - start.valueOf()) / 86400000) + 1;
  const comparisonEnd = new Date(start.valueOf() - 86400000);
  const comparisonStart = new Date(comparisonEnd.valueOf() - (days - 1) * 86400000);
  const comparisonStartValue = comparisonStart.toISOString().slice(0, 10);
  const comparisonEndValue = comparisonEnd.toISOString().slice(0, 10);
  return { start: comparisonStartValue, end: comparisonEndValue, label: periodLabel(comparisonStartValue, comparisonEndValue) };
}

export function filterRevenueTransactions(records: readonly RevenueTransaction[], query: RevenueQuery) {
  return Object.freeze(records.filter((record) => record.date >= query.start && record.date <= query.end
    && (query.staff === "all" || record.staffKey === query.staff)
    && (query.service === "all" || record.serviceKey === query.service)
    && (query.payment === "all" || record.paymentKey === query.payment)));
}

export function filterRevenueSelection(records: readonly RevenueTransaction[], selection: { kind: "date" | "payment" | "service" | "staff" | "deduction"; key: string } | null) {
  if (!selection) return records;
  if (selection.kind === "date") return records.filter((record) => record.dateLabel === selection.key);
  if (selection.kind === "payment") return records.filter((record) => record.payment === selection.key);
  if (selection.kind === "service") return records.filter((record) => record.service === selection.key);
  if (selection.kind === "staff") return records.filter((record) => record.staff === selection.key);
  if (selection.key === "총매출" || selection.key === "샵 수익") return records;
  return records.filter((record) => (record.deductions.find((item) => item.name === selection.key)?.value ?? 0) > 0);
}

export function buildRevenueAnalytics(records: readonly RevenueTransaction[], query: RevenueQuery): RevenueAnalytics {
  const gross = sum(records, (record) => record.gross);
  const profit = sum(records, (record) => record.profit);
  const transactionCount = records.length;
  const dates = [...new Set(records.map((record) => record.date))].sort();
  const deductions: readonly DeductionRevenue[] = Object.freeze([
    { name: "총매출", value: gross, color: "#5c344f" },
    ...deductionDefinitions.map(([name, color]) => ({ name, color, value: sum(records, (record) => record.deductions.find((item) => item.name === name)?.value ?? 0) })),
    { name: "샵 수익", value: profit, color: "#5b806d" },
  ]);

  return Object.freeze({
    selectedPeriod: { start: query.start, end: query.end, label: periodLabel(query.start, query.end) },
    comparisonPeriod: comparisonPeriod(query),
    metrics: Object.freeze([
      ["총매출", `₩${gross.toLocaleString("ko-KR")}`, "선택 기간 집계", "text-[var(--success)]"],
      ["샵 수익", `₩${profit.toLocaleString("ko-KR")}`, gross ? `수익률 ${((profit / gross) * 100).toFixed(1)}%` : "수익률 0.0%", "text-[var(--brand)]"],
      ["결제 건수", `${transactionCount.toLocaleString("ko-KR")}건`, "선택 기간 집계", "text-[var(--rose)]"],
      ["객단가", `₩${(transactionCount ? Math.round(gross / transactionCount) : 0).toLocaleString("ko-KR")}`, "선택 기간 집계", "text-[var(--warning)]"],
    ] satisfies readonly RevenueMetric[]),
    daily: Object.freeze(dates.map((date) => {
      const dailyRecords = records.filter((record) => record.date === date);
      return Object.freeze({ date: dailyRecords[0]?.dateLabel ?? date, gross: sum(dailyRecords, (record) => record.gross), profit: sum(dailyRecords, (record) => record.profit) });
    })),
    payments: Object.freeze(paymentDefinitions.map(([name, color]) => {
      const count = records.filter((record) => record.payment === name).length;
      return Object.freeze({ name, color, count, value: transactionCount ? Math.round((count / transactionCount) * 100) : 0 });
    })),
    services: Object.freeze(serviceNames.map((name) => Object.freeze({ name, sales: sum(records.filter((record) => record.service === name), (record) => record.gross) }))),
    staff: Object.freeze(staffNames.map((name) => {
      const staffRecords = records.filter((record) => record.staff === name);
      return Object.freeze({ name, sales: sum(staffRecords, (record) => record.gross), profit: sum(staffRecords, (record) => record.profit) });
    })),
    deductions,
  });
}

export const revenueAnalytics = buildRevenueAnalytics(revenueTransactions, DEFAULT_REVENUE_QUERY);
