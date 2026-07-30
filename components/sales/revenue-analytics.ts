export type RevenuePeriod = {
  readonly start: string;
  readonly end: string;
  readonly label: string;
};

export type RevenueMetric = readonly [label: string, value: string, meta: string, tone: string];
export type DailyRevenue = { readonly date: string; readonly gross: number; readonly profit: number };
export type PaymentRevenue = { readonly name: string; readonly value: number; readonly count: number; readonly color: string };
export type ServiceRevenue = { readonly name: string; readonly sales: number };
export type StaffRevenue = { readonly name: string; readonly sales: number; readonly profit: number };
export type DeductionRevenue = { readonly name: string; readonly value: number; readonly color: string };
export type RevenueDeduction = { readonly name: string; readonly value: number };

export type RevenueTransaction = {
  readonly id: string;
  readonly sequence: number;
  readonly date: string;
  readonly dateLabel: string;
  readonly customerIdentifier: string;
  readonly service: string;
  readonly serviceKey: string;
  readonly staff: string;
  readonly staffKey: string;
  readonly payment: string;
  readonly paymentKey: string;
  readonly gross: number;
  readonly profit: number;
  readonly deductions: readonly RevenueDeduction[];
};

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
