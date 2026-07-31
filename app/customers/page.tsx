import { connection } from "next/server";

import { CustomersPage } from "../../components/customers/customers-page";
import { createSalonStore } from "../../lib/salon-store";

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input : "";
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const params = await searchParams;
  const store = createSalonStore();
  try {
    const snapshot = store.snapshot();
    return <CustomersPage
      bookings={snapshot.records.bookings ?? []}
      customers={snapshot.records.customers ?? []}
      ledger={snapshot.ledger}
      messages={snapshot.records.messages ?? []}
      mode={value(params.mode)}
      coupons={snapshot.records["customer-coupons"] ?? []}
      printLayout={value(params.printLayout)}
      products={snapshot.records["product-sales"] ?? []}
      query={value(params.query)}
      segment={value(params.segment)}
      segmentValue={value(params.segmentValue)}
      selectedCustomerId={value(params.customer)}
      salesThreshold={value(params.salesThreshold)}
      settings={snapshot.settings}
      showNew={value(params.new) === "1"}
      showWaiting={value(params.waiting) === "1"}
      waitingCustomers={snapshot.records["waiting-customers"] ?? []}
    />;
  } finally {
    store.close();
  }
}
