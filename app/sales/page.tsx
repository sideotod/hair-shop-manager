import { RevenueDashboard } from "../../components/sales/revenue-dashboard";
import { parseRevenueSearchParams } from "../../components/sales/revenue-query";
import { buildRevenueAnalytics, filterRevenueTransactions, revenueTransactions } from "../../lib/revenue-data";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseRevenueSearchParams(await searchParams);
  const analytics = buildRevenueAnalytics(filterRevenueTransactions(revenueTransactions, query), query);

  return <RevenueDashboard analytics={analytics} query={query} />;
}
