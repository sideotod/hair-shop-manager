import { connection } from "next/server";

import { CustomersPage } from "../../../components/customers/customers-page";
import { createSalonStore } from "../../../lib/salon-store";

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input : "";
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const params = await searchParams;
  const store = createSalonStore();
  try {
    const segment = value(params.segment);
    const selectedCustomerId = value(params.customer);
    // 원장 전량(5,576행)이 필요한 건 매출·최근방문·미방문 분류뿐이다. 그 밖에는 선택 고객 이력만 쓴다.
    // snapshot()은 여기에 더해 감사 이력 6,435행까지 읽어 응답을 690KB로 부풀린다 (A4-3).
    const ledger = segment === "sales" || segment === "recent" || segment === "nonvisit"
      ? store.listLedger()
      : selectedCustomerId ? store.listLedgerByCustomer(selectedCustomerId) : [];
    return <CustomersPage
      bookings={store.list("bookings")}
      customers={store.list("customers")}
      error={value(params.error) || undefined}
      ledger={ledger}
      messages={store.list("messages")}
      mode={value(params.mode)}
      notice={value(params.notice) || undefined}
      page={value(params.page)}
      printLayout={value(params.printLayout)}
      printing={value(params.print) === "1"}
      query={value(params.query)}
      segment={segment}
      segmentValue={value(params.segmentValue)}
      selectedCustomerId={selectedCustomerId}
      salesThreshold={value(params.salesThreshold)}
      searchParams={params}
      settings={store.getSettings()}
      showNew={value(params.new) === "1"}
      showWaiting={value(params.waiting) === "1"}
      today={new Date()}
      waitingCustomers={store.list("waiting-customers")}
    />;
  } finally {
    store.close();
  }
}
