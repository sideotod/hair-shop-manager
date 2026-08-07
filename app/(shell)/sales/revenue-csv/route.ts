import { createRevenueCsv } from "../../../../components/sales/revenue-csv";
import { parseRevenueSearchParams, revenueRange, revenueRangeExclusive } from "../../../../components/sales/revenue-query";
import { buildRevenueTransactions, filterRevenueTransactions } from "../../../../lib/revenue-data";
import { createSalonStore } from "../../../../lib/salon-store";
import { seoulBusinessDate } from "../../../../lib/seoul-date";

/**
 * CSV 내보내기 (§14 — 화면과 같은 기간·같은 원장을 읽는다).
 * data: URL로 만들면 누적 기간에서 문서에 1MB 가까이 실린다. 파일은 서버가 만든다.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseRevenueSearchParams(params, seoulBusinessDate());
  const store = createSalonStore();
  try {
    const period = revenueRangeExclusive(query, store.ledgerBounds());
    const rows = filterRevenueTransactions(
      buildRevenueTransactions(store.listLedgerRange(period.start, period.endExclusive), store.list("customers")),
      query,
    );
    const { start, end } = revenueRange(query);
    return new Response(`﻿${createRevenueCsv(rows)}`, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="hairhaeyo-revenue-${start}_${end}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } finally {
    store.close();
  }
}
