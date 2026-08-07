import { randomUUID } from "node:crypto";

import { connection } from "next/server";

import { OperationsPage } from "../../../components/operations/operations-page";
import { isCalendarDate } from "../../../lib/operations";
import { createSalonStore } from "../../../lib/salon-store";

function value(input: string | string[] | undefined) { return typeof input === "string" ? input : ""; }
function tab(input: string): "services" | "memos" | "expenses" { return input === "memos" || input === "expenses" ? input : "services"; }
function date(input: string, fallback: string) { return isCalendarDate(input) ? input : fallback; }

export default async function OperationsRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const params = await searchParams; const store = createSalonStore();
  try {
    const activeTab = tab(value(params.tab));
    const start = date(value(params.start), "0000-01-01");
    const end = date(value(params.end), "9999-12-31");
    const period = start <= end ? { start, end } : { start: end, end: start };
    // 원장을 읽는 탭은 지출·정산 하나뿐이고, 그마저 선택 기간만 쓴다.
    // snapshot()은 전체 원장 5,576행 + 감사 이력 6,435행을 매 요청 읽는다 (A4-3).
    // occurred_at은 `2026-01-01T09:00:00.000Z` 꼴이라 시각 자리는 항상 `T00`..`T23`이다. `T99`가 그날의 상한.
    const ledger = activeTab === "expenses" ? store.listLedgerRange(period.start, `${period.end}T99`) : [];
    return <OperationsPage activeTab={activeTab} catalog={store.list("catalog-items")} correctionId={value(params.correction)} customers={store.list("customers")} editCatalogId={value(params.edit)} error={value(params.error) || undefined} expenses={store.list("expense-presets")} ledger={ledger} period={period} print={value(params.print) === "1"} requestKey={randomUUID()} settings={store.getSettings()} />;
  }
  finally { store.close(); }
}
