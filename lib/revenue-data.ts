import type { JsonObject, JsonValue, LedgerEntry } from "./salon-domain";
import type { RevenueAnalytics, RevenueTransaction } from "../components/sales/revenue-analytics";
import { revenueRange, type RevenueQuery } from "../components/sales/revenue-query";
import { seoulBusinessDate } from "./seoul-date";

const paymentLabels = {
  cash: "현금", cashReceipt: "현금영수증", card: "카드", points: "포인트", transfer: "계좌이체", naverPay: "N페이", other: "기타", zeroPay: "제로페이", prepaid: "선불권",
} as const;
const sum = <T>(items: readonly T[], get: (item: T) => number) => items.reduce((total, item) => total + get(item), 0);
const dateLabel = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const detailText = (details: JsonObject, key: string, fallback: string) => typeof details[key] === "string" ? details[key] : fallback;
const detailMethods = (details: JsonObject) => details.paymentMethods && typeof details.paymentMethods === "object" && !Array.isArray(details.paymentMethods) ? details.paymentMethods as JsonObject : {};
const customerName = (customer: { id: string; value: JsonValue }) => { const value = customer.value; return value && typeof value === "object" && !Array.isArray(value) && typeof (value as JsonObject).name === "string" ? (value as JsonObject).name as string : customer.id; };
const paymentAmounts = (details: JsonObject) => Object.freeze(Object.fromEntries(Object.entries(detailMethods(details)).filter(([, amount]) => typeof amount === "number" && amount !== 0).map(([method, amount]) => [paymentLabels[method as keyof typeof paymentLabels] ?? method, amount as number])));
const pointsUsed = (entry: LedgerEntry) => typeof entry.details.pointsUsedWon === "number" ? entry.details.pointsUsedWon : entry.pointsWon < 0 ? -entry.pointsWon : 0;

export function buildRevenueTransactions(ledger: readonly LedgerEntry[], customers: readonly { id: string; value: JsonValue }[] = []) {
  const customerNames = new Map(customers.map((customer) => [customer.id, customerName(customer)]));
  // 포인트 조정은 돈이 오간 거래가 아니다(금액칸 전부 0). 여기 남기면 `:35` 의 기본값을 타고
  // ₩0 짜리 "결제" 행으로 거래 기록과 CSV 에 유령처럼 찍힌다. 포인트 이력은 고객 상세가 보여준다.
  return Object.freeze(ledger.filter((entry) => entry.kind !== "point-adjust").map((entry) => Object.freeze({
    id: entry.id,
    date: seoulBusinessDate(entry.occurredAt),
    dateLabel: dateLabel(seoulBusinessDate(entry.occurredAt)),
    customerIdentifier: entry.customerId ? customerNames.get(entry.customerId) ?? entry.customerId : detailText(entry.details ?? {}, "customerName", "비회원"),
    service: entry.kind === "expense" ? detailText(entry.details ?? {}, "expenseName", "지출") : detailText(entry.details ?? {}, "serviceMajor", "기타"),
    payment: entry.kind === "expense" ? "지출" : Object.keys(paymentAmounts(entry.details ?? {})).join(" · ") || "기타",
    paymentAmounts: paymentAmounts(entry.details ?? {}),
    gross: entry.grossWon ?? entry.amountWon,
    netPaid: entry.amountWon,
    profit: entry.profitWon,
    discount: entry.discountWon,
    points: pointsUsed(entry),
    vat: entry.vatWon,
    fee: entry.feeWon,
    expense: entry.expenseWon,
    status: entry.kind === "refund" ? "환불" : entry.kind === "correction" ? "정정" : entry.kind === "expense" ? "지출" : "결제",
    gender: detailText(entry.details ?? {}, "gender", "미지정") === "female" ? "여성" : detailText(entry.details ?? {}, "gender", "미지정") === "male" ? "남성" : "미지정",
    visitType: detailText(entry.details ?? {}, "visitType", "first") === "repeat" ? "재방문" : "신규",
  } satisfies RevenueTransaction)));
}

