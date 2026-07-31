import type { JsonObject, JsonValue, LedgerEntry } from "./salon-domain";
import type { RevenueAnalytics, RevenueTransaction } from "../components/sales/revenue-analytics";
import { revenueRange, type RevenueQuery } from "../components/sales/revenue-query";
import { seoulBusinessDate } from "./seoul-date";

const paymentLabels = {
  cash: "현금", cashReceipt: "현금영수증", card: "카드", points: "포인트", transfer: "계좌이체", naverPay: "N페이", other: "기타", zeroPay: "제로페이", prepaid: "선불권",
} as const;
const colors = ["#5c344f", "#b77d8f", "#5b806d", "#b27a38", "#687078", "#8d7183", "#b84a4a", "#5b6770"];
const sum = <T>(items: readonly T[], get: (item: T) => number) => items.reduce((total, item) => total + get(item), 0);
const dateLabel = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const detailText = (details: JsonObject, key: string, fallback: string) => typeof details[key] === "string" ? details[key] : fallback;
const detailMethods = (details: JsonObject) => details.paymentMethods && typeof details.paymentMethods === "object" && !Array.isArray(details.paymentMethods) ? details.paymentMethods as JsonObject : {};
const customerName = (customer: { id: string; value: JsonValue }) => { const value = customer.value; return value && typeof value === "object" && !Array.isArray(value) && typeof (value as JsonObject).name === "string" ? (value as JsonObject).name as string : customer.id; };
const paymentAmounts = (details: JsonObject) => Object.freeze(Object.fromEntries(Object.entries(detailMethods(details)).filter(([, amount]) => typeof amount === "number" && amount !== 0).map(([method, amount]) => [paymentLabels[method as keyof typeof paymentLabels] ?? method, amount as number])));
const pointsUsed = (entry: LedgerEntry) => typeof entry.details.pointsUsedWon === "number" ? entry.details.pointsUsedWon : entry.pointsWon < 0 ? -entry.pointsWon : 0;

export function buildRevenueTransactions(ledger: readonly LedgerEntry[], customers: readonly { id: string; value: JsonValue }[] = []) {
  const customerNames = new Map(customers.map((customer) => [customer.id, customerName(customer)]));
  return Object.freeze(ledger.map((entry) => Object.freeze({
    id: entry.id,
    date: seoulBusinessDate(entry.occurredAt),
    dateLabel: dateLabel(seoulBusinessDate(entry.occurredAt)),
    customerIdentifier: entry.customerId ? customerNames.get(entry.customerId) ?? entry.customerId : detailText(entry.details ?? {}, "customerName", "비회원"),
    service: detailText(entry.details ?? {}, "serviceMajor", "기타"),
    payment: Object.keys(paymentAmounts(entry.details ?? {})).join(" · ") || "기타",
    paymentAmounts: paymentAmounts(entry.details ?? {}),
    gross: entry.grossWon ?? entry.amountWon,
    netPaid: entry.amountWon,
    profit: entry.profitWon,
    discount: entry.discountWon,
    points: pointsUsed(entry),
    vat: entry.vatWon,
    fee: entry.feeWon,
    expense: entry.expenseWon,
    status: entry.kind === "refund" ? "환불" : entry.kind === "correction" ? "정정" : "결제",
    gender: detailText(entry.details ?? {}, "gender", "미지정") === "female" ? "여성" : detailText(entry.details ?? {}, "gender", "미지정") === "male" ? "남성" : "미지정",
    visitType: detailText(entry.details ?? {}, "visitType", "first") === "repeat" ? "재방문" : "신규",
  } satisfies RevenueTransaction)));
}

export function filterRevenueTransactions(records: readonly RevenueTransaction[], query: RevenueQuery) {
  const range = revenueRange(query);
  return Object.freeze(records.filter((record) => record.date >= range.start && record.date <= range.end));
}

export type RevenueSelection = { kind: "date" | "payment" | "service" | "gender" | "visitType"; key: string };
export function filterRevenueSelection(records: readonly RevenueTransaction[], selection: RevenueSelection | null) {
  if (!selection) return records;
  if (selection.kind === "date") return records.filter((record) => record.dateLabel === selection.key);
  if (selection.kind === "payment") return records.filter((record) => record.payment.split(" · ").includes(selection.key));
  if (selection.kind === "service") return records.filter((record) => record.service === selection.key);
  if (selection.kind === "gender") return records.filter((record) => record.gender === selection.key);
  return records.filter((record) => record.visitType === selection.key);
}

function amounts(records: readonly RevenueTransaction[], key: "service" | "gender" | "visitType") {
  return Object.freeze([...new Set(records.map((record) => record[key]))].map((name) => Object.freeze({ name, sales: sum(records.filter((record) => record[key] === name), (record) => record.gross) })).sort((a, b) => b.sales - a.sales));
}

function paymentRevenue(records: readonly RevenueTransaction[]) {
  const values = new Map<string, number>();
  for (const record of records) for (const [name, amount] of Object.entries(record.paymentAmounts)) values.set(name, (values.get(name) ?? 0) + amount);
  const total = [...values.values()].reduce((sum, amount) => sum + amount, 0);
  return Object.freeze([...values].map(([name, amount], index) => Object.freeze({ name, amount, value: total ? Math.round((amount / total) * 100) : 0, color: colors[index % colors.length] })).sort((a, b) => b.amount - a.amount));
}

export function buildRevenueAnalytics(allRecords: readonly RevenueTransaction[], query: RevenueQuery, today = seoulBusinessDate()): RevenueAnalytics {
  const transactions = filterRevenueTransactions(allRecords, query);
  const day = filterRevenueTransactions(allRecords, { view: "day", cursor: today });
  const month = filterRevenueTransactions(allRecords, { view: "month", cursor: today });
  const dates = [...new Set(transactions.map((record) => record.date))].sort();
  const gross = sum(transactions, (record) => record.gross);
  const discount = sum(transactions, (record) => record.discount);
  const points = sum(transactions, (record) => record.points);
  const paid = sum(transactions, (record) => record.netPaid);
  const vat = sum(transactions, (record) => record.vat);
  const fee = sum(transactions, (record) => record.fee);
  const expense = sum(transactions, (record) => record.expense);
  const range = revenueRange(query);
  return Object.freeze({
    selectedPeriod: range,
    totals: Object.freeze({ today: sum(day, (record) => record.gross), month: sum(month, (record) => record.gross), total: sum(allRecords, (record) => record.gross) }),
    trend: Object.freeze(dates.map((date) => Object.freeze({ date: dateLabel(date), gross: sum(transactions.filter((record) => record.date === date), (record) => record.gross), profit: sum(transactions.filter((record) => record.date === date), (record) => record.profit) }))),
    services: amounts(transactions, "service"),
    payments: paymentRevenue(transactions),
    genders: amounts(transactions, "gender"),
    visitTypes: amounts(transactions, "visitType"),
    settlement: Object.freeze([
      { name: "총 시술금액", value: gross }, { name: "할인", value: discount }, { name: "포인트 사용", value: points }, { name: "실결제", value: paid }, { name: "VAT", value: vat }, { name: "결제 수수료", value: fee }, { name: "지출", value: expense }, { name: "샵 수익", value: sum(transactions, (record) => record.profit) },
    ].map((row) => Object.freeze(row))),
    transactions,
  });
}
