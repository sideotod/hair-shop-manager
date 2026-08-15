import { randomUUID } from "node:crypto";

import Link from "next/link";

import { closeHref, paymentReturnTo, toSearchParams } from "../../lib/navigation";
import type { JsonObject, JsonValue, LedgerEntry, SalonRecord } from "../../lib/salon-domain";
import { seoulClock, seoulClockOrEmpty } from "../../lib/seoul-date";
import { button } from "../button";
import { ModalHost } from "../modal-host";
import { typeScale } from "../type";
import { PaymentRegistrationDialog } from "./payment-registration-dialog";

const value = (input: string | string[] | undefined) => typeof input === "string" ? input : "";
const field = (record: { value: JsonValue } | null | undefined, key: string) => {
  const source = record?.value && typeof record.value === "object" && !Array.isArray(record.value) ? record.value as JsonObject : {};
  return typeof source[key] === "string" ? source[key] : "";
};

/** 각 진입 화면 위에 같은 09A~09H 모달을 얹는다. 닫기는 오직 `pay` 관련 키만 지운다. */
export function PaymentRegistrationModal({ bookings, catalog, customers, ledger, pathname, searchParams, settings }: {
  bookings: readonly SalonRecord<JsonValue>[]; catalog: readonly SalonRecord<JsonValue>[]; customers: readonly SalonRecord<JsonValue>[]; ledger: readonly LedgerEntry[]; pathname: string; searchParams: Record<string, string | string[] | undefined>; settings: JsonObject;
}) {
  const params = toSearchParams(searchParams);
  const firstVisitPayment = value(searchParams.firstVisitPayment);
  const firstVisitEntry = firstVisitPayment ? ledger.find((entry) => entry.id === firstVisitPayment && entry.kind === "payment" && !entry.customerId) : undefined;
  // 결제 화면에서는 목록을 가로막지 않는다. 저장이 끝난 뒤 원래 화면 위에서만 다음 행동을 묻는다.
  if (firstVisitEntry && value(searchParams.new) !== "1") {
    const close = closeHref(pathname, params, "firstVisitPayment", "notice");
    return <PostPaymentCustomerPrompt closeHref={close} paymentId={firstVisitEntry.id} />;
  }
  // 이전 즐겨찾기(`/sales?tab=payment`)도 페이지가 아니라 같은 모달을 연다.
  if (value(searchParams.pay) !== "1" && value(searchParams.tab) !== "payment") return null;
  const booking = value(searchParams.booking) ? bookings.find(({ id }) => id === value(searchParams.booking)) : undefined;
  const correction = value(searchParams.correction) ? ledger.find((entry) => entry.id === value(searchParams.correction) && entry.kind === "payment") : undefined;
  const customerId = field(booking, "customerId") || value(searchParams.customer) || correction?.customerId || undefined;
  const endsAt = seoulClockOrEmpty(field(booking, "endsAt"));
  const at = endsAt.date ? endsAt : seoulClock(new Date());
  const close = closeHref(pathname, params, "pay", "tab", "booking", "customer", "correction", "error", "notice", "returnTo");
  const returnTo = paymentReturnTo(value(searchParams.returnTo), close);
  const customerName = customerId ? field(customers.find(({ id }) => id === customerId), "name") : "";
  return <PaymentRegistrationDialog booking={booking ? { id: booking.id, date: at.date, time: at.time, customerName } : undefined} catalog={catalog} closeHref={close} correctionTargetId={correction?.id} customerId={customerId} customers={customers} defaultDate={at.date} defaultTime={at.time} error={value(searchParams.error) || undefined} notice={value(searchParams.notice) || undefined} requestKey={randomUUID()} returnTo={returnTo} serviceDetail={field(booking, "service")} serviceMajor={typeof correction?.details.serviceMajor === "string" ? correction.details.serviceMajor : undefined} settings={settings} />;
}

/** 미등록 고객의 결제는 이미 기록한 다음에만 등록 여부를 묻는다. */
function PostPaymentCustomerPrompt({ closeHref, paymentId }: { closeHref: string; paymentId: string }) {
  return <ModalHost label="목록에 없는 고객"><section aria-label="목록에 없는 고객" aria-modal="true" className="w-[380px] rounded-[var(--radius-card)] bg-[var(--surface)] p-5 shadow-[0_24px_64px_rgb(13_20_18/24%)]" data-dialog-panel role="dialog">
    <h2 className={typeScale.title}>목록에 없는 고객이에요</h2>
    <p className="mt-3 text-[13px] leading-5 text-[var(--muted)]">결제는 비회원으로 등록했습니다. 다음 방문을 위해 고객으로 등록할까요?</p>
    <div className="mt-5 grid grid-cols-2 gap-2"><Link className={button("md", "secondary")} data-dialog-close href={closeHref}>비회원으로 처리</Link><Link className={button("md", "primary")} href={`/customers?new=1&firstVisitPayment=${encodeURIComponent(paymentId)}`}>고객 등록</Link></div>
  </section></ModalHost>;
}
