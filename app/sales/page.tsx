import { AppShell } from "../../components/app-shell";
import { OperationsPage } from "../../components/operations/operations-page";
import { PaymentForm } from "../../components/sales/payment-form";
import { RevenueDashboard } from "../../components/sales/revenue-dashboard";
import { parseRevenueSearchParams, serializeRevenueQuery } from "../../components/sales/revenue-query";
import { SalesControls } from "../../components/sales/sales-controls";
import { buildRevenueAnalytics, buildRevenueTransactions } from "../../lib/revenue-data";
import { createSalonStore } from "../../lib/salon-store";
import { seoulBusinessDate, seoulDate } from "../../lib/seoul-date";
import { revenueRange } from "../../components/sales/revenue-query";

function value(input: string | string[] | undefined) { return typeof input === "string" ? input : ""; }

export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const store = createSalonStore();
  try {
    const snapshot = store.snapshot();
    const customers = snapshot.records.customers ?? [];
    const businessToday = seoulBusinessDate();
    const query = parseRevenueSearchParams(params, businessToday);
    const analysisHref = `/sales?${serializeRevenueQuery(query)}`;
    if (value(params.tab) === "expenses") return <OperationsPage activeTab="expenses" catalog={snapshot.records["catalog-items"] ?? []} correctionId={value(params.correction)} customers={customers} error={value(params.error) || undefined} expenses={snapshot.records["expense-presets"] ?? []} ledger={snapshot.ledger} salesContext salesQuery={query} settings={{ ...snapshot.settings, salesWorkspace: { query, tab: "expenses" } }} />;
    if (value(params.tab) === "payment") {
      const correctionTarget = snapshot.ledger.find(({ id, kind }) => id === value(params.correction) && kind === "payment");
      const customerId = value(params.customer) || correctionTarget?.customerId || undefined;
      const returnTo = `/sales?tab=payment&${serializeRevenueQuery(query)}${customerId ? `&customer=${encodeURIComponent(customerId)}` : ""}${correctionTarget ? `&correction=${encodeURIComponent(correctionTarget.id)}` : ""}`;
      return <AppShell activeHref="/sales" settings={snapshot.settings}><main className="min-w-0 px-10 pb-16 pt-9"><SalesControls label={revenueRange(query).label} query={query} tab="payment" /><section className="mt-5"><PaymentForm backTo={analysisHref} correctionTargetId={correctionTarget?.id} customerId={customerId} customers={customers} error={value(params.error) || undefined} returnTo={returnTo} settings={snapshot.settings} today={seoulDate()} /></section></main></AppShell>;
    }
    return <RevenueDashboard analytics={buildRevenueAnalytics(buildRevenueTransactions(snapshot.ledger, customers), query, businessToday)} query={query} settings={snapshot.settings} />;
  } finally { store.close(); }
}
