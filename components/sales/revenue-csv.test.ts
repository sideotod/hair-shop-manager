import { expect, it } from "vitest";

import { createRevenueCsv } from "./revenue-csv";

it("exports the same transaction aggregate used by the revenue table", () => {
  expect(createRevenueCsv([{ id: "ledger-1", date: "2026-07-31", dateLabel: "7/31", customerIdentifier: "김하늘", service: "커트", payment: "카드", status: "결제", gross: 11000, netPaid: 11000, profit: 9670, discount: 0, points: 0, vat: 1000, fee: 330, expense: 0, gender: "여성", visitType: "재방문" }])).toContain("ledger-1,2026-07-31,김하늘,커트,카드,결제,11000,11000,9670");
});
