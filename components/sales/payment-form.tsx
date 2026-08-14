import { correctPayment, savePayment } from "../../app/payment-actions";
import { serviceMajorOptions } from "../../lib/operations";
import { control, focusRing } from "../button";
import type { DuplicateEntry } from "../customers/customer-form";
import { PageToolbar } from "../page-toolbar";
import { SubmitButton, ActionForm, NoticeBanner } from "../submit-button";
import { typeScale } from "../type";
import { PaymentAmounts } from "./payment-amounts";
import { PaymentCustomer, PaymentCustomerScope } from "./payment-customer";
import type { JsonObject, JsonValue, SalonRecord } from "../../lib/salon-domain";

type Customer = { id: string; value: JsonValue };
const field = control;
/**
 * 접힌 `<details>` 는 Tab 을 **한 번**만 먹는다. 펼치면 안쪽 칸이 순서에 들어온다.
 *
 * 결제 폼은 Tab 27회였다. 그중 8회가 이미 올바르게 채워진 `결제일`·`시간` 두 칸이었다 —
 * 네이티브 date/time 위젯은 연·월·일, 시·분을 각각 한 정거장으로 센다.
 * 메모 4칸과 SMS 까지 합치면 13회가 "대개 손대지 않는 칸"에 쓰였다.
 * 요약줄에 날짜·시각을 그대로 적어 두면 펼치지 않고도 무엇이 저장될지 보인다.
 */
const summary = `flex h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-3 text-[13px] font-medium text-[var(--brand)] ${focusRing}`;
const record = (customer: Customer) => customer.value && typeof customer.value === "object" && !Array.isArray(customer.value) ? customer.value as Record<string, JsonValue> : null;

/**
 * `requestKey` 는 **서버 컴포넌트에서 요청당 1회** 만들어 내려보낸다.
 * 렌더 중 `crypto.randomUUID()` 를 부르면 같은 요청의 재렌더마다 값이 달라져
 * 마크업이 매번 새 바이트가 되고(캐시 무효) 멱등성 키의 의미도 사라진다.
 */
