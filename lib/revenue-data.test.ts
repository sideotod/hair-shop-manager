import { describe, expect, it } from "vitest";

import { buildRevenueAnalytics, buildRevenueTransactions, filterRevenueSelection, filterRevenueTransactions } from "./revenue-data";
import { createSalonStore } from "./salon-store";

describe("server revenue aggregate", () => {
  it("builds every KPI, chart, table, CSV source, and transaction row from the same immutable ledger", () => {
    const store = createSalonStore(":memory:");
    try {
      const snapshot = store.snapshot();
      const transactions = buildRevenueTransactions(snapshot.ledger, snapshot.records.customers ?? []);
      const analytics = buildRevenueAnalytics(transactions, { view: "month", cursor: "2026-07-31" }, "2026-07-31");

      expect(transactions).toHaveLength(4);
      expect(Object.isFrozen(transactions)).toBe(true);
      expect(transactions.every(Object.isFrozen)).toBe(true);
      expect(transactions[0]).toMatchObject({ id: "ledger-seed-1", status: "결제", date: "2026-07-24", service: "컬러", payment: "카드", gross: 10480000, profit: 6080000 });
      expect(transactions.every((row) => !("staff" in row))).toBe(true);

      expect(analytics.totals).toEqual({ today: 0, month: 29960000, total: 29960000 });
      expect(analytics.trend[0]).toEqual({ date: "7/24", gross: 10480000, profit: 6080000 });
      expect(analytics.services[0]).toEqual({ name: "컬러", sales: 10480000 });
      expect(analytics.payments.map(({ name, amount, value }) => ({ name, amount, value }))).toEqual([
        { name: "카드", amount: 10480000, value: 35 },
        { name: "현금", amount: 8640000, value: 29 },
        { name: "선불권", amount: 6120000, value: 20 },
        { name: "기타", amount: 4720000, value: 16 },
      ]);
      expect(analytics.genders).toEqual([{ name: "여성", sales: 16600000 }, { name: "남성", sales: 13360000 }]);
      expect(analytics.visitTypes).toEqual([{ name: "재방문", sales: 21320000 }, { name: "신규", sales: 8640000 }]);
      expect(analytics.settlement).toEqual([
        { name: "총 시술금액", value: 29960000 },
        { name: "할인", value: 0 },
        { name: "포인트 사용", value: 0 },
        { name: "실결제", value: 29960000 },
        { name: "VAT", value: 2720000 },
        { name: "결제 수수료", value: 910000 },
        { name: "지출", value: 8940000 },
        { name: "샵 수익", value: 17390000 },
      ]);
      expect(analytics.transactions).toEqual(transactions);
      expect(analytics.trend.reduce((sum, row) => sum + row.gross, 0)).toBe(analytics.transactions.reduce((sum, row) => sum + row.gross, 0));
      expect(analytics.settlement.at(-1)?.value).toBe(analytics.transactions.reduce((sum, row) => sum + row.profit, 0));
    } finally {
      store.close();
    }
  });

  it("keeps today/month/total cards visible while the selected day has no data", () => {
    const store = createSalonStore(":memory:");
    try {
      const snapshot = store.snapshot();
      const transactions = buildRevenueTransactions(snapshot.ledger, snapshot.records.customers ?? []);
      const analytics = buildRevenueAnalytics(transactions, { view: "day", cursor: "2026-07-31" }, "2026-07-31");

      expect(analytics.totals).toEqual({ today: 0, month: 29960000, total: 29960000 });
      expect(analytics.transactions).toEqual([]);
      expect(analytics.trend).toEqual([]);
      expect(analytics.services).toEqual([]);
      expect(analytics.payments).toEqual([]);
      expect(analytics.genders).toEqual([]);
      expect(analytics.visitTypes).toEqual([]);
      expect(analytics.settlement.every(({ value }) => value === 0)).toBe(true);
    } finally {
      store.close();
    }
  });

  it("filters day, month, total, and accessible chart selections without staff filters", () => {
    const store = createSalonStore(":memory:");
    try {
      const snapshot = store.snapshot();
      const transactions = buildRevenueTransactions(snapshot.ledger, snapshot.records.customers ?? []);

      expect(filterRevenueTransactions(transactions, { view: "day", cursor: "2026-07-25" })).toHaveLength(1);
      expect(filterRevenueTransactions(transactions, { view: "month", cursor: "2026-07-31" })).toHaveLength(4);
      expect(filterRevenueTransactions(transactions, { view: "total", cursor: "2026-07-31" })).toHaveLength(4);
      expect(filterRevenueSelection(transactions, { kind: "payment", key: "현금" })).toHaveLength(1);
      expect(filterRevenueSelection(transactions, { kind: "gender", key: "여성" })).toHaveLength(2);
      expect(filterRevenueSelection(transactions, { kind: "visitType", key: "신규" })).toHaveLength(1);
    } finally {
      store.close();
    }
  });
});
