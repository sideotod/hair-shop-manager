import { describe, expect, it } from "vitest";

import { createRevenueCsv } from "./revenue-csv";

describe("createRevenueCsv", () => {
  it("exports the same daily gross and profit values shown in the dashboard", () => {
    const csv = createRevenueCsv([{ date: "7/30", gross: 4280000, profit: 2780000 }]);

    expect(csv).toContain("날짜,총매출,샵 수익");
    expect(csv).toContain("7/30,4280000,2780000");
  });
});
