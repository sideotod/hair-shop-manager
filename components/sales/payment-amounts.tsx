"use client";

import { useState } from "react";

import { PAYMENT_METHODS, settleAmounts, type PaymentMethod, type VatMode } from "../../lib/settlement";
import { control } from "../button";
import { typeScale } from "../type";
import { useIsMember } from "./payment-customer";

const field = control;
const label = "grid gap-1 text-xs font-medium text-[var(--muted)]";
const digits = (value: string) => value.replace(/\D/g, "").replace(/^0+(?=\d)/, "") || "0";
const num = (value: string) => Number(value || "0");
const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/**
 * 금액 · 결제수단 — 이 폼에서 유일한 클라이언트 섹션.
 *
 * 서버는 `finance.ts:51,56,57,58` 네 줄로 **화면에 없던 숫자**와의 일치를 요구했다.
 * 원장은 `총액−할인−포인트`(+VAT별도)를 머릿속으로 풀어 결제수단 칸에 옮겨 적어야 했고,
 * 틀리면 33칸이 통째로 날아갔다. 검증식은 한 글자도 바꾸지 않는다 — 대신 화면이 **미리 만족시킨다.**
 *
 * 그래서 계산은 `settleAmounts()` **하나**만 쓴다. 서버가 부르는 것과 같은 함수다.
 * 여기에 산식을 다시 적으면 두 벌이 되고, 두 벌은 언젠가 갈라져서
 * "화면 합계는 맞는데 저장은 실패"가 된다.
 *
 * 숫자칸은 입력 즉시 숫자만 남긴다. 서버 `won()`(`finance.ts:80`)이 `/^\d+$/` 라
 * 앱이 스스로 찍어주는 `50,000` 형식을 되받으면 거절하고, 앞자리 `0` 이 남으면
 * `50000` 이 `050000`(→50,000 이 아니라 그대로 통과하는 값)으로 새기 때문이다.
 */
