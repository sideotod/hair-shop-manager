import { saveCustomer } from "../../app/customer-actions";
import type { JsonObject, JsonValue, SalonRecord } from "../../lib/salon-domain";
import { control } from "../button";
import { SubmitButton } from "../submit-button";

const input = `${control} min-w-0 w-full`;
const label = "grid gap-1 text-xs font-medium text-[var(--muted)]";

/**
 * 고객 등록 · 수정 — **6칸 1열.**
 *
 * 22칸 3열이었다. 그중 등급·그룹·방문동기·생일·집전화·주소·이메일·닉네임·포인트카드·
 * 패밀리번호는 화면 어디에서도 읽지 않아 영구히 삭제했다. 남은 칸은 원장이 손님을
 * 다시 찾을 때 쓰는 것들뿐이다.
 *
 * 1열인 이유는 팝업이기 때문이다. 3열이면 Tab 이 가로로 튀어 눈과 손이 갈라진다.
 *
 * SMS 수신과 방문 구분은 칸을 두지 않고 **숨은 값으로 이어받는다.** 칸을 없앤다고
 * 값까지 없애면 수신 거부해 둔 손님이 수정 한 번에 수신 동의로 돌아간다.
 */
export function CustomerForm({ customer, returnTo, settings }: { customer?: SalonRecord<JsonValue>; returnTo: string; settings: JsonObject }) {
  const current = customer && typeof customer.value === "object" && customer.value !== null && !Array.isArray(customer.value) ? customer.value as JsonObject : {};
  const string = (key: string) => typeof current[key] === "string" ? current[key] : "";
  const defaultGender = !customer && ["female", "male", "unspecified"].includes(String(settings.defaultGender)) ? String(settings.defaultGender) : "unspecified";
  const smsOptIn = customer ? current.smsOptIn !== false : settings.defaultSmsOptIn !== false;
  const points = typeof current.points === "number" ? current.points : 0;

  return <form action={saveCustomer} aria-label={customer ? "고객 정보 수정" : "고객 등록"} className="mt-5 grid gap-4">
    <input name="returnTo" type="hidden" value={returnTo} />
    <input name="smsOptIn" type="hidden" value={smsOptIn ? "on" : "off"} />
    <input name="visitType" type="hidden" value={string("visitType") || "first"} />
    {customer && <input name="customerId" type="hidden" value={customer.id} />}

    <label className={label}>성명<input className={input} defaultValue={string("name")} name="name" required /></label>
    <label className={label}>성별<select className={input} defaultValue={customer ? string("gender") || "unspecified" : defaultGender} name="gender"><option value="female">여성</option><option value="male">남성</option><option value="unspecified">미지정</option></select></label>
    <label className={label}>휴대전화<input className={input} defaultValue={string("phone")} name="phone" placeholder="010-0000-0000" required type="tel" /></label>
    {/* 포인트는 폼이 만드는 값이 아니다 — 결제마다 원장이 쌓고, 조정은 사유가 붙는 별도 경로다. */}
    {customer && <p className={label}>포인트<span className="flex h-10 items-center text-sm tabular-nums text-[var(--foreground)]">{points.toLocaleString("ko-KR")}P<span className="ml-2 text-xs font-normal text-[var(--muted)]">결제와 포인트 조정으로만 움직입니다.</span></span></p>}
    <label className={label}>첫 방문날짜<input className={input} defaultValue={string("joinedAt")} name="joinedAt" type="date" /></label>
    {/* 잔액을 덮어쓰면 원장에 없는 돈이 생긴다. 수정 화면에서는 칸 자체를 두지 않는다. */}
    {!customer && <label className={label}>선결제 금액<input className={input} defaultValue="0" inputMode="numeric" name="prepaidWon" /></label>}
    <label className={label}>메모 (150자 이하)<textarea className={`${input} h-20 py-2`} defaultValue={string("memo")} maxLength={150} name="memo" /></label>
    <label className="flex items-center gap-2 text-sm"><input name="allowDuplicate" type="checkbox" /> 이름 또는 휴대전화 중복 등록 허용</label>

    <SubmitButton extra="w-full">{customer ? "고객 정보 저장" : "고객 등록"}</SubmitButton>
  </form>;
}
