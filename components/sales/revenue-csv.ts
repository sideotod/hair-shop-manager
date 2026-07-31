import type { RevenueTransaction } from "./revenue-analytics";

export function createRevenueCsv(rows: readonly RevenueTransaction[]) {
  return ["거래 ID,날짜,고객,시술,결제수단,상태,총 시술금액,실결제,샵 수익", ...rows.map((row) => [row.id, row.date, row.customerIdentifier, row.service, row.payment, row.status, row.gross, row.netPaid, row.profit].join(","))].join("\n");
}
