type RevenuePeriod = {
  readonly start: string;
  readonly end: string;
  readonly label: string;
};

type RevenueMetric = readonly [label: string, value: string, meta: string, tone: string];
type DailyRevenue = { readonly date: string; readonly gross: number; readonly profit: number };
type PaymentRevenue = { readonly name: string; readonly value: number; readonly color: string };
type ServiceRevenue = { readonly name: string; readonly sales: number };
type StaffRevenue = { readonly name: string; readonly sales: number; readonly profit: number };
type DeductionRevenue = { readonly name: string; readonly value: number; readonly color: string };

export type RevenueAnalytics = {
  readonly selectedPeriod: RevenuePeriod;
  readonly comparisonPeriod: RevenuePeriod;
  readonly metrics: readonly RevenueMetric[];
  readonly daily: readonly DailyRevenue[];
  readonly payments: readonly PaymentRevenue[];
  readonly services: readonly ServiceRevenue[];
  readonly staff: readonly StaffRevenue[];
  readonly deductions: readonly DeductionRevenue[];
};

export const revenueAnalyticsFixture = {
  selectedPeriod: { start: "2026-07-24", end: "2026-07-30", label: "2026년 7월 24일–30일" },
  comparisonPeriod: { start: "2026-07-17", end: "2026-07-23", label: "2026년 7월 17일–23일" },
  metrics: [
    ["총매출", "₩29,960,000", "이전 기간보다 8.6% 증가", "text-[var(--success)]"],
    ["샵 수익", "₩17,390,000", "수익률 58.0%", "text-[var(--brand)]"],
    ["결제 건수", "246건", "이전 기간보다 14건 증가", "text-[var(--rose)]"],
    ["객단가", "₩121,789", "이전 기간보다 2.1% 감소", "text-[var(--warning)]"],
  ],
  daily: [
    { date: "7/24", gross: 3480000, profit: 2240000 },
    { date: "7/25", gross: 3920000, profit: 2520000 },
    { date: "7/26", gross: 4680000, profit: 2980000 },
    { date: "7/27", gross: 2860000, profit: 1840000 },
    { date: "7/28", gross: 4120000, profit: 2690000 },
    { date: "7/29", gross: 3810000, profit: 2440000 },
    { date: "7/30", gross: 4280000, profit: 2780000 },
  ],
  payments: [
    { name: "카드", value: 61, color: "#5c344f" },
    { name: "현금", value: 17, color: "#b77d8f" },
    { name: "선불권", value: 14, color: "#5b806d" },
    { name: "기타", value: 8, color: "#b27a38" },
  ],
  services: [
    { name: "컬러", sales: 10480000 },
    { name: "펌", sales: 8640000 },
    { name: "클리닉", sales: 6120000 },
    { name: "컷", sales: 4880000 },
    { name: "두피", sales: 2760000 },
  ],
  staff: [
    { name: "서윤", sales: 8680000, profit: 5360000 },
    { name: "하린", sales: 7240000, profit: 4510000 },
    { name: "도현", sales: 5860000, profit: 3720000 },
    { name: "민아", sales: 4180000, profit: 2640000 },
  ],
  deductions: [
    { name: "총매출", value: 29960000, color: "#5c344f" },
    { name: "환불", value: 820000, color: "#b84a4a" },
    { name: "VAT", value: 2720000, color: "#b27a38" },
    { name: "수수료", value: 910000, color: "#b77d8f" },
    { name: "인센티브", value: 6080000, color: "#8d7183" },
    { name: "경비", value: 2040000, color: "#687078" },
    { name: "샵 수익", value: 17390000, color: "#5b806d" },
  ],
} as const satisfies RevenueAnalytics;
