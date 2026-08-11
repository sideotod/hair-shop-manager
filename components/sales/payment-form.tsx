import Link from "next/link";

import { correctPayment, savePayment } from "../../app/payment-actions";
import { button } from "../button";
import { PageToolbar } from "../page-toolbar";
import { SubmitButton } from "../submit-button";
import { typeScale } from "../type";
import { PaymentAmounts } from "./payment-amounts";
import { customerOptions } from "../../lib/customer-options";
import type { JsonObject, JsonValue } from "../../lib/salon-domain";

type Customer = { id: string; value: JsonValue };
const field = "h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)]";
const record = (customer: Customer) => customer.value && typeof customer.value === "object" && !Array.isArray(customer.value) ? customer.value as Record<string, JsonValue> : null;

/**
 * `requestKey` 는 **서버 컴포넌트에서 요청당 1회** 만들어 내려보낸다.
 * 렌더 중 `crypto.randomUUID()` 를 부르면 같은 요청의 재렌더마다 값이 달라져
 * 마크업이 매번 새 바이트가 되고(캐시 무효) 멱등성 키의 의미도 사라진다.
 */
export function PaymentForm({ backTo = "/sales", customers, customerId, correctionTargetId, error, notice, requestKey, returnTo = "/sales?tab=payment", settings = {}, today }: { backTo?: string; customers: readonly Customer[]; customerId?: string; correctionTargetId?: string; error?: string; notice?: string; requestKey: string; returnTo?: string; settings?: JsonObject; today: string }) {
  const vatMode = settings.vatMode === "separate" ? "separate" : "included";
  const cardFeeRate = typeof settings.cardFeeRate === "number" ? settings.cardFeeRate : 0;
  // `finance.ts:122` 는 보유 포인트 초과를 저장 시점에 던진다. 고객이 이미 정해져 있으면
  // 그 숫자를 화면에 올려 사전 경고한다. 미선택이면 `null` — 없는 숫자를 0으로 꾸미지 않는다.
  const selected = customerId ? customers.find(({ id }) => id === customerId) : undefined;
  const points = selected && record(selected)?.points;
  const availablePoints = typeof points === "number" && Number.isSafeInteger(points) ? points : null;
  return <div>
    <PageToolbar description="원장 계정으로 불변 거래 기록을 추가합니다." title="결제 등록"><Link className={button("md", "secondary", "text-[var(--brand)]")} href={backTo}>매출 분석</Link></PageToolbar>
    {/* `role="alert"` 이 이미 assertive 다. `aria-live` 를 겹치면 스크린리더가 두 번 읽는다. */}
    {error && <p className="mt-5 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">{error}</p>}
    {notice && <p className="mt-5 rounded-[var(--radius-card)] border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]" role="status">{notice}</p>}
    <form action={correctionTargetId ? correctPayment : savePayment} aria-label="결제 등록 양식" className="mt-8 grid w-full max-w-none grid-cols-2 gap-5"><input name="requestKey" type="hidden" value={requestKey} /><input name="returnTo" type="hidden" value={returnTo} />{correctionTargetId && <><input name="targetId" type="hidden" value={correctionTargetId} /><input name="reason" type="hidden" value="결제 정정" /></>}
      <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className={typeScale.section}>고객 · 시술</h2><div className="mt-4 grid grid-cols-2 gap-4">
        <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">구분<select className={field} defaultValue="member" name="memberType"><option value="member">회원</option><option value="non-member">비회원</option></select></label>
        <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">회원 고객<select className={field} defaultValue={customerId ?? ""} name="customerId"><option value="">선택</option>{customerOptions(customers).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">비회원 이름<input className={field} name="nonMemberName" /></label>
        <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">성별<select className={field} defaultValue="female" name="gender"><option value="female">여성</option><option value="male">남성</option></select></label>
        <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">시술 대분류<select className={field} defaultValue="커트" name="serviceMajor"><option>커트</option><option>펌</option><option>매직</option><option>드라이</option><option>클리닉</option><option>컬러</option><option>업스타일</option><option>매니큐어</option><option>세트메뉴</option><option>기타</option></select></label>
        <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">시술 상세<input className={field} name="serviceDetail" /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">스타일명<input className={field} name="styleName" /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">방문<select className={field} defaultValue="first" name="visitType"><option value="first">신규</option><option value="repeat">재방문</option></select></label>
      </div></section>
      <PaymentAmounts availablePoints={availablePoints} cardFeeRate={cardFeeRate} vatMode={vatMode} />
      <section className="col-span-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className={typeScale.section}>기록</h2><div className="mt-4 grid grid-cols-4 gap-4"><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">결제일<input className={field} defaultValue={today} name="occurredDate" type="date" /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">시간<input className={field} defaultValue="10:00" name="occurredTime" type="time" /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">일반 메모<input className={field} name="generalNote" /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">의약품 메모<input className={field} name="medicineNote" /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">두피 메모<input className={field} name="scalpNote" /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">모발 메모<input className={field} name="hairNote" /></label><label className="flex items-center gap-2 pt-5 text-sm font-medium"><input name="smsRequested" type="checkbox" />결제 SMS 발송</label></div><SubmitButton extra="mt-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">{correctionTargetId ? "정정 결제 저장" : "결제 저장"}</SubmitButton></section>
    </form>
  </div>;
}
