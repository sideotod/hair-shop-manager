import { describe, expect, it } from "vitest";

import { calculatePayment, correctPaymentRecord, PAYMENT_METHODS, recordPayment, refundPaymentRecord } from "./finance";
import { createSalonStore } from "./salon-store";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const paymentBase = {
  requestKey: "payment-request-1",
  memberType: "member",
  customerId: "customer-seed-1",
  serviceMajor: "커트",
  serviceDetail: "여성 커트",
  styleName: "레이어드",
  grossWon: "11000",
  discountWon: "0",
  pointsUsedWon: "0",
  pointsEarnedWon: "100",
  expenseWon: "0",
  cardFeeRate: "3",
  vatMode: "included",
  payment_card: "11000",
  occurredDate: "2026-07-31",
  occurredTime: "10:30",
  generalNote: "첫 결제",
  medicineNote: "",
  scalpNote: "",
  hairNote: "건조",
  gender: "female",
  visitType: "repeat",
  smsRequested: "on",
} as const;

describe("calculatePayment", () => {
  it.each(PAYMENT_METHODS.map(({ key }) => key))("accepts the %s payment method", (method) => {
    expect(calculatePayment({
      gross: 11000,
      discount: 0,
      points: 0,
      vatMode: "included",
      cardFeeRateBps: 0,
      expense: 0,
      payments: { [method]: 11000 },
    })).toMatchObject({ gross: 11000, netPaid: 11000, vat: 1000 });
  });

  it("validates split payments and charges the configured fee only on card won", () => {
    expect(calculatePayment({
      gross: 11000,
      discount: 0,
      points: 0,
      vatMode: "included",
      cardFeeRateBps: 300,
      expense: 500,
      payments: { cash: 5000, card: 6000 },
    })).toEqual({ gross: 11000, discount: 0, points: 0, netPaid: 11000, vat: 1000, fee: 180, expense: 500, shopProfit: 9320 });

    expect(() => calculatePayment({
      gross: 11000,
      discount: 0,
      points: 0,
      vatMode: "included",
      cardFeeRateBps: 300,
      expense: 0,
      payments: { cash: 5000, card: 5000 },
    })).toThrow("결제수단 합계");
  });

  it("handles separate VAT after discount and points", () => {
    expect(calculatePayment({
      gross: 10000,
      discount: 1000,
      points: 1000,
      vatMode: "separate",
      cardFeeRateBps: 0,
      expense: 0,
      payments: { transfer: 8800 },
    })).toEqual({ gross: 10000, discount: 1000, points: 1000, netPaid: 8800, vat: 800, fee: 0, expense: 0, shopProfit: 8000 });
  });

  it("rounds card fees to integer won", () => {
    expect(calculatePayment({
      gross: 3333,
      discount: 0,
      points: 0,
      vatMode: "included",
      cardFeeRateBps: 300,
      expense: 0,
      payments: { card: 3333 },
    }).fee).toBe(100);
  });
});

describe("immutable payment records", () => {
  it("rejects a member payment without a selected customer", () => {
    const store = createSalonStore(":memory:");
    try {
      expect(() => recordPayment(store, form({ ...paymentBase, customerId: "" }))).toThrow("결제 고객");
    } finally {
      store.close();
    }
  });

  it("rejects a duplicate request key without duplicating ledger or point state", () => {
    const store = createSalonStore(":memory:");
    try {
      const before = store.listLedger().length;
      const saved = recordPayment(store, form(paymentBase));

      expect(saved).toMatchObject({
        requestKey: "payment-request-1",
        kind: "payment",
        customerId: "customer-seed-1",
        grossWon: 11000,
        amountWon: 11000,
        vatWon: 1000,
        feeWon: 330,
        discountWon: 0,
        expenseWon: 0,
        pointsWon: 100,
        profitWon: 9670,
        details: expect.objectContaining({ operator: "원장", serviceMajor: "커트", smsRequested: true }),
      });
      expect(store.get<{ points?: number }>("customers", "customer-seed-1")?.value.points).toBe(100);

      expect(() => recordPayment(store, form(paymentBase))).toThrow(/requestKey/i);
      expect(store.listLedger()).toHaveLength(before + 1);
      expect(store.get<{ points?: number }>("customers", "customer-seed-1")?.value.points).toBe(100);
    } finally {
      store.close();
    }
  });

  it("uses existing points atomically and records discount, VAT, fees, and expense", () => {
    const store = createSalonStore(":memory:");
    try {
      const customer = store.get<Record<string, string | number>>("customers", "customer-seed-1");
      store.save("customers", "customer-seed-1", { ...customer?.value, points: 500 }, "원장");

      const saved = recordPayment(store, form({
        ...paymentBase,
        requestKey: "payment-points",
        grossWon: "12000",
        discountWon: "1000",
        pointsUsedWon: "500",
        pointsEarnedWon: "100",
        expenseWon: "200",
        payment_card: "10500",
      }));

      expect(saved).toMatchObject({ grossWon: 12000, discountWon: 1000, amountWon: 10500, vatWon: 955, feeWon: 315, expenseWon: 200, pointsWon: -400, profitWon: 9030 });
      expect(store.get<{ points?: number }>("customers", "customer-seed-1")?.value.points).toBe(100);
    } finally {
      store.close();
    }
  });

  it("appends linked refunds and corrections without changing the original row", () => {
    const store = createSalonStore(":memory:");
    try {
      const payment = recordPayment(store, form(paymentBase));
      const original = structuredClone(payment);
      const refund = refundPaymentRecord(store, form({ targetId: payment.id, requestKey: "refund-request-1", reason: "고객 요청" }));

      const second = recordPayment(store, form({ ...paymentBase, requestKey: "payment-request-2", pointsEarnedWon: "0" }));
      const correction = correctPaymentRecord(store, form({ targetId: second.id, requestKey: "correction-request-1", reason: "금액 재등록" }));

      expect(store.listLedger().find(({ id }) => id === payment.id)).toEqual(original);
      expect(refund).toMatchObject({ kind: "refund", correctionOf: payment.id, amountWon: -11000, vatWon: -1000, feeWon: -330, pointsWon: -100, profitWon: -9670 });
      expect(correction).toMatchObject({ kind: "correction", correctionOf: second.id, amountWon: -11000, vatWon: -1000, feeWon: -330, profitWon: -9670 });
      expect(() => refundPaymentRecord(store, form({ targetId: payment.id, requestKey: "refund-request-2" }))).toThrow("이미 환불 또는 정정");
    } finally {
      store.close();
    }
  });
});
