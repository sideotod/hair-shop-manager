import { randomUUID } from "node:crypto";

import { connection } from "next/server";

import { CustomersPage } from "../../../components/customers/customers-page";
import { PaymentRegistrationModal } from "../../../components/sales/payment-registration-modal";
import { createSalonStore } from "../../../lib/salon-store";
import { seoulClock } from "../../../lib/seoul-date";

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input : "";
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const params = await searchParams;
  const store = createSalonStore();
  try {
    const selectedCustomerId = value(params.customer);
    const payCustomerId = value(params.pay);
    const firstVisitPayment = value(params.firstVisitPayment);
    const allLedger = store.listLedger();
    const firstVisitEntry = firstVisitPayment ? allLedger.find((entry) => entry.id === firstVisitPayment && entry.kind === "payment" && !entry.customerId) : undefined;
    const firstVisitName = typeof firstVisitEntry?.details.customerName === "string" ? firstVisitEntry.details.customerName : "";
    // 선택 고객 이력만 읽는다. 원장 전량(5,576행)이나 snapshot()(감사 6,435행 포함)은 여기서 필요 없다.
    // 최근 방문일 정렬은 고객당 1행짜리 집계로 따로 받는다.
    const ledger = selectedCustomerId ? store.listLedgerByCustomer(selectedCustomerId) : [];
    // `requestKey` 와 같은 이유로 시각도 요청당 1회다. 렌더 중 `new Date()` 를 부르면
    // 같은 요청의 재렌더마다 폼 기본값이 달라진다. 분은 반올림하지 않는다 — 실제 결제 시각이다.
    const now = seoulClock(new Date());
    return <><PaymentRegistrationModal bookings={store.list("bookings")} catalog={store.list("catalog-items")} customers={store.list("customers")} ledger={allLedger} pathname="/customers" searchParams={params} settings={store.getSettings()} /><CustomersPage
      bookings={store.list("bookings")}
      catalog={store.list("catalog-items")}
      customers={store.list("customers")}
      defaultDate={now.date}
      defaultTime={now.time}
      editCustomerId={value(params.edit) || undefined}
      error={value(params.error) || undefined}
      lastVisits={value(params.sort) === "visit" ? store.lastVisitByCustomer() : undefined}
      ledger={ledger}
      messages={store.list("messages")}
      notice={value(params.notice) || undefined}
      newCustomerName={firstVisitName || undefined}
      page={value(params.page)}
      payCustomerId={payCustomerId || undefined}
      query={value(params.query)}
      // `requestKey` 는 요청당 1회. 렌더 중에 만들면 재렌더마다 값이 달라져 멱등성 키의 의미가 사라진다.
      requestKey={randomUUID()}
      searchParams={params}
      selectedCustomerId={selectedCustomerId}
      settings={store.getSettings()}
      showNew={value(params.new) === "1"}
      showPrepaid={value(params.prepaid) === "1"}
      sort={value(params.sort) || "name"}
      tab={value(params.tab) || "profile"}
    /></>;
  } finally {
    store.close();
  }
}
