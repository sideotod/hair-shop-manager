import { describe, expect, it } from "vitest";

import { correctExpenseRecord, ledgerSettlement, recordExpense, saveCatalogItemRecord } from "./operations";
import { createSalonStore } from "./salon-store";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("expense ledger", () => {
  it("appends immutable reversal and replacement entries for a correction", () => {
    const store = createSalonStore(":memory:");
    try {
      const original = recordExpense(store, form({ requestKey: "expense-1", expenseName: "임대료", amountWon: "35000", occurredDate: "2026-07-31", occurredTime: "09:30", memo: "7월" }));
      const before = { ...original };

      const [reversal, replacement] = correctExpenseRecord(store, form({ requestKey: "expense-correction-1", targetId: original.id, expenseName: "임대료", amountWon: "42000", occurredDate: "2026-07-31", occurredTime: "10:00", reason: "금액 정정" }));

      expect(store.listLedger().find(({ id }) => id === original.id)).toMatchObject(before);
      expect(reversal).toMatchObject({ kind: "correction", correctionOf: original.id, amountWon: 35000, expenseWon: -35000, profitWon: 35000 });
      expect(replacement).toMatchObject({ kind: "expense", correctionOf: original.id, amountWon: -42000, expenseWon: 42000, profitWon: -42000 });
      expect(ledgerSettlement([original, reversal, replacement])).toMatchObject({ amountWon: -42000, expenseWon: 42000, profitWon: -42000 });
      expect(() => correctExpenseRecord(store, form({ requestKey: "expense-correction-2", targetId: original.id, expenseName: "임대료", amountWon: "1", occurredDate: "2026-07-31", occurredTime: "10:01" }))).toThrow("이미 환불 또는 정정된 내역");
    } finally { store.close(); }
  });

  it("uses an expense preset's server-owned default amount", () => {
    const store = createSalonStore(":memory:");
    try {
      store.save("expense-presets", "rent", { name: "임대료", defaultWon: 500000 }, "원장");
      expect(recordExpense(store, form({ requestKey: "expense-preset", presetId: "rent", occurredDate: "2026-07-31", occurredTime: "09:30" }))).toMatchObject({ amountWon: -500000, expenseWon: 500000, details: { expenseName: "임대료" } });
    } finally { store.close(); }
  });

  it("rejects rollover calendar dates before appending an expense", () => {
    const store = createSalonStore(":memory:");
    try {
      expect(() => recordExpense(store, form({ requestKey: "expense-invalid-date", expenseName: "임대료", amountWon: "1", occurredDate: "2026-02-30", occurredTime: "09:30" }))).toThrow("거래 날짜와 시간을 확인하세요.");
      expect(store.listLedger().some((entry) => entry.requestKey === "expense-invalid-date")).toBe(false);
    } finally { store.close(); }
  });

  it("updates an existing service catalog item by its catalog id", () => {
    const store = createSalonStore(":memory:");
    try {
      saveCatalogItemRecord(store, form({ catalogId: "service-detail", type: "service-detail", category: "커트", name: "여성 커트", priceWon: "25000" }));
      saveCatalogItemRecord(store, form({ catalogId: "service-detail", type: "service-detail", category: "커트", name: "여성 디자인 커트", priceWon: "30000" }));
      expect(store.get("catalog-items", "service-detail")?.value).toMatchObject({ name: "여성 디자인 커트", priceWon: 30000 });
    } finally { store.close(); }
  });
});
