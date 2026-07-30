type RevenueRow = { date: string; gross: number; profit: number };

export function createRevenueCsv(rows: ReadonlyArray<RevenueRow>) {
  return ["날짜,총매출,샵 수익", ...rows.map((row) => `${row.date},${row.gross},${row.profit}`)].join("\n");
}