export function PaymentForm({ booking, catalog = [], customers, customerId, correctionTargetId, defaultDate, defaultTime, error, notice, requestKey, returnTo = "/sales?tab=payment", serviceDetail, serviceMajor, settings = {} }: { booking?: { id: string; date: string; time: string; customerName: string }; catalog?: readonly SalonRecord<JsonValue>[]; customers: readonly Customer[]; customerId?: string; correctionTargetId?: string; defaultDate: string; defaultTime: string; error?: string; notice?: string; requestKey: string; returnTo?: string; serviceDetail?: string; serviceMajor?: string; settings?: JsonObject }) {
  const vatMode = settings.vatMode === "separate" ? "separate" : "included";
  const cardFeeRate = typeof settings.cardFeeRate === "number" ? settings.cardFeeRate : 0;
  // 설정 화면의 기본값도 1% 다(`settings-page.tsx`). 두 곳이 갈리면 "설정에는 1인데 결제칸은 0" 이 된다.
  const pointEarnRate = typeof settings.pointEarnRate === "number" && settings.pointEarnRate >= 0 ? settings.pointEarnRate : 1;
  /**
   * 고객 확인은 **이름과 휴대전화 뒷자리**로 찾는다 — 858명짜리 드롭다운도, 회원/비회원 구분칸도 없다.
   * 목록은 고객 등록 팝업의 중복 확인이 쓰는 색인과 **같은 모양**이다(`DuplicateEntry`).
   * 색인을 두 벌 만들면 한쪽만 필드가 늘어 "등록에서는 찾는데 결제에서는 못 찾는" 상태가 된다.
   */
  const index: readonly DuplicateEntry[] = customers.map((customer) => {
    const value = record(customer) ?? {};
    const string = (key: string) => typeof value[key] === "string" ? value[key] : "";
    return [customer.id, string("name"), string("gender"), string("phone"), string("joinedAt"), string("memo")] as const;
  });
  const points = Object.fromEntries(customers.map((customer) => {
    const held = record(customer)?.points;
    return [customer.id, typeof held === "number" && Number.isSafeInteger(held) ? held : 0];
  }));
  // 예약·정정에서 넘어온 고객은 이미 정해져 있다. 그때는 확인칸을 물을 게 없다.
  const fixed = customerId ? { customerId, points: points[customerId] ?? 0 } : undefined;
  // 정정이면 기존 결제의 대분류를 `current` 로 넘긴다 — 그 값이 카탈로그에서 빠졌어도 목록에 남아야
  // 정정하려다 대분류가 조용히 바뀌지 않는다 (`operations.ts:65`).
  const majors = serviceMajorOptions(catalog, serviceMajor);
  return <div>
    {/* `매출 분석` 복귀 링크는 바로 위 `매출 기능` 탭바(`sales-controls.tsx`)가 같은 href 로 이미 제공한다. */}
    <PageToolbar description="사용자 계정으로 불변 거래 기록을 추가합니다." title="결제 등록" />
    {/* 오류 배너는 폼 안으로 들어갔다(`ActionForm`). 실패가 리다이렉트가 아니라 반환이 되면서
        문구가 폼과 같은 렌더에 실려야 입력값이 살아 있는 채로 오류만 갱신된다. */}
    {notice && <NoticeBanner className="mt-5 rounded-[var(--radius-card)] border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">{notice}</NoticeBanner>}
    {/* 고객 확인(위)과 포인트 두 칸(금액 섹션)이 서로를 알아야 한다. 섹션은 그대로 두고
        스코프만 씌운다 — 아래 마크업은 전부 서버에서 그려져 children 으로 통과한다. */}
    <PaymentCustomerScope fixed={fixed}><ActionForm action={correctionTargetId ? correctPayment : savePayment} aria-label="결제 등록 양식" className="mt-8 grid w-full max-w-none grid-cols-2 gap-5" error={error} errorClassName="col-span-2 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"><input name="requestKey" type="hidden" value={requestKey} /><input name="returnTo" type="hidden" value={returnTo} />{booking && <input name="bookingId" type="hidden" value={booking.id} />}{correctionTargetId && <><input name="targetId" type="hidden" value={correctionTargetId} /><input name="reason" type="hidden" value="결제 정정" /></>}
      <section className="col-span-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className={typeScale.section}>고객 확인</h2>
        {/* 예약에서 넘어온 결제라는 사실을 폼이 스스로 밝힌다. 없으면 사용자는 이 결제가 어느 예약에
            붙는지(`finance.ts` `details.bookingId`) 저장 뒤에야 알 수 있다. */}
        {booking && <p className={`mt-2 ${typeScale.meta} text-[var(--muted)]`}>예약 연결 · <span className="tabular-nums">{booking.date} {booking.time}</span> {booking.customerName}</p>}
        <div className="mt-4">
          {fixed
            ? <><input name="customerId" type="hidden" value={fixed.customerId} />
              <p className={`flex items-center gap-2 ${typeScale.meta}`}><span className="rounded-[var(--radius-chip)] bg-[var(--brand-soft)] px-1.5 py-px font-semibold text-[var(--brand)]">등록 고객</span><span className="text-[var(--foreground)]">{booking?.customerName || customerName(customers, fixed.customerId)}</span></p></>
            : <PaymentCustomer index={index} points={points} settings={settings} today={defaultDate} />}
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className={typeScale.section}>시술 내용</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">시술 대분류<select className={field} defaultValue={serviceMajor || majors[0]} name="serviceMajor">{majors.map((major) => <option key={major}>{major}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">시술 상세<input className={field} defaultValue={serviceDetail} name="serviceDetail" /></label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">스타일명<input className={field} name="styleName" /></label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">성별<select className={field} defaultValue="female" name="gender"><option value="female">여성</option><option value="male">남성</option></select></label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">방문<select className={field} defaultValue="first" name="visitType"><option value="first">신규</option><option value="repeat">재방문</option></select></label>
        </div>
      </section>
      <PaymentAmounts cardFeeRate={cardFeeRate} pointEarnRate={pointEarnRate} vatMode={vatMode} />
      <details className="col-span-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5"><summary className={summary}>기록 · {defaultDate} {defaultTime} — 날짜·시간·메모 수정</summary><div className="mt-4 grid grid-cols-4 gap-4"><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">결제일<input className={field} defaultValue={defaultDate} name="occurredDate" type="date" /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">시간<input className={field} defaultValue={defaultTime} name="occurredTime" type="time" /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">일반 메모<input className={field} name="generalNote" /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">의약품 메모<input className={field} name="medicineNote" /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">두피 메모<input className={field} name="scalpNote" /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]">모발 메모<input className={field} name="hairNote" /></label><label className="flex items-center gap-2 pt-5 text-sm font-medium"><input name="smsRequested" type="checkbox" />결제 SMS 발송</label></div></details>
      <SubmitButton extra="col-span-2">{correctionTargetId ? "정정 결제 저장" : "결제 저장"}</SubmitButton>
    </ActionForm></PaymentCustomerScope>
  </div>;
}

/** 이미 정해진 고객의 이름 한 줄. 없으면 id 를 그대로 보여준다 — 빈 칸보다 낫다. */
function customerName(customers: readonly Customer[], id: string) {
  const found = customers.find((customer) => customer.id === id);
  const name = found && record(found)?.name;
  return typeof name === "string" && name ? name : id;
}
