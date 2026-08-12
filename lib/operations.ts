import { randomUUID } from "node:crypto";

import type { JsonObject, LedgerEntry, LedgerInput, SalonStore } from "./salon-domain";
import { seoulInstant } from "./seoul-date";

const actor = "원장" as const;
const text = (data: FormData, key: string) => typeof data.get(key) === "string" ? (data.get(key) as string).trim() : "";
const won = (data: FormData, key: string) => {
  const value = text(data, key) || "0";
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`${key} 금액을 확인하세요.`);
  return Number(value);
};
const object = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
const string = (value: JsonObject, key: string) => typeof value[key] === "string" ? value[key] : "";
const number = (value: JsonObject, key: string) => typeof value[key] === "number" && Number.isSafeInteger(value[key]) ? value[key] : 0;
export function isCalendarDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; }
function occurredAt(data: FormData) {
  const date = text(data, "occurredDate"); const time = text(data, "occurredTime");
  if (!isCalendarDate(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("거래 날짜와 시간을 확인하세요.");
  return seoulInstant(date, time);
}
function original(store: SalonStore, id: string) {
  const entry = store.listLedger().find((item) => item.id === id && item.kind === "expense");
  if (!entry) throw new Error("원본 지출 내역을 확인하세요.");
  if (store.listLedger().some((item) => item.correctionOf === entry.id && (item.kind === "refund" || item.kind === "correction"))) throw new Error("이미 환불 또는 정정된 내역입니다.");
  return entry;
}
function reversal(entry: LedgerEntry, requestKey: string, reason: string, id: string, at: string): LedgerInput {
  const inverse = (amount: number) => amount === 0 ? 0 : -amount;
  return { id, requestKey, kind: "correction", occurredAt: at, correctionOf: entry.id, grossWon: inverse(entry.grossWon), amountWon: inverse(entry.amountWon), discountWon: inverse(entry.discountWon), vatWon: inverse(entry.vatWon), feeWon: inverse(entry.feeWon), expenseWon: inverse(entry.expenseWon), incentiveWon: inverse(entry.incentiveWon), pointsWon: inverse(entry.pointsWon), couponWon: inverse(entry.couponWon), profitWon: inverse(entry.profitWon), details: { ...entry.details, operator: actor, correctionRole: "reversal", correctionReason: reason } };
}
function expenseInput(store: SalonStore, data: FormData, correction?: { targetId: string; reversalId: string; reason: string }, fallbackName = ""): LedgerInput {
  const preset = text(data, "presetId") ? store.get("expense-presets", text(data, "presetId")) : null;
  const requestKey = text(data, "requestKey"); if (!requestKey) throw new Error("지출 요청 키를 확인하세요.");
  const amount = text(data, "amountWon") ? won(data, "amountWon") : preset ? number(object(preset.value), "defaultWon") : 0; if (!amount) throw new Error("지출 금액을 입력하세요.");
  const expenseName = text(data, "expenseName") || (preset ? string(object(preset.value), "name") : fallbackName);
  if (!expenseName) throw new Error("지출 항목명을 입력하세요.");
  return { requestKey, kind: "expense", occurredAt: occurredAt(data), correctionOf: correction?.targetId, amountWon: -amount, expenseWon: amount, profitWon: -amount, details: { operator: actor, presetId: text(data, "presetId"), expenseName, memo: text(data, "memo"), ...(correction ? { correctionRole: "replacement", correctionReason: correction.reason, reversalEntryId: correction.reversalId } : {}) } };
}

export function recordExpense(store: SalonStore, data: FormData) { return store.appendLedger(expenseInput(store, data), actor); }
export function correctExpenseRecord(store: SalonStore, data: FormData) {
  const target = original(store, text(data, "targetId")); const requestKey = text(data, "requestKey");
  if (!requestKey) throw new Error("지출 요청 키를 확인하세요.");
  const reversalId = randomUUID(); const replacement = expenseInput(store, data, { targetId: target.id, reversalId, reason: text(data, "reason") }, string(target.details, "expenseName"));
  return store.appendLedgerBatch([reversal(target, `${requestKey}:reversal`, text(data, "reason"), reversalId, replacement.occurredAt ?? target.occurredAt), replacement], actor);
}
export function saveCatalogItemRecord(store: SalonStore, data: FormData) {
  const type = text(data, "type"); const name = text(data, "name");
  if (type !== "service-major" && type !== "service-detail") throw new Error("시술 분류를 확인하세요.");
  if (!name) throw new Error("항목명을 입력하세요.");
  if (type === "service-detail" && !text(data, "category")) throw new Error("시술 대분류를 선택하세요.");
  return store.save("catalog-items", text(data, "catalogId") || `catalog-${randomUUID()}`, { type, category: text(data, "category"), name, priceWon: won(data, "priceWon"), operator: actor }, actor);
}
export function savePresetRecord(store: SalonStore, data: FormData) {
  const presetType = text(data, "presetType");
  if (presetType === "expense") { const name = text(data, "name"); if (!name) throw new Error("지출 항목명을 입력하세요."); return store.save("expense-presets", text(data, "presetId") || `expense-preset-${randomUUID()}`, { name, defaultWon: won(data, "defaultWon"), operator: actor }, actor); }
  if (!["scalpStates", "hairTraits", "selectedMemos", "gifts", "quickMemos"].includes(presetType)) throw new Error("설정 값을 확인하세요.");
  const values = text(data, "values").split(",").map((value) => value.trim()).filter(Boolean);
  if (!values.length || values.some((value) => value.length > 50)) throw new Error("설정 값을 확인하세요.");
  return store.saveSettings({ [presetType]: values.join(", ") }, actor);
}
export function ledgerSettlement(ledger: readonly LedgerEntry[]) {
  const sum = (field: keyof Pick<LedgerEntry, "grossWon" | "amountWon" | "vatWon" | "feeWon" | "expenseWon" | "profitWon">) => ledger.reduce((total, entry) => total + entry[field], 0);
  return Object.freeze({ grossWon: sum("grossWon"), amountWon: sum("amountWon"), vatWon: sum("vatWon"), feeWon: sum("feeWon"), expenseWon: sum("expenseWon"), profitWon: sum("profitWon") });
}
