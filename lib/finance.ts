import type { JsonObject, LedgerEntry, SalonStore } from "./salon-domain";

export const PAYMENT_METHODS = [
  { key: "cash", label: "현금" },
  { key: "cashReceipt", label: "현금영수증" },
  { key: "card", label: "카드" },
  { key: "points", label: "포인트" },
  { key: "transfer", label: "계좌이체" },
  { key: "naverPay", label: "N페이" },
  { key: "other", label: "기타" },
  { key: "zeroPay", label: "제로페이" },
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number]["key"];
export type PaymentAmounts = Partial<Record<PaymentMethod, number>>;
export type PaymentTotals = {
  gross: number;
  discount: number;
  points: number;
  netPaid: number;
  vat: number;
  fee: number;
  expense: number;
  shopProfit: number;
};

export type PaymentInput = {
  gross: number;
  discount: number;
  points: number;
  vatMode: "included" | "separate";
  cardFeeRateBps: number;
  expense: number;
  payments: PaymentAmounts;
};

function assertWon(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label}은 0원 이상의 정수여야 합니다.`);
}

export function calculatePayment(input: PaymentInput): PaymentTotals {
  assertWon(input.gross, "총 금액");
  assertWon(input.discount, "할인");
  assertWon(input.points, "사용 포인트");
  assertWon(input.expense, "지출");
  if (!Number.isSafeInteger(input.cardFeeRateBps) || input.cardFeeRateBps < 0 || input.cardFeeRateBps > 10000) throw new Error("카드 수수료율을 확인하세요.");

  const taxable = input.gross - input.discount - input.points;
  if (taxable < 0) throw new Error("할인과 포인트는 총 금액을 넘을 수 없습니다.");
  for (const { key, label } of PAYMENT_METHODS) assertWon(input.payments[key] ?? 0, label);

  const vat = Math.round(taxable / (input.vatMode === "included" ? 11 : 10));
  const netPaid = taxable + (input.vatMode === "separate" ? vat : 0);
  const paymentSum = PAYMENT_METHODS.reduce((sum, { key }) => sum + (input.payments[key] ?? 0), 0);
  if (paymentSum !== netPaid) throw new Error(`결제수단 합계는 ${netPaid.toLocaleString("ko-KR")}원이어야 합니다.`);

  const fee = Math.round(((input.payments.card ?? 0) * input.cardFeeRateBps) / 10000);
  return {
    gross: input.gross,
    discount: input.discount,
    points: input.points,
    netPaid,
    vat,
    fee,
    expense: input.expense,
    shopProfit: netPaid - vat - fee - input.expense,
  };
}

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function won(formData: FormData, name: string) {
  const value = text(formData, name) || "0";
  if (!/^\d+$/.test(value)) throw new Error(`${name} 금액을 확인하세요.`);
  const amount = Number(value);
  assertWon(amount, name);
  return amount;
}

function cardFeeRateBps(formData: FormData) {
  const value = text(formData, "cardFeeRate") || "0";
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error("카드 수수료율을 확인하세요.");
  return Math.round(Number(value) * 100);
}

function occurredAt(formData: FormData) {
  const date = text(formData, "occurredDate");
  const time = text(formData, "occurredTime");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error("결제 날짜와 시간을 확인하세요.");
  const result = new Date(`${date}T${time}:00+09:00`);
  if (Number.isNaN(result.valueOf())) throw new Error("결제 날짜와 시간을 확인하세요.");
  return result.toISOString();
}

function note(formData: FormData, name: string) {
  const value = text(formData, name);
  if (value.length > 150) throw new Error("메모는 150자 이하로 입력하세요.");
  return value;
}

function paymentAmounts(formData: FormData) {
  return Object.fromEntries(PAYMENT_METHODS.map(({ key }) => [key, won(formData, `payment_${key}`)])) as Record<PaymentMethod, number>;
}

function customerValue(store: SalonStore, customerId: string) {
  const customer = store.get<JsonObject>("customers", customerId);
  if (!customer) throw new Error("결제 고객을 확인하세요.");
  return customer.value;
}

export function recordPayment(store: SalonStore, formData: FormData) {
  const requestKey = text(formData, "requestKey");
  const memberType = text(formData, "memberType");
  const customerId = memberType === "member" ? text(formData, "customerId") : "";
  if (!requestKey) throw new Error("결제 요청 키를 확인하세요.");
  if (memberType !== "member" && memberType !== "non-member") throw new Error("회원 구분을 확인하세요.");
  if (memberType === "member" && !customerId) throw new Error("결제 고객을 확인하세요.");
  const customer = customerId ? customerValue(store, customerId) : null;
  const pointsUsed = won(formData, "pointsUsedWon");
  const pointsEarned = won(formData, "pointsEarnedWon");
  const availablePoints = customer && typeof customer.points === "number" && Number.isSafeInteger(customer.points) ? customer.points : 0;
  if (memberType === "non-member" && (pointsUsed || pointsEarned)) throw new Error("비회원은 포인트를 사용하거나 적립할 수 없습니다.");
  if (pointsUsed > availablePoints) throw new Error("사용 가능한 포인트를 초과했습니다.");

  const serviceMajor = text(formData, "serviceMajor");
  if (!serviceMajor) throw new Error("시술 대분류를 선택하세요.");
  const payments = paymentAmounts(formData);
  const totals = calculatePayment({
    gross: won(formData, "grossWon"),
    discount: won(formData, "discountWon"),
    points: pointsUsed,
    vatMode: text(formData, "vatMode") === "separate" ? "separate" : "included",
    cardFeeRateBps: cardFeeRateBps(formData),
    expense: won(formData, "expenseWon"),
    payments,
  });
  const gender = customer && typeof customer.gender === "string" ? customer.gender : text(formData, "gender") || "unspecified";
  const visitType = customer && typeof customer.visitType === "string" ? customer.visitType : text(formData, "visitType") || "first";
  const details = {
    operator: "원장",
    memberType,
    customerName: customer && typeof customer.name === "string" ? customer.name : text(formData, "nonMemberName") || "비회원",
    serviceMajor,
    serviceDetail: text(formData, "serviceDetail"),
    styleName: text(formData, "styleName"),
    gender,
    visitType,
    vatMode: text(formData, "vatMode") === "separate" ? "separate" : "included",
    paymentMethods: payments,
    pointsUsedWon: pointsUsed,
    pointsEarnedWon: pointsEarned,
    smsRequested: formData.get("smsRequested") === "on",
    generalNote: note(formData, "generalNote"),
    medicineNote: note(formData, "medicineNote"),
    scalpNote: note(formData, "scalpNote"),
    hairNote: note(formData, "hairNote"),
  } satisfies JsonObject;

  return store.appendLedger({
    requestKey,
    kind: "payment",
    occurredAt: occurredAt(formData),
    customerId: customerId || undefined,
    grossWon: totals.gross,
    amountWon: totals.netPaid,
    discountWon: totals.discount,
    vatWon: totals.vat,
    feeWon: totals.fee,
    expenseWon: totals.expense,
    pointsWon: pointsEarned - pointsUsed,
    profitWon: totals.shopProfit,
    details,
  }, "원장");
}

function reversedPaymentMethods(details: JsonObject) {
  const value = details.paymentMethods;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, amount]) => [key, typeof amount === "number" && amount !== 0 ? -amount : 0]));
}

function reversePaymentRecord(store: SalonStore, formData: FormData, kind: "refund" | "correction") {
  const targetId = text(formData, "targetId");
  const requestKey = text(formData, "requestKey");
  const target = store.listLedger().find(({ id }) => id === targetId);
  if (!target || target.kind !== "payment") throw new Error("원본 결제 내역을 확인하세요.");
  if (store.listLedger().some((entry) => entry.correctionOf === target.id && (entry.kind === "refund" || entry.kind === "correction"))) throw new Error("이미 환불 또는 정정된 결제입니다.");
  const reason = note(formData, "reason");
  const negate = (value: number) => value === 0 ? 0 : -value;

  return store.appendLedger({
    requestKey,
    kind,
    correctionOf: target.id,
    customerId: target.customerId ?? undefined,
    grossWon: negate(target.grossWon ?? target.amountWon),
    amountWon: negate(target.amountWon),
    discountWon: negate(target.discountWon ?? 0),
    vatWon: negate(target.vatWon),
    feeWon: negate(target.feeWon),
    expenseWon: negate(target.expenseWon ?? 0),
    incentiveWon: negate(target.incentiveWon),
    pointsWon: negate(target.pointsWon),
    couponWon: negate(target.couponWon),
    profitWon: negate(target.profitWon),
    details: { ...(target.details ?? {}), paymentMethods: reversedPaymentMethods(target.details ?? {}), reversalReason: reason, operator: "원장" },
  }, "원장");
}

export function refundPaymentRecord(store: SalonStore, formData: FormData): LedgerEntry {
  return reversePaymentRecord(store, formData, "refund");
}

export function correctPaymentRecord(store: SalonStore, formData: FormData): LedgerEntry {
  return reversePaymentRecord(store, formData, "correction");
}
