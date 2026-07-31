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
      const correction = correctPaymentRecord(store, form({ ...paymentBase, targetId: second.id, requestKey: "correction-request-1", pointsEarnedWon: "0", reason: "금액 재등록" }));

      expect(store.listLedger().find(({ id }) => id === payment.id)).toEqual(original);
      expect(refund).toMatchObject({ kind: "refund", correctionOf: payment.id, amountWon: -11000, vatWon: -1000, feeWon: -330, pointsWon: -100, profitWon: -9670 });
      expect(correction[0]).toMatchObject({ kind: "correction", correctionOf: second.id, amountWon: -11000, vatWon: -1000, feeWon: -330, profitWon: -9670 });
      expect(correction[1]).toMatchObject({ kind: "payment", correctionOf: second.id, amountWon: 11000, vatWon: 1000, feeWon: 330, profitWon: 9670 });
      expect(() => refundPaymentRecord(store, form({ targetId: payment.id, requestKey: "refund-request-2" }))).toThrow("이미 환불 또는 정정");
    } finally {
      store.close();
    }
  });

  it("creates a correction as an atomic reversal and corrected replacement", () => {
    const store = createSalonStore(":memory:");
    try {
      const original = recordPayment(store, form(paymentBase));
      const beforeInvalidCorrection = store.listLedger();

      expect(() => correctPaymentRecord(store, form({ ...paymentBase, targetId: original.id, requestKey: "correction-invalid", payment_card: "10000", reason: "금액 정정" }))).toThrow("결제수단 합계");
      expect(store.listLedger()).toEqual(beforeInvalidCorrection);

      const correction = correctPaymentRecord(store, form({ ...paymentBase, targetId: original.id, requestKey: "correction-valid", grossWon: "12000", payment_card: "12000", reason: "금액 정정" }));
      expect(Array.isArray(correction)).toBe(true);
      const history = store.listLedger().filter((entry) => entry.correctionOf === original.id);
      expect(history).toHaveLength(2);
      expect(history).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "correction", amountWon: -11000, details: expect.objectContaining({ correctionRole: "reversal", correctionReason: "금액 정정" }) }),
        expect.objectContaining({ kind: "payment", amountWon: 12000, details: expect.objectContaining({ correctionRole: "replacement", correctionReason: "금액 정정" }) }),
      ]));
    } finally {
      store.close();
    }
  });

  it("keeps spendable points nonnegative, carries refund debt, and repays it before future earnings", () => {
    const store = createSalonStore(":memory:");
    try {
      const awarded = recordPayment(store, form({ ...paymentBase, requestKey: "award-points", pointsEarnedWon: "100" }));
      recordPayment(store, form({ ...paymentBase, requestKey: "spend-points", pointsEarnedWon: "0", pointsUsedWon: "100", payment_card: "10900" }));
      refundPaymentRecord(store, form({ targetId: awarded.id, requestKey: "refund-award-points", reason: "환불" }));

      expect(store.get<{ points?: number; pointDebtWon?: number }>("customers", "customer-seed-1")?.value).toMatchObject({ points: 0, pointDebtWon: 100 });
      expect(() => recordPayment(store, form({ ...paymentBase, requestKey: "spend-debt", pointsEarnedWon: "0", pointsUsedWon: "1", payment_card: "10999" }))).toThrow("사용 가능한 포인트");

      recordPayment(store, form({ ...paymentBase, requestKey: "repay-point-debt", pointsEarnedWon: "120" }));
      expect(store.get<{ points?: number; pointDebtWon?: number }>("customers", "customer-seed-1")?.value).toMatchObject({ points: 20, pointDebtWon: 0 });
    } finally {
      store.close();
    }
  });

  it("records point debt when a correction revokes points that were already spent", () => {
    const store = createSalonStore(":memory:");
    try {
      const awarded = recordPayment(store, form({ ...paymentBase, requestKey: "correction-award", pointsEarnedWon: "100" }));
      recordPayment(store, form({ ...paymentBase, requestKey: "correction-spend", pointsEarnedWon: "0", pointsUsedWon: "100", payment_card: "10900" }));
      correctPaymentRecord(store, form({ ...paymentBase, targetId: awarded.id, requestKey: "correction-revoke", pointsEarnedWon: "0", reason: "적립 정정" }));

      expect(store.get<{ points?: number; pointDebtWon?: number }>("customers", "customer-seed-1")?.value).toMatchObject({ points: 0, pointDebtWon: 100 });
    } finally {
      store.close();
    }
  });
});