export function filterRevenueTransactions(records: readonly RevenueTransaction[], query: RevenueQuery) {
  const range = revenueRange(query);
  return Object.freeze(records.filter((record) => record.date >= range.start && record.date <= range.end));
}

export type RevenueSelection = { kind: "date" | "payment" | "service"; key: string };
export function filterRevenueSelection(records: readonly RevenueTransaction[], selection: RevenueSelection | null) {
  if (!selection) return records;
  if (selection.kind === "date") return records.filter((record) => record.dateLabel === selection.key);
  if (selection.kind === "payment") return records.filter((record) => record.payment.split(" · ").includes(selection.key));
  return records.filter((record) => record.service === selection.key);
}

function amounts(records: readonly RevenueTransaction[], key: "service") {
  const grouped = new Map<string, { name: string; sales: number; count: number }>();
  for (const record of records) {
    const row = grouped.get(record[key]) ?? { name: record[key], sales: 0, count: 0 };
    row.sales += record.gross;
    row.count += 1;
    grouped.set(record[key], row);
  }
  return Object.freeze([...grouped.values()].map((row) => Object.freeze(row)).sort((a, b) => b.sales - a.sales));
}

function paymentRevenue(records: readonly RevenueTransaction[]) {
  const values = new Map<string, number>();
  for (const record of records) for (const [name, amount] of Object.entries(record.paymentAmounts)) if (amount > 0) values.set(name, (values.get(name) ?? 0) + amount);
  const total = [...values.values()].reduce((sum, amount) => sum + amount, 0);
  return Object.freeze([...values].map(([name, amount]) => Object.freeze({ name, amount, value: total ? Math.round((amount / total) * 100) : 0 })).sort((a, b) => b.amount - a.amount));
}

export function buildRevenueAnalytics(allRecords: readonly RevenueTransaction[], query: RevenueQuery, today = seoulBusinessDate()): RevenueAnalytics {
  const transactions = filterRevenueTransactions(allRecords, query);
  const day = filterRevenueTransactions(allRecords, { view: "day", cursor: today });
  const month = filterRevenueTransactions(allRecords, { view: "month", cursor: today });
  // 날짜별 합계는 한 번만 훑는다. 날짜마다 전체를 filter 하면 누적 기간에서 1,662일 × 5,576행이 된다 (D8).
  const byDate = new Map<string, { gross: number; profit: number }>();
  for (const record of transactions) {
    const row = byDate.get(record.date) ?? { gross: 0, profit: 0 };
    row.gross += record.gross;
    row.profit += record.profit;
    byDate.set(record.date, row);
  }
  const dates = [...byDate.keys()].sort();
  const gross = sum(transactions, (record) => record.gross);
  const discount = sum(transactions, (record) => record.discount);
  const points = sum(transactions, (record) => record.points);
  const paid = sum(transactions.filter((record) => record.status !== "지출"), (record) => record.netPaid);
  const vat = sum(transactions, (record) => record.vat);
  const fee = sum(transactions, (record) => record.fee);
  const expense = sum(transactions, (record) => record.expense);
  const refunds = sum(transactions.filter((record) => record.status === "환불"), (record) => record.netPaid);
  const range = revenueRange(query);
  return Object.freeze({
    selectedPeriod: range,
    totals: Object.freeze({ today: sum(day, (record) => record.gross), month: sum(month, (record) => record.gross), total: sum(allRecords, (record) => record.gross) }),
    trend: Object.freeze(dates.map((date) => Object.freeze({ date: dateLabel(date), gross: byDate.get(date)!.gross, profit: byDate.get(date)!.profit }))),
    services: amounts(transactions, "service"),
    payments: paymentRevenue(transactions),
    settlement: Object.freeze([
      { name: "총 매출", value: gross }, { name: "할인", value: discount }, { name: "포인트 사용", value: points }, { name: "실결제", value: paid }, { name: "환불", value: refunds }, { name: "VAT", value: vat }, { name: "결제 수수료", value: fee }, { name: "지출", value: expense }, { name: "샵 수익", value: sum(transactions, (record) => record.profit) },
    ].map((row) => Object.freeze(row))),
    transactions,
  });
}
