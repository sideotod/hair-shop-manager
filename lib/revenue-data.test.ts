import { describe, expect, it } from "vitest";

import { buildRevenueAnalytics, buildRevenueTransactions, filterRevenueSelection, filterRevenueTransactions } from "./revenue-data";
import type { LedgerEntry } from "./salon-domain";
import { createSalonStore } from "./salon-store";
import { recordPayment, refundPaymentRecord } from "./finance";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const splitPayment = {
  requestKey: "split-payment", customerId: "customer-seed-1", serviceMajor: "커트", serviceDetail: "", styleName: "", grossWon: "11000", discountWon: "0", pointsUsedWon: "0", pointsEarnedWon: "0", expenseWon: "0", cardFeeRate: "0", vatMode: "included", payment_cash: "5000", payment_card: "6000", occurredDate: "2026-07-31", occurredTime: "10:00", generalNote: "", medicineNote: "", scalpNote: "", hairNote: "", gender: "female", visitType: "repeat",
} as const;

describe("server revenue aggregate", () => {
  it("builds every KPI, chart, table, CSV source, and transaction row from the same immutable ledger", () => {
    const store = createSalonStore(":memory:");
    try {
      const snapshot = store.snapshot();
      const transactions = buildRevenueTransactions(snapshot.ledger, snapshot.records.customers ?? []);
      const analytics = buildRevenueAnalytics(transactions, { view: "month", cursor: "2026-07-31" }, "2026-07-31");

      expect(transactions).toHaveLength(4);
      expect(Object.isFrozen(transactions)).toBe(true);
      expect(transactions.every(Object.isFrozen)).toBe(true);
      expect(transactions[0]).toMatchObject({ id: "ledger-seed-1", status: "결제", date: "2026-07-24", service: "컬러", payment: "카드", gross: 10480000, profit: 6080000 });
      expect(transactions.every((row) => !("staff" in row))).toBe(true);

      expect(analytics.totals).toEqual({ today: 0, month: 29960000, total: 29960000 });
      expect(analytics.trend[0]).toEqual({ date: "7/24", gross: 10480000, profit: 6080000 });
      expect(analytics.services[0]).toEqual({ name: "컬러", sales: 10480000, count: 1 });
      expect(analytics.payments.map(({ name, amount, value }) => ({ name, amount, value }))).toEqual([
        { name: "카드", amount: 10480000, value: 35 },
        { name: "현금", amount: 8640000, value: 29 },
        { name: "선불권", amount: 6120000, value: 20 },
        { name: "기타", amount: 4720000, value: 16 },
      ]);
      expect(analytics.settlement).toEqual([
        { name: "총 매출", value: 29960000 },
        { name: "할인", value: 0 },
        { name: "포인트 사용", value: 0 },
        { name: "실결제", value: 29960000 },
        { name: "환불", value: 0 },
        { name: "VAT", value: 2720000 },
        { name: "결제 수수료", value: 910000 },
        { name: "지출", value: 8940000 },
        { name: "수수료 차감 후", value: 17390000 },
      ]);
      expect(analytics.transactions).toEqual(transactions);
      expect(analytics.trend.reduce((sum, row) => sum + row.gross, 0)).toBe(analytics.transactions.reduce((sum, row) => sum + row.gross, 0));
      expect(analytics.settlement.at(-1)?.value).toBe(analytics.transactions.reduce((sum, row) => sum + row.profit, 0));
    } finally {
      store.close();
    }
  });

  it("keeps today/month/total cards visible while the selected window has no data", () => {
    const store = createSalonStore(":memory:");
    try {
      const snapshot = store.snapshot();
      const transactions = buildRevenueTransactions(snapshot.ledger, snapshot.records.customers ?? []);
      // 일별 칩의 창은 한 달이다. 9월에는 시드 거래가 없지만 카드 세 장은 계속 오늘·이번 달·전체를 읽는다.
      const analytics = buildRevenueAnalytics(transactions, { view: "day", cursor: "2026-09-15" }, "2026-07-31");

      expect(analytics.totals).toEqual({ today: 0, month: 29960000, total: 29960000 });
      expect(analytics.transactions).toEqual([]);
      expect(analytics.trend).toEqual([]);
      expect(analytics.services).toEqual([]);
      expect(analytics.payments).toEqual([]);
      expect(analytics.settlement.every(({ value }) => value === 0)).toBe(true);
    } finally {
      store.close();
    }
  });

  it("marks fallback-only imported service and payment dimensions unavailable without changing the settlement", () => {
    const ledger = [
      { id: "raw-import", requestKey: "raw-import", kind: "payment", occurredAt: "2026-08-12T12:00:00.000Z", correctionOf: null, grossWon: 362000, amountWon: 362000, discountWon: 0, vatWon: 0, feeWon: 9360, expenseWon: 0, incentiveWon: 0, pointsWon: 0, couponWon: 0, profitWon: 352640, details: { serviceMajor: "미분류", paymentMethods: { other: 362000 } } },
    ] as LedgerEntry[];

    const analytics = buildRevenueAnalytics(buildRevenueTransactions(ledger), { view: "month", cursor: "2026-08-12" }, "2026-08-12");

    expect(analytics.availability).toEqual({ service: false, payment: false });
    expect(analytics.settlement.find(({ name }) => name === "총 매출")?.value).toBe(362000);
    expect(analytics.settlement.find(({ name }) => name === "수수료 차감 후")?.value).toBe(352640);
  });

  it("filters each chip window and accessible chart selections without staff filters", () => {
    const store = createSalonStore(":memory:");
    try {
      const snapshot = store.snapshot();
      const transactions = buildRevenueTransactions(snapshot.ledger, snapshot.records.customers ?? []);

      // 칩마다 창이 다르다: 일별은 그 달, 주별·월별은 그 해, 년별은 전체.
      expect(filterRevenueTransactions(transactions, { view: "day", cursor: "2026-07-25" })).toHaveLength(4);
      expect(filterRevenueTransactions(transactions, { view: "day", cursor: "2026-09-25" })).toHaveLength(0);
      expect(filterRevenueTransactions(transactions, { view: "week", cursor: "2026-07-31" })).toHaveLength(4);
      expect(filterRevenueTransactions(transactions, { view: "month", cursor: "2026-07-31" })).toHaveLength(4);
      expect(filterRevenueTransactions(transactions, { view: "year", cursor: "2026-07-31" })).toHaveLength(4);
      expect(filterRevenueSelection(transactions, { kind: "payment", key: "현금" })).toHaveLength(1);
      expect(filterRevenueSelection(transactions, { kind: "service", key: "컬러" })).toHaveLength(1);
      expect(filterRevenueSelection(transactions, { kind: "date", key: "7/24" })).toHaveLength(1);
    } finally {
      store.close();
    }
  });

  it("aggregates signed split-payment details by method and signed point use in settlement", () => {
    const store = createSalonStore(":memory:");
    try {
      const customer = store.get<Record<string, string | number>>("customers", "customer-seed-1");
      store.save("customers", "customer-seed-1", { ...customer?.value, points: 1000 }, "사용자");
      const payment = recordPayment(store, form({ ...splitPayment, pointsUsedWon: "1000", payment_cash: "5000", payment_card: "5000", payment_points: "1000" }));
      const beforeRefund = buildRevenueAnalytics(buildRevenueTransactions([payment]), { view: "month", cursor: "2026-07-31" }, "2026-07-31");
      expect(beforeRefund.payments).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: "현금", amount: 5000 }),
        expect.objectContaining({ name: "카드", amount: 5000 }),
      ]));
      expect(beforeRefund.settlement.find(({ name }) => name === "포인트 사용")).toEqual({ name: "포인트 사용", value: 1000 });

      const refund = refundPaymentRecord(store, form({ targetId: payment.id, requestKey: "refund-split", reason: "환불" }));
      expect(refund.details).toMatchObject({ paymentMethods: { cash: -5000, card: -5000, points: -1000 }, pointsUsedWon: -1000 });
      const afterRefund = buildRevenueAnalytics(buildRevenueTransactions([payment, refund]), { view: "year", cursor: "2026-07-31" }, "2026-07-31");
      expect(afterRefund.payments).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: "현금", amount: 5000, value: 45 }),
        expect.objectContaining({ name: "카드", amount: 5000, value: 45 }),
      ]));
      expect(afterRefund.transactions.reduce((sum, row) => sum + (row.paymentAmounts["현금"] ?? 0), 0)).toBe(0);
      expect(afterRefund.transactions.reduce((sum, row) => sum + (row.paymentAmounts["카드"] ?? 0), 0)).toBe(0);
      expect(afterRefund.settlement.find(({ name }) => name === "포인트 사용")).toEqual({ name: "포인트 사용", value: 0 });
    } finally {
      store.close();
    }
  });

  it("uses the 09:00 Asia/Seoul business-day boundary for date and month filters", () => {
    const ledger = [
      { id: "before-nine", requestKey: "before-nine", kind: "payment", occurredAt: "2026-08-01T08:59:00+09:00", correctionOf: null, grossWon: 1000, amountWon: 1000, discountWon: 0, vatWon: 0, feeWon: 0, expenseWon: 0, incentiveWon: 0, pointsWon: 0, couponWon: 0, profitWon: 1000, details: {} },
      { id: "at-nine", requestKey: "at-nine", kind: "payment", occurredAt: "2026-08-01T09:00:00+09:00", correctionOf: null, grossWon: 2000, amountWon: 2000, discountWon: 0, vatWon: 0, feeWon: 0, expenseWon: 0, incentiveWon: 0, pointsWon: 0, couponWon: 0, profitWon: 2000, details: {} },
    ] as LedgerEntry[];
    const transactions = buildRevenueTransactions(ledger);

    expect(transactions.map(({ id, date }) => ({ id, date }))).toEqual([{ id: "before-nine", date: "2026-07-31" }, { id: "at-nine", date: "2026-08-01" }]);
    // 일별 칩의 창이 곧 그 달이라 08:59 결제는 7월 창에 남는다.
    expect(filterRevenueTransactions(transactions, { view: "day", cursor: "2026-08-01" }).map(({ id }) => id)).toEqual(["at-nine"]);
    expect(filterRevenueTransactions(transactions, { view: "day", cursor: "2026-07-01" }).map(({ id }) => id)).toEqual(["before-nine"]);
  });

  it("uses positive payment inflows for pie slices while exposing signed refunds in settlement", () => {
    const ledger = [
      { id: "cash-sale", requestKey: "cash-sale", kind: "payment", occurredAt: "2026-07-31T10:00:00+09:00", correctionOf: null, grossWon: 10000, amountWon: 10000, discountWon: 0, vatWon: 0, feeWon: 0, expenseWon: 0, incentiveWon: 0, pointsWon: 0, couponWon: 0, profitWon: 10000, details: { paymentMethods: { cash: 10000 } } },
      { id: "card-refund", requestKey: "card-refund", kind: "refund", occurredAt: "2026-07-31T11:00:00+09:00", correctionOf: "cash-sale", grossWon: -5000, amountWon: -5000, discountWon: 0, vatWon: 0, feeWon: 0, expenseWon: 0, incentiveWon: 0, pointsWon: 0, couponWon: 0, profitWon: -5000, details: { paymentMethods: { card: -5000 } } },
    ] as LedgerEntry[];
    const analytics = buildRevenueAnalytics(buildRevenueTransactions(ledger), { view: "month", cursor: "2026-07-31" }, "2026-07-31");

    expect(analytics.payments).toEqual([expect.objectContaining({ name: "현금", amount: 10000, value: 100 })]);
    expect(analytics.payments.every(({ amount, value }) => amount >= 0 && value >= 0 && value <= 100)).toBe(true);
    expect(analytics.settlement.find(({ name }) => name === "환불")).toEqual({ name: "환불", value: -5000 });
    expect(analytics.settlement.find(({ name }) => name === "실결제")).toEqual({ name: "실결제", value: 5000 });
  });
});
