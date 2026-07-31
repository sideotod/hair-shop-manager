import { AppShell } from "../../components/app-shell";
import { PaymentForm } from "../../components/sales/payment-form";
import { RevenueDashboard } from "../../components/sales/revenue-dashboard";
import { parseRevenueSearchParams } from "../../components/sales/revenue-query";
import { buildRevenueAnalytics, buildRevenueTransactions } from "../../lib/revenue-data";
import { createSalonStore } from "../../lib/salon-store";
import { seoulBusinessDate, seoulDate } from "../../lib/seoul-date";

function value(input: string | string[] | undefined) { return typeof input === "string" ? input : ""; }

export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const store = createSalonStore();
  try {
    const snapshot = store.snapshot();
    const customers = snapshot.records.customers ?? [];
    const businessToday = seoulBusinessDate();
    if (value(params.tab) === "payment") {
      const correctionTarget = snapshot.ledger.find(({ id, kind }) => id === value(params.correction) && kind === "payment");
      const customerId = value(params.customer) || correctionTarget?.customerId || undefined;
      const returnTo = `/sales?tab=payment${customerId ? `&customer=${encodeURIComponent(customerId)}` : ""}${correctionTarget ? `&correction=${encodeURIComponent(correctionTarget.id)}` : ""}`;
      return <AppShell activeHref="/sales"><PaymentForm correctionTargetId={correctionTarget?.id} customerId={customerId} customers={customers} error={value(params.error) || undefined} returnTo={returnTo} today={seoulDate()} /></AppShell>;
    }
    const query = parseRevenueSearchParams(params, businessToday);
    return <RevenueDashboard analytics={buildRevenueAnalytics(buildRevenueTransactions(snapshot.ledger, customers), query, businessToday)} query={query} />;
  } finally { store.close(); }
}
