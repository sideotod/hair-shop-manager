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
  try { const snapshot = store.snapshot(); const start = date(value(params.start), "0000-01-01"); const end = date(value(params.end), "9999-12-31"); return <OperationsPage activeTab={tab(value(params.tab))} catalog={snapshot.records["catalog-items"] ?? []} correctionId={value(params.correction)} customers={snapshot.records.customers ?? []} editCatalogId={value(params.edit)} error={value(params.error) || undefined} expenses={snapshot.records["expense-presets"] ?? []} ledger={snapshot.ledger} period={start <= end ? { start, end } : { start: end, end: start }} print={value(params.print) === "1"} settings={snapshot.settings} />; }
  finally { store.close(); }
}
