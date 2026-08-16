"use client";

import Link from "next/link";
import { useState } from "react";

import { correctPayment, savePayment } from "../../app/payment-actions";
import { serviceMajorOptions } from "../../lib/operations";
import type {
  JsonObject,
  JsonValue,
  SalonRecord,
} from "../../lib/salon-domain";
import { button, control } from "../button";
import { ModalHost } from "../modal-host";
import { ActionForm, NoticeBanner, SubmitButton } from "../submit-button";
import { PaymentAmounts } from "./payment-amounts";
import { PaymentCustomer, PaymentCustomerScope } from "./payment-customer";
import type { DuplicateEntry } from "../customers/customer-form";

type Customer = { id: string; value: JsonValue };
type Booking = { id: string; date: string; time: string; customerName: string };
const field = `${control} h-9 w-full`;
const label = "grid gap-1 text-[12px] font-medium text-[var(--muted)]";
const record = (customer: Customer) =>
  customer.value &&
  typeof customer.value === "object" &&
  !Array.isArray(customer.value)
    ? (customer.value as JsonObject)
    : {};
const text = (customer: Customer, key: string) =>
  typeof record(customer)[key] === "string"
    ? (record(customer)[key] as string)
    : "";

/** Figma 09A~09H. 시각만 닮긴 외피가 아니라 기존의 불변 결제 저장 흐름을 그대로 품는다. */
export function PaymentRegistrationDialog({
  booking,
  catalog = [],
  closeHref,
  correctionTargetId,
  customerId,
  customers,
  defaultDate,
  defaultTime,
  error,
  notice,
  requestKey,
  returnTo = closeHref,
  serviceDetail,
  serviceMajor,
  settings,
}: {
  booking?: Booking;
  catalog?: readonly SalonRecord<JsonValue>[];
  closeHref: string;
  correctionTargetId?: string;
  customerId?: string;
  customers: readonly Customer[];
  defaultDate: string;
  defaultTime: string;
  error?: string;
  notice?: string;
  requestKey: string;
  returnTo?: string;
  serviceDetail?: string;
  serviceMajor?: string;
  settings: JsonObject;
}) {
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);
  const fixedCustomer = customerId
    ? customers.find((customer) => customer.id === customerId)
    : undefined;
  const points = Object.fromEntries(
    customers.map((customer) => [
      customer.id,
      typeof record(customer).points === "number"
        ? (record(customer).points as number)
        : 0,
    ]),
  );
  const index: readonly DuplicateEntry[] = customers.map(
    (customer) =>
      [
        customer.id,
        text(customer, "name"),
        text(customer, "gender"),
        text(customer, "phone"),
        text(customer, "joinedAt"),
        text(customer, "memo"),
      ] as const,
  );
  const majors = serviceMajorOptions(catalog, serviceMajor);
  const [selectedMajor, setSelectedMajor] = useState(serviceMajor || majors[0]);
  const cardFeeRate =
    typeof settings.cardFeeRate === "number" ? settings.cardFeeRate : 0;
  const pointEarnRate =
    typeof settings.pointEarnRate === "number" && settings.pointEarnRate >= 0
      ? settings.pointEarnRate
      : 1;
  const fixed = fixedCustomer
    ? { customerId: fixedCustomer.id, points: points[fixedCustomer.id] ?? 0 }
    : undefined;

  return (
    <ModalHost label="결제 등록">
      <section
        aria-label="결제 등록"
        aria-modal="true"
        className="dialog-scroll relative !w-fit min-w-[860px] h-[601px] overflow-visible bg-[var(--surface)] px-6 py-5 shadow-[0_24px_64px_rgb(13_20_18/24%)]"
        data-dialog-panel
        data-payment-registration-dialog
        role="dialog"
      >
        <header className="flex h-9 items-center">
          <h2 className="flex-1 text-[19px] font-semibold tracking-[-0.02em]">
            결제 등록
          </h2>
          <Link
            aria-label="결제 등록 닫기"
            className={button("sm", "secondary", "text-[12px]")}
            data-dialog-close
            href={closeHref}
          >
            닫기
          </Link>
        </header>
        {notice && (
          <NoticeBanner className="mt-3 rounded-md border border-[var(--success)] bg-[var(--success-soft)] px-3 py-2 text-[12px] text-[var(--success)]">
            {notice}
          </NoticeBanner>
        )}
        <PaymentCustomerScope fixed={fixed}>
          <ActionForm
            action={correctionTargetId ? correctPayment : savePayment}
            aria-label="결제 등록 양식"
            className="mt-4 flex h-[509px] flex-col"
            error={error}
            errorClassName="mb-3 rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-[12px] text-[var(--danger)]"
          >
            <input name="requestKey" type="hidden" value={requestKey} />
            <input name="returnTo" type="hidden" value={returnTo} />
            {booking && (
              <input name="bookingId" type="hidden" value={booking.id} />
            )}
            {correctionTargetId && (
              <>
                <input
                  name="targetId"
                  type="hidden"
                  value={correctionTargetId}
                />
                <input name="reason" type="hidden" value="결제 정정" />
              </>
            )}
            <div className="flex min-h-0 flex-1 gap-4">
              <section className="w-[398px] shrink-0">
                <h3 className="h-7 text-[15px] font-semibold">고객 확인</h3>
                {booking && (
                  <p className="mb-2 text-[11px] text-[var(--muted)]">
                    예약 연결 · {booking.date} {booking.time}{" "}
                    {booking.customerName}
                  </p>
                )}
                {fixed ? (
                  <RegisteredCustomer
                    customer={fixedCustomer!}
                    customerId={fixed.customerId}
                  />
                ) : (
                  <PaymentCustomer
                    index={index}
                    points={points}
                    settings={settings}
                    today={defaultDate}
                  />
                )}
                <h3 className="mt-4 h-7 text-[15px] font-semibold">시술</h3>
                <div className="mt-3 grid grid-cols-1 gap-y-3">
                  <ServiceMajorSelect
                    onChange={(major) => {
                      setSelectedMajor(major);
                      setServiceMenuOpen(false);
                    }}
                    open={serviceMenuOpen}
                    options={majors}
                    setOpen={setServiceMenuOpen}
                    value={selectedMajor}
                  />
                  <label className={label}>
                    시술 상세
                    <input
                      className={field}
                      defaultValue={serviceDetail}
                      name="serviceDetail"
                    />
                  </label>
                  <label className={label}>
                    스타일명
                    <input className={field} name="styleName" />
                  </label>
                </div>
              </section>
              <PaymentAmounts
                cardFeeRate={cardFeeRate}
                dialog
                extrasOpen={extrasOpen}
                onExtrasOpenChange={setExtrasOpen}
                pointEarnRate={pointEarnRate}
                vatMode={
                  settings.vatMode === "separate" ? "separate" : "included"
                }
              />
            </div>
            <footer className="mt-4 flex h-[54px] items-center border-t border-[var(--border)] pt-3">
              <span className="mr-2 text-[11px] text-[var(--muted)]">
                결제 시각
              </span>
              <input
                className="h-8 min-w-[136px] rounded-md border border-[var(--border)] px-2 text-[12px]"
                defaultValue={defaultDate}
                name="occurredDate"
                type="date"
              />
              <span aria-hidden="true" className="mx-1 text-[var(--muted)]">
                ·
              </span>
              <input
                className="h-8 min-w-[96px] rounded-md border border-[var(--border)] px-2 text-[12px]"
                defaultValue={defaultTime}
                name="occurredTime"
                type="time"
              />
              <span className="flex-1" />
              <SubmitButton extra="h-10 min-w-[98px]" size="md">
                {correctionTargetId ? "정정 저장" : "결제 등록"}
              </SubmitButton>
            </footer>
          </ActionForm>
        </PaymentCustomerScope>
      </section>
    </ModalHost>
  );
}

