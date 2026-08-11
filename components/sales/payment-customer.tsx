"use client";

import { useState } from "react";

import { customerOptions } from "../../lib/customer-options";
import type { JsonValue } from "../../lib/salon-domain";

const field = "h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)]";
const label = "grid gap-1 text-xs font-medium text-[var(--muted)]";

/**
 * 구분 · 회원 고객 — 결제 폼에서 유일하게 **비워두면 저장이 튕기는** 칸.
 *
 * 33칸 중 필수 표시가 한 칸도 없었다. 그런데 33칸에 `required` 를 뿌리는 건 거짓말이다:
 * `finance.ts:70` `won()` 이 빈 금액을 `0` 으로 읽으므로 금액칸은 설계상 선택이고,
 * `시술 대분류` 는 `defaultValue="커트"` 라 빌 수가 없다. 서버가 실제로 던지는 건
 * `finance.ts:115` 한 줄 — `memberType === "member"` 인데 고객이 없을 때다.
 *
 * 그래서 필수는 조건부다. `구분` 을 비회원으로 바꾸면 고객칸은 서버가 아예 읽지 않으므로
 * (`finance.ts:112`) `required` 를 그대로 두면 저장할 수 없는 폼이 된다.
 * 구분을 따라 `required` 와 `필수` 표시가 함께 움직이고, 비회원일 때는 칸을 잠가
 * Tab 순서에서도 뺀다 — 값이 무시될 칸에 키보드를 세울 이유가 없다.
 */
export function PaymentCustomer({ customerId, customers }: { customerId?: string; customers: readonly { id: string; value: JsonValue }[] }) {
  const [memberType, setMemberType] = useState("member");
  const member = memberType === "member";
  return <>
    <label className={label}>구분<select className={field} name="memberType" onChange={(event) => setMemberType(event.target.value)} value={memberType}><option value="member">회원</option><option value="non-member">비회원</option></select></label>
    <label className={label}>회원 고객{member && <span className="text-[var(--danger)]"> 필수</span>}<select className={field} defaultValue={customerId ?? ""} disabled={!member} name="customerId" required={member}><option value="">선택</option>{customerOptions(customers).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
  </>;
}
