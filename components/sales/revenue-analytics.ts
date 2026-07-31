export type RevenuePeriod = { readonly start: string; readonly end: string; readonly label: string };

export type RevenueTransaction = {
  readonly id: string;
  readonly date: string;
  readonly dateLabel: string;
  readonly customerIdentifier: string;
  readonly service: string;
  readonly payment: string;
  readonly paymentAmounts: Readonly<Record<string, number>>;
  readonly gross: number;
  readonly netPaid: number;
  readonly profit: number;
  readonly discount: number;
  readonly points: number;
  readonly vat: number;
  readonly fee: number;
  readonly expense: number;
  readonly status: "결제" | "환불" | "정정";
  readonly gender: string;
  readonly visitType: string;
};

export type RevenueTrend = { readonly date: string; readonly gross: number; readonly profit: number };
export type RevenueAmount = { readonly name: string; readonly sales: number };
export type PaymentRevenue = { readonly name: string; readonly amount: number; readonly value: number; readonly color: string };
export type SettlementRow = { readonly name: string; readonly value: number };

export type RevenueAnalytics = {
  readonly selectedPeriod: RevenuePeriod;
  readonly totals: { readonly today: number; readonly month: number; readonly total: number };
  readonly trend: readonly RevenueTrend[];
  readonly services: readonly RevenueAmount[];
  readonly payments: readonly PaymentRevenue[];
  readonly genders: readonly RevenueAmount[];
  readonly visitTypes: readonly RevenueAmount[];
  readonly settlement: readonly SettlementRow[];
  readonly transactions: readonly RevenueTransaction[];
};
