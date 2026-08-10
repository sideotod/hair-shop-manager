import { describe, expect, it } from "vitest";

import { calculatePayment } from "./finance";
import { PAYMENT_METHODS, settleAmounts, type PaymentMethod } from "./settlement";

/**
 * 화면(`payment-amounts.tsx`)이 만든 결제수단 값이 서버 검증 4개를 **항상** 통과하는지.
 *
 * 화면은 계산하지 않고 `settleAmounts()` 를 부르지만, 그 결과를 8칸에 **분배**하는 로직은
 * 화면에만 있다. 분배가 틀리면 `finance.ts:57-58` 이 거절한다 — 그러면 화면이 보여준
 * "실결제 47,000원"과 저장 실패가 동시에 일어난다. 정확히 그걸 없애려던 것이므로 여기서 막는다.
 */
const derive = (gross: number, discount: number, points: number, vatMode: "included" | "separate", primary: PaymentMethod, splits: Partial<Record<PaymentMethod, number>> = {}) => {
  const { netPaid } = settleAmounts(gross, discount, points, vatMode);
  const assigned = PAYMENT_METHODS.reduce((sum, { key }) => key === "points" || key === primary ? sum : sum + (splits[key] ?? 0), 0);
  return Object.fromEntries(PAYMENT_METHODS.map(({ key }) => [key, key === "points" ? points : key === primary ? Math.max(netPaid - assigned, 0) : splits[key] ?? 0])) as Record<PaymentMethod, number>;
};

describe("payment-amounts 파생값", () => {
  it.each([
    ["단일 현금", 50000, 0, 0, "included" as const, "cash" as const, {}],
    ["카드 + 포인트", 50000, 0, 3000, "included" as const, "card" as const, {}],
    ["할인 + 분할", 50000, 5000, 3000, "included" as const, "card" as const, { cash: 7000 }],
    ["VAT 별도", 10000, 0, 0, "separate" as const, "transfer" as const, {}],
    ["잔액 정확히 소진", 50000, 0, 0, "included" as const, "card" as const, { cash: 50000 }],
  ])("%s 은 서버 검증을 통과한다", (_label, gross, discount, points, vatMode, primary, splits) => {
    const payments = derive(gross, discount, points, vatMode, primary, splits);
    expect(() => calculatePayment({ gross, discount, points, vatMode, cardFeeRateBps: 0, expense: 0, payments })).not.toThrow();
    expect(calculatePayment({ gross, discount, points, vatMode, cardFeeRateBps: 0, expense: 0, payments }).netPaid)
      .toBe(settleAmounts(gross, discount, points, vatMode).netPaid);
  });

  it("분할이 실결제액을 넘으면 서버가 거절한다 — 화면은 이 경우를 경고로 먼저 막는다", () => {
    const payments = derive(50000, 0, 3000, "included", "card", { cash: 99000 });
    expect(() => calculatePayment({ gross: 50000, discount: 0, points: 3000, vatMode: "included", cardFeeRateBps: 0, expense: 0, payments }))
      .toThrow("결제수단 합계는 47,000원이어야 합니다.");
  });
});
