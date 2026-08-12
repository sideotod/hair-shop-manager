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
  readonly status: "결제" | "환불" | "정정" | "지출";
  readonly gender: string;
  readonly visitType: string;
};

export type RevenueTrend = { readonly date: string; readonly gross: number; readonly profit: number };
export type RevenueAmount = { readonly name: string; readonly sales: number; readonly count: number };
export type PaymentRevenue = { readonly name: string; readonly amount: number; readonly value: number };
export type SettlementRow = { readonly name: string; readonly value: number };
/** 원장에 실제 분류값이 있을 때만 해당 분석 차원을 화면에 연다. */
export type AnalyticsAvailability = { readonly service: boolean; readonly payment: boolean };

export type RevenueAnalytics = {
  readonly selectedPeriod: RevenuePeriod;
  readonly totals: { readonly today: number; readonly month: number; readonly total: number };
  readonly trend: readonly RevenueTrend[];
  readonly services: readonly RevenueAmount[];
  readonly payments: readonly PaymentRevenue[];
  readonly availability: AnalyticsAvailability;
  readonly settlement: readonly SettlementRow[];
  readonly transactions: readonly RevenueTransaction[];
};

/**
 * 클라이언트로 넘기는 몫. 개별 거래는 빠진다 —
 * 누적 기간에서 5천 건이 RSC 페이로드로 직렬화되면 문서가 수 MB가 된다 (A4-1).
 * 거래 목록이 필요한 곳은 `/sales/transactions`와 CSV 라우트로, 서버에서 읽는다.
 */
export type RevenueAnalyticsView = Omit<RevenueAnalytics, "transactions">;
