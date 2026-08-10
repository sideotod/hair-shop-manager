import { randomUUID } from "node:crypto";

import type { JsonObject, LedgerEntry, LedgerInput, SalonStore } from "./salon-domain";
import { PAYMENT_METHODS, settleAmounts, type PaymentAmounts, type PaymentMethod, type VatMode } from "./settlement";

// 결제수단 목록과 금액 파생은 `lib/settlement.ts` 에 산다 — 화면도 같은 것을 써야 하는데
// 이 파일은 `node:crypto` 때문에 클라이언트 번들에 들어갈 수 없다. 여기서 다시 내보내
// 기존 import 경로(`lib/finance`)를 그대로 유지한다.
export { PAYMENT_METHODS, settleAmounts } from "./settlement";
export type { PaymentAmounts, PaymentMethod, VatMode } from "./settlement";

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
  vatMode: VatMode;
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

  const { taxable, vat, netPaid } = settleAmounts(input.gross, input.discount, input.points, input.vatMode);
  if (taxable < 0) throw new Error("할인과 포인트는 총 금액을 넘을 수 없습니다.");
  for (const { key, label } of PAYMENT_METHODS) assertWon(input.payments[key] ?? 0, label);

  if ((input.payments.points ?? 0) !== input.points) throw new Error("포인트 결제수단과 사용 포인트가 일치해야 합니다.");
  const paymentSum = PAYMENT_METHODS.filter(({ key }) => key !== "points").reduce((sum, { key }) => sum + (input.payments[key] ?? 0), 0);
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

function paymentLedgerInput(store: SalonStore, formData: FormData, correction?: { correctionOf: string; correctionReason: string; reversalEntryId: string }): LedgerInput {
  const requestKey = text(formData, "requestKey");
  const memberType = text(formData, "memberType");
  const customerId = memberType === "member" ? text(formData, "customerId") : "";
  if (!requestKey) throw new Error("결제 요청 키를 확인하세요.");
  if (memberType !== "member" && memberType !== "non-member") throw new Error("회원 구분을 확인하세요.");
  if (memberType === "member" && !customerId) throw new Error("결제 고객을 확인하세요.");
  const customer = customerId ? customerValue(store, customerId) : null;
  const pointsUsed = won(formData, "pointsUsedWon");
  const pointsEarned = won(formData, "pointsEarnedWon");
  const pointsTender = won(formData, "payment_points");
  const availablePoints = customer && typeof customer.points === "number" && Number.isSafeInteger(customer.points) ? customer.points : 0;
  if (memberType === "non-member" && (pointsUsed || pointsEarned || pointsTender)) throw new Error("비회원은 포인트를 사용하거나 적립할 수 없습니다.");
  if (!correction && pointsUsed > availablePoints) throw new Error("사용 가능한 포인트를 초과했습니다.");

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
    ...(correction ? { correctionRole: "replacement", correctionReason: correction.correctionReason, reversalEntryId: correction.reversalEntryId } : {}),
  } satisfies JsonObject;

  return {
    requestKey,
    kind: "payment",
    occurredAt: occurredAt(formData),
    correctionOf: correction?.correctionOf,
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
  };
}

export function recordPayment(store: SalonStore, formData: FormData) {
  return store.appendLedger(paymentLedgerInput(store, formData), "원장");
}

function reversedPaymentMethods(details: JsonObject) {
  const value = details.paymentMethods;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, amount]) => [key, typeof amount === "number" && amount !== 0 ? -amount : 0]));
}

function originalPayment(store: SalonStore, formData: FormData) {
  const targetId = text(formData, "targetId");
  const target = store.listLedger().find(({ id }) => id === targetId);
  if (!target || target.kind !== "payment") throw new Error("원본 결제 내역을 확인하세요.");
  if (store.listLedger().some((entry) => entry.correctionOf === target.id && (entry.kind === "refund" || entry.kind === "correction"))) throw new Error("이미 환불 또는 정정된 결제입니다.");
  return target;
}

function detailAmount(details: JsonObject, key: "pointsUsedWon" | "pointsEarnedWon", fallback: number) {
  return typeof details[key] === "number" ? details[key] : fallback;
}

function reversalLedgerInput(target: LedgerEntry, requestKey: string, reason: string, kind: "refund" | "correction", id?: string, occurredAt?: string): LedgerInput {
  const negate = (value: number) => value === 0 ? 0 : -value;
  const pointsUsedWon = detailAmount(target.details, "pointsUsedWon", target.pointsWon < 0 ? -target.pointsWon : 0);
  const pointsEarnedWon = detailAmount(target.details, "pointsEarnedWon", target.pointsWon > 0 ? target.pointsWon : 0);
  return {
    id,
    requestKey,
    kind,
    occurredAt,
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
    details: {
      ...(target.details ?? {}), paymentMethods: reversedPaymentMethods(target.details ?? {}), pointsUsedWon: negate(pointsUsedWon), pointsEarnedWon: negate(pointsEarnedWon), correctionRole: "reversal", correctionReason: reason, operator: "원장",
    },
  };
}

export function refundPaymentRecord(store: SalonStore, formData: FormData): LedgerEntry {
  const target = originalPayment(store, formData);
  const requestKey = text(formData, "requestKey");
  if (!requestKey) throw new Error("결제 요청 키를 확인하세요.");
  return store.appendLedger(reversalLedgerInput(target, requestKey, note(formData, "reason"), "refund"), "원장");
}

export function correctPaymentRecord(store: SalonStore, formData: FormData): readonly [LedgerEntry, LedgerEntry] {
  const target = originalPayment(store, formData);
  const requestKey = text(formData, "requestKey");
  const reason = note(formData, "reason");
  if (!requestKey) throw new Error("결제 요청 키를 확인하세요.");
  const reversalEntryId = randomUUID();
  const replacement = paymentLedgerInput(store, formData, { correctionOf: target.id, correctionReason: reason, reversalEntryId });
  const entries = store.appendLedgerBatch([
    reversalLedgerInput(target, `${requestKey}:reversal`, reason, "correction", reversalEntryId, replacement.occurredAt),
    replacement,
  ], "원장");
  return entries as readonly [LedgerEntry, LedgerEntry];
}
