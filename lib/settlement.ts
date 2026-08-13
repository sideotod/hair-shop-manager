/**
 * 결제 금액 파생 — **서버·화면이 함께 쓰는 단 하나의 공식.**
 *
 * `lib/finance.ts` 는 `node:crypto` 를 부르므로 클라이언트 번들에 들어갈 수 없다.
 * 그래서 화면이 필요로 하는 두 가지(결제수단 목록, 금액 파생)만 여기로 내린다.
 * `finance.ts` 는 이 파일을 다시 내보내므로 기존 import 경로는 그대로 산다.
 *
 * **복제 금지.** 화면이 이 함수를 부르지 않고 같은 산식을 다시 적으면
 * "화면 합계는 맞는데 저장은 실패"가 된다 — `finance.ts:57-58` 이 서버 값과
 * 정확히 일치할 것을 요구하기 때문이다. 화면은 계산하지 않는다. 같은 함수를 부를 뿐이다.
 */
export const PAYMENT_METHODS = [
  { key: "cash", label: "현금" },
  { key: "cashReceipt", label: "현금영수증" },
  { key: "card", label: "카드" },
  { key: "points", label: "포인트" },
  { key: "transfer", label: "계좌이체" },
  { key: "naverPay", label: "N페이" },
  { key: "other", label: "기타" },
  { key: "zeroPay", label: "제로페이" },
  { key: "prepaid", label: "선불권" },
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number]["key"];
export type PaymentAmounts = Partial<Record<PaymentMethod, number>>;
export type VatMode = "included" | "separate";

/**
 * 과세표준 · 부가세 · 실결제액. `calculatePayment()` 의 `:50,54,55` 를 그대로 옮긴 것이다.
 * 검증은 하지 않는다 — 음수 `taxable` 도 그대로 돌려준다. 던지는 쪽은 서버(`finance.ts:51`),
 * 경고하는 쪽은 화면이라 역할이 다르다.
 */
export function settleAmounts(gross: number, discount: number, points: number, vatMode: VatMode) {
  const taxable = gross - discount - points;
  const vat = Math.round(taxable / (vatMode === "included" ? 11 : 10));
  return { taxable, vat, netPaid: taxable + (vatMode === "separate" ? vat : 0) };
}