export function PaymentAmounts({ availablePoints, cardFeeRate: initialCardFeeRate, pointEarnRate = 0, splitOpen: initialSplitOpen = false, vatMode: initialVatMode }: { availablePoints: number | null; cardFeeRate: number; pointEarnRate?: number; splitOpen?: boolean; vatMode: VatMode }) {
  const [gross, setGross] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [pointsUsedInput, setPointsUsed] = useState("0");
  const [pointsEarnedInput, setPointsEarned] = useState<string | null>(null);
  const [expense, setExpense] = useState("0");
  const [vatMode, setVatMode] = useState<VatMode>(initialVatMode);
  const [cardFeeRate, setCardFeeRate] = useState(String(initialCardFeeRate));
  const [primary, setPrimary] = useState<PaymentMethod>("cash");
  const [splits, setSplits] = useState<Partial<Record<PaymentMethod, string>>>({});
  const [splitOpen, setSplitOpen] = useState(initialSplitOpen);

  // 비회원은 포인트를 쓸 수도 쌓을 수도 없다 (`finance.ts:121`). 지금까지는 저장을 눌러야
  // 알 수 있었다 — 구분은 고객 섹션, 포인트는 여기라 두 칸이 서로를 몰랐기 때문이다.
  // 이제 `구분` 을 비회원으로 바꾸는 순간 두 칸이 0으로 잠긴다. 서버 검증은 그대로 두되
  // 화면에서 도달할 수 없게 만든다 — 실패시키는 것보다 못 적게 하는 쪽이 싸다.
  const member = useIsMember();
  const pointsUsed = member ? pointsUsedInput : "0";
  const pointsCleared = !member && (num(pointsUsedInput) > 0 || num(pointsEarnedInput ?? "0") > 0);
  const pointsLock = member ? "" : " bg-[var(--background)] text-[var(--muted)]";

  const { taxable, netPaid, vat } = settleAmounts(num(gross), num(discount), num(pointsUsed), vatMode);
  // 적립은 설정의 적립률로 **미리 채운다**. 원장이 그 칸을 한 번이라도 만지면(`null` 이 아니게 되면)
  // 그 뒤로는 총액을 고쳐도 손으로 적은 값을 덮지 않는다 — 고친 숫자가 조용히 사라지는 게 더 나쁘다.
  const pointsEarned = !member ? "0" : pointsEarnedInput ?? String(Math.floor(netPaid * pointEarnRate / 100));
  // 포인트는 결제수단 합계에서 빠진다 (`finance.ts:57`). 기본 수단은 나머지를 받는 칸이다.
  const assigned = PAYMENT_METHODS.reduce((sum, { key }) => key === "points" || key === primary ? sum : sum + num(splits[key] ?? "0"), 0);
  const remainder = netPaid - assigned;
  const tender = (key: PaymentMethod) => key === "points" ? pointsUsed : key === primary ? String(Math.max(remainder, 0)) : splits[key] ?? "0";
  const overPoints = availablePoints !== null && num(pointsUsed) > availablePoints;

  return <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
    <h2 className={typeScale.section}>금액 · 결제수단</h2>
    <div className="mt-4 grid grid-cols-2 gap-4">
      <label className={label}>총 시술금액<input className={field} inputMode="numeric" name="grossWon" onChange={(event) => setGross(digits(event.target.value))} value={gross} /></label>
      <label className={label}>할인<input aria-describedby={taxable < 0 ? "payment-taxable-error" : undefined} aria-invalid={taxable < 0 || undefined} className={field} inputMode="numeric" name="discountWon" onChange={(event) => setDiscount(digits(event.target.value))} value={discount} /></label>
      <label className={label}>포인트 사용{member && availablePoints !== null && <span className="font-normal"> · 보유 {availablePoints.toLocaleString("ko-KR")}P</span>}{!member && <span className="font-normal"> · 비회원 불가</span>}<input aria-describedby={overPoints ? "payment-points-error" : pointsCleared ? "payment-member-points-error" : undefined} aria-invalid={overPoints || undefined} className={`${field}${pointsLock}`} inputMode="numeric" name="pointsUsedWon" onChange={(event) => setPointsUsed(digits(event.target.value))} readOnly={!member} value={pointsUsed} /></label>
      <label className={label}>포인트 적립{member && pointEarnRate > 0 && pointsEarnedInput === null && <span className="font-normal"> · 실결제의 {pointEarnRate}%</span>}{!member && <span className="font-normal"> · 비회원 불가</span>}<input aria-describedby={pointsCleared ? "payment-member-points-error" : undefined} className={`${field}${pointsLock}`} inputMode="numeric" name="pointsEarnedWon" onChange={(event) => setPointsEarned(digits(event.target.value))} readOnly={!member} value={pointsEarned} /></label>
      <label className={label}>결제수단<select className={field} onChange={(event) => setPrimary(event.target.value as PaymentMethod)} value={primary}>{PAYMENT_METHODS.filter(({ key }) => key !== "points").map(({ key, label: name }) => <option key={key} value={key}>{name}</option>)}</select></label>
      <p className="grid gap-1 self-end text-xs font-medium text-[var(--muted)]">실결제<output aria-live="polite" className={`${typeScale.metric} tabular-nums text-[var(--foreground)]`}>{won(netPaid)}</output></p>
    </div>

    {/* 셋 다 입력값이 만든 오류다. 눈으로는 칸 아래에 붙어 있지만, 보조 기술에는
        `aria-describedby` 로 칸과 묶고 `role="alert"` 로 나타난 순간을 알린다. */}
    {taxable < 0 && <p className="mt-3 text-xs font-medium text-[var(--danger)]" id="payment-taxable-error" role="alert">할인과 포인트가 총 시술금액을 {won(-taxable)} 넘습니다.</p>}
    {overPoints && <p className="mt-3 text-xs font-medium text-[var(--warning)]" id="payment-points-error" role="alert">보유 포인트를 {won(num(pointsUsed) - (availablePoints ?? 0))} 초과했습니다.</p>}
    {/* 적어 둔 값이 조용히 0이 되면 그게 더 나쁘다. 비운 사실을 말하고, 되돌리는 법도 말한다. */}
    {pointsCleared && <p className="mt-3 text-xs font-medium text-[var(--warning)]" id="payment-member-points-error" role="alert">비회원은 포인트를 사용하거나 적립할 수 없어 두 칸을 0으로 두었습니다. 구분을 회원으로 바꾸면 되돌아옵니다.</p>}
    {remainder < 0 && <p className="mt-3 text-xs font-medium text-[var(--danger)]" id="payment-split-error" role="alert">분할 결제 합계가 실결제액을 {won(-remainder)} 넘습니다.</p>}

    <details className="mt-5 border-t border-[var(--border)] pt-4" onToggle={(event) => setSplitOpen(event.currentTarget.open)} open={splitOpen}>
      <summary className="cursor-pointer text-xs font-medium text-[var(--muted)]">분할 결제 · 부가 항목{assigned > 0 && ` · 분할 ${won(assigned)}`}</summary>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <label className={label}>VAT<select className={field} name="vatMode" onChange={(event) => setVatMode(event.target.value === "separate" ? "separate" : "included")} value={vatMode}><option value="included">포함</option><option value="separate">별도</option></select></label>
        <label className={label}>카드 수수료(%)<input className={field} inputMode="decimal" name="cardFeeRate" onChange={(event) => setCardFeeRate(event.target.value)} value={cardFeeRate} /></label>
        <label className={label}>지출<input className={field} inputMode="numeric" name="expenseWon" onChange={(event) => setExpense(digits(event.target.value))} value={expense} /></label>
        <p className="grid gap-1 self-end text-xs font-medium text-[var(--muted)]">부가세<span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">{won(vat)}</span></p>
      </div>
      {/* 8칸 전부 남긴다 — 기능 제거 금지. 기본 수단과 포인트는 파생값이라 읽기 전용이다. */}
      <div className="mt-5 grid grid-cols-2 gap-3" data-payment-method-grid>{PAYMENT_METHODS.map(({ key, label: name }) => {
        const derived = key === "points" || key === primary;
        return <label className={label} key={key}>{name}{key === primary && " · 나머지"}{key === "points" && " · 사용 포인트"}<input aria-describedby={!derived && remainder < 0 ? "payment-split-error" : undefined} className={`${field}${derived ? " bg-[var(--background)] text-[var(--muted)]" : ""}`} inputMode="numeric" name={`payment_${key}`} onChange={derived ? undefined : (event) => setSplits((previous) => ({ ...previous, [key]: digits(event.target.value) }))} readOnly={derived} value={tender(key)} /></label>;
      })}</div>
    </details>
  </section>;
}