function RegisteredCustomer({
  customer,
  customerId,
}: {
  customer: Customer;
  customerId: string;
}) {
  const name = text(customer, "name") || "등록 고객";
  const phone = text(customer, "phone").replace(/\D/g, "");
  return (
    <>
      <input name="customerId" type="hidden" value={customerId} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className={label}>
          이름
          <input
            aria-label="등록 고객 이름"
            className={field}
            readOnly
            value={name}
          />
        </label>
        <label className={label}>
          휴대전화 뒷자리
          <input
            aria-label="등록 고객 휴대전화 뒷자리"
            className={field}
            readOnly
            value={phone.slice(-4)}
          />
        </label>
      </div>
      <p
        className="mt-3 rounded-[4px] border border-[var(--border)] bg-[var(--brand-soft)] px-3 py-2 text-[11px] text-[var(--brand)]"
        role="status"
      >
        등록 고객으로 결제합니다. 포인트를 사용할 수 있어요.
      </p>
    </>
  );
}

function ServiceMajorSelect({
  onChange,
  open,
  options,
  setOpen,
  value,
}: {
  onChange: (major: string) => void;
  open: boolean;
  options: readonly string[];
  setOpen: (open: boolean) => void;
  value: string;
}) {
  return (
    <div className={`${label} relative z-20`}>
      시술 대분류
      <input name="serviceMajor" type="hidden" value={value} />
      <button
        aria-controls="service-major-options"
        aria-expanded={open}
        className={`${field} flex items-center justify-between text-left`}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span>{value}</span>
        <span aria-hidden="true" className="text-[var(--muted)]">
          ⌄
        </span>
      </button>
      {open && (
        <ul
          className="absolute left-0 top-[60px] z-30 max-h-[216px] w-full overflow-y-auto rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[0_16px_48px_rgb(13_20_18/18%)]"
          id="service-major-options"
          role="listbox"
        >
          {options.map((major) => (
            <li key={major}>
              <button
                aria-selected={value === major}
                className={button(
                  "sm",
                  "quiet",
                  `w-full justify-start text-left text-[13px] ${value === major ? "bg-[var(--brand-soft)] font-semibold text-[var(--brand)]" : "hover:bg-[var(--background)]"}`,
                )}
                onClick={() => onChange(major)}
                role="option"
                type="button"
              >
                {major}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
