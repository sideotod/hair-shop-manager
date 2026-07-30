import { describe, expect, it } from "vitest";

import { buildRevenueAnalytics, filterRevenueTransactions, revenueAnalytics, revenueTransactions } from "./revenue-data";
import type { RevenueQuery } from "../components/sales/revenue-query";

describe("server revenue data", () => {
  it("expands immutable individual records and preserves every aggregate exactly", () => {
    expect(revenueTransactions).toHaveLength(246);
    expect(Object.isFrozen(revenueTransactions)).toBe(true);
    expect(revenueTransactions.every(Object.isFrozen)).toBe(true);
    expect(revenueTransactions[0]).toMatchObject({
      id: "TX-20260724-001",
      customerIdentifier: "C-0724-001",
      gross: 69867,
      profit: 40533,
      service: "컬러",
      staff: "서윤",
      payment: "카드",
    });

    expect(revenueTransactions.reduce((sum, row) => sum + row.gross, 0)).toBe(29960000);
    expect(revenueTransactions.reduce((sum, row) => sum + row.profit, 0)).toBe(17390000);
    expect(revenueTransactions.filter((row) => row.date === "2026-07-24")).toHaveLength(150);
    expect(revenueTransactions.filter((row) => row.payment === "현금")).toHaveLength(42);
    expect(revenueTransactions.filter((row) => row.service === "클리닉").reduce((sum, row) => sum + row.gross, 0)).toBe(6120000);
    expect(revenueTransactions.filter((row) => row.staff === "민아").reduce((sum, row) => sum + row.profit, 0)).toBe(2750000);
    expect(revenueTransactions.flatMap((row) => row.deductions).filter((item) => item.name === "환불").reduce((sum, item) => sum + item.value, 0)).toBe(820000);
    expect(revenueTransactions.every((row) => row.gross - row.deductions.reduce((sum, item) => sum + item.value, 0) === row.profit)).toBe(true);

    expect(revenueAnalytics.daily[0]).toEqual({ date: "7/24", gross: 10480000, profit: 6080000 });
    expect(revenueAnalytics.payments.map(({ name, value, count }) => ({ name, value, count }))).toEqual([
      { name: "카드", value: 61, count: 150 },
      { name: "현금", value: 17, count: 42 },
      { name: "선불권", value: 14, count: 34 },
      { name: "기타", value: 8, count: 20 },
    ]);
    expect(revenueAnalytics.metrics[0]?.[1]).toBe("₩29,960,000");
    expect(revenueAnalytics.metrics[1]?.[1]).toBe("₩17,390,000");
    expect(revenueAnalytics.metrics[2]?.[1]).toBe("246건");

    for (const item of revenueAnalytics.daily) {
      const rows = revenueTransactions.filter((record) => record.dateLabel === item.date);
      expect(rows.reduce((sum, record) => sum + record.gross, 0)).toBe(item.gross);
      expect(rows.reduce((sum, record) => sum + record.profit, 0)).toBe(item.profit);
    }
    for (const item of revenueAnalytics.services) {
      expect(revenueTransactions.filter((record) => record.service === item.name).reduce((sum, record) => sum + record.gross, 0)).toBe(item.sales);
    }
    for (const item of revenueAnalytics.staff) {
      const rows = revenueTransactions.filter((record) => record.staff === item.name);
      expect(rows.reduce((sum, record) => sum + record.gross, 0)).toBe(item.sales);
      expect(rows.reduce((sum, record) => sum + record.profit, 0)).toBe(item.profit);
    }
    for (const item of revenueAnalytics.deductions.slice(1, -1)) {
      expect(revenueTransactions.flatMap((record) => record.deductions).filter((deduction) => deduction.name === item.name).reduce((sum, deduction) => sum + deduction.value, 0)).toBe(item.value);
    }
  });

  it("filters records and rebuilds every aggregate from the filtered subset", () => {
    const query: RevenueQuery = { preset: "week", start: "2026-07-25", end: "2026-07-25", compare: false, staff: "harin", service: "perm", payment: "cash" };
    const records = filterRevenueTransactions(revenueTransactions, query);
    const analytics = buildRevenueAnalytics(records, query);

    expect(records).toHaveLength(42);
    expect(analytics.selectedPeriod).toEqual({ start: "2026-07-25", end: "2026-07-25", label: "2026년 7월 25일" });
    expect(analytics.metrics[0]?.[1]).toBe("₩8,640,000");
    expect(analytics.metrics[1]?.[1]).toBe("₩5,010,000");
    expect(analytics.metrics[2]?.[1]).toBe("42건");
    expect(analytics.daily).toEqual([{ date: "7/25", gross: 8640000, profit: 5010000 }]);
    expect(analytics.payments.find((item) => item.name === "현금")).toMatchObject({ value: 100, count: 42 });
    expect(analytics.services.find((item) => item.name === "펌")?.sales).toBe(8640000);
    expect(analytics.staff.find((item) => item.name === "하린")).toMatchObject({ sales: 8640000, profit: 5010000 });
  });
});
