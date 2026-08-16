import { savePayment } from "../../app/payment-actions";
import { serviceMajorOptions } from "../../lib/operations";
import { formatPhone } from "../../lib/phone";
import type { JsonObject, JsonValue, SalonRecord } from "../../lib/salon-domain";
import { control } from "../button";
import { PaymentAmounts } from "../sales/payment-amounts";
import { PaymentCustomerScope } from "../sales/payment-customer";
import { ActionForm, SubmitButton } from "../submit-button";

const field = control;
const label = "grid gap-1 text-xs font-medium text-[var(--muted)]";

/**
 * /customers 안에서 결제를 끝낸다. **고객이 이미 정해져 있으므로 물을 것이 줄어든다.**
 *
 * `/sales` 의 결제 폼도 이제 고객을 이름·뒷자리로 찾지만, 여기서는 그 확인 자체가 필요 없다 —
 * 목록에서 고른 그 사람이다. 숨은 `customerId` 하나로 끝난다(등록되어 있으면 회원이다).
 *
 * 그 밖에 이 화면에서 물을 필요가 없는 것:
 * - 성별·방문 구분 — `finance.ts` 가 고객 레코드에서 먼저 읽는다. 칸을 두면 두 값이 갈린다.
 * - 메모 4종·결제 SMS — 그 자리에서 적는 값이 아니다. `/sales` 에 그대로 남아 있다.
 *
 * 금액 섹션은 `/sales` 와 **같은 컴포넌트**를 쓴다. 검증식(`settleAmounts()`)이 한 벌이어야
 * 화면 합계와 저장 결과가 갈라지지 않는다.
 */
export function CustomerPaymentDialog({ catalog = [], customer, defaultDate, defaultTime, error, pointEarnRate, requestKey, returnTo, vatMode, cardFeeRate }: {
  cardFeeRate: number; catalog?: readonly SalonRecord<JsonValue>[]; customer: { id: string; value: JsonObject }; defaultDate: string; defaultTime: string; error?: string; pointEarnRate: number; requestKey: string; returnTo: string; vatMode: "included" | "separate";
}) {
  const name = typeof customer.value.name === "string" ? customer.value.name : "-";
  const phone = typeof customer.value.phone === "string" ? customer.value.phone : "";
  const points = typeof customer.value.points === "number" ? customer.value.points : 0;
  const prepaid = typeof customer.value.prepaidWon === "number" ? customer.value.prepaidWon : 0;
  // 정정 경로가 없는 화면이라 `current` 를 넘길 옛 값이 없다 (`operations.ts:65`).
  const majors = serviceMajorOptions(catalog);

  return <PaymentCustomerScope fixed={{ customerId: customer.id, points }}><ActionForm action={savePayment} aria-label={`${name} 결제 등록`} className="grid gap-4" error={error} errorClassName="rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
    <input name="requestKey" type="hidden" value={requestKey} />
    <input name="returnTo" type="hidden" value={returnTo} />
    <input name="customerId" type="hidden" value={customer.id} />

    <p className="rounded-[var(--radius-card)] bg-[var(--background)] px-4 py-3 text-sm">
      <strong>{name}</strong> <span className="tabular-nums text-[var(--muted)]">{formatPhone(phone) || "휴대전화 없음"}</span>
      <span className="mt-1 block text-xs text-[var(--muted)]">포인트 <span className="tabular-nums">{points.toLocaleString("ko-KR")}P</span> · 선결제 잔액 <span className="tabular-nums">₩{prepaid.toLocaleString("ko-KR")}</span></span>
    </p>

    <label className={label}>시술 대분류<select className={field} defaultValue={majors[0]} name="serviceMajor">{majors.map((major) => <option key={major}>{major}</option>)}</select></label>
    <label className={label}>시술 상세<input className={field} name="serviceDetail" /></label>
    <label className={label}>스타일명<input className={field} name="styleName" /></label>

    <PaymentAmounts cardFeeRate={cardFeeRate} pointEarnRate={pointEarnRate} vatMode={vatMode} />

    <div className="grid grid-cols-2 gap-4">
      <label className={label}>결제일<input className={field} defaultValue={defaultDate} name="occurredDate" type="date" /></label>
      <label className={label}>시간<input className={field} defaultValue={defaultTime} name="occurredTime" type="time" /></label>
    </div>

    <SubmitButton extra="w-full">결제 저장</SubmitButton>
  </ActionForm></PaymentCustomerScope>;
}
