import { AppShell } from "../../components/app-shell";
import { PaymentForm } from "../../components/sales/payment-form";
import { RevenueDashboard } from "../../components/sales/revenue-dashboard";
import { parseRevenueSearchParams } from "../../components/sales/revenue-query";
import { buildRevenueAnalytics, buildRevenueTransactions } from "../../lib/revenue-data";
import { createSalonStore } from "../../lib/salon-store";

function value(input: string | string[] | undefined) { return typeof input === "string" ? input : ""; }

export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const store = createSalonStore();
  try {
    const snapshot = store.snapshot();
    const customers = snapshot.records.customers ?? [];
    if (value(params.tab) === "payment") return <AppShell activeHref="/sales"><PaymentForm customerId={value(params.customer) || undefined} customers={customers} /></AppShell>;
    const query = parseRevenueSearchParams(params);
    return <RevenueDashboard analytics={buildRevenueAnalytics(buildRevenueTransactions(snapshot.ledger, customers), query, "2026-07-31")} query={query} />;
  } finally { store.close(); }
}
