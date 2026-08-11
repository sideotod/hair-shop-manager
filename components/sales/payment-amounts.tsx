"use client";

import { useState } from "react";

import { PAYMENT_METHODS, settleAmounts, type PaymentMethod, type VatMode } from "../../lib/settlement";
import { typeScale } from "../type";

const field = "h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)]";
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
export function PaymentAmounts({ availablePoints, cardFeeRate: initialCardFeeRate, splitOpen: initialSplitOpen = false, vatMode: initialVatMode }: { availablePoints: number | null; cardFeeRate: number; splitOpen?: boolean; vatMode: VatMode }) {
  const [gross, setGross] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [pointsUsed, setPointsUsed] = useState("0");
  const [pointsEarned, setPointsEarned] = useState("0");
  const [expense, setExpense] = useState("0");
  const [vatMode, setVatMode] = useState<VatMode>(initialVatMode);
  const [cardFeeRate, setCardFeeRate] = useState(String(initialCardFeeRate));
  const [primary, setPrimary] = useState<PaymentMethod>("cash");
  const [splits, setSplits] = useState<Partial<Record<PaymentMethod, string>>>({});
  const [splitOpen, setSplitOpen] = useState(initialSplitOpen);

  const { taxable, netPaid, vat } = settleAmounts(num(gross), num(discount), num(pointsUsed), vatMode);
  // 포인트는 결제수단 합계에서 빠진다 (`finance.ts:57`). 기본 수단은 나머지를 받는 칸이다.
  const assigned = PAYMENT_METHODS.reduce((sum, { key }) => key === "points" || key === primary ? sum : sum + num(splits[key] ?? "0"), 0);
  const remainder = netPaid - assigned;
  const tender = (key: PaymentMethod) => key === "points" ? pointsUsed : key === primary ? String(Math.max(remainder, 0)) : splits[key] ?? "0";
  const overPoints = availablePoints !== null && num(pointsUsed) > availablePoints;

  return <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
    <h2 className={typeScale.section}>금액 · 결제수단</h2>
    <div className="mt-4 grid grid-cols-2 gap-4">
      <label className={label}>총 시술금액<input className={field} inputMode="numeric" name="grossWon" onChange={(event) => setGross(digits(event.target.value))} value={gross} /></label>
      <label className={label}>할인<input className={field} inputMode="numeric" name="discountWon" onChange={(event) => setDiscount(digits(event.target.value))} value={discount} /></label>
      <label className={label}>포인트 사용{availablePoints !== null && <span className="font-normal"> · 보유 {availablePoints.toLocaleString("ko-KR")}P</span>}<input aria-invalid={overPoints || undefined} className={field} inputMode="numeric" name="pointsUsedWon" onChange={(event) => setPointsUsed(digits(event.target.value))} value={pointsUsed} /></label>
      <label className={label}>포인트 적립<input className={field} inputMode="numeric" name="pointsEarnedWon" onChange={(event) => setPointsEarned(digits(event.target.value))} value={pointsEarned} /></label>
      <label className={label}>결제수단<select className={field} onChange={(event) => setPrimary(event.target.value as PaymentMethod)} value={primary}>{PAYMENT_METHODS.filter(({ key }) => key !== "points").map(({ key, label: name }) => <option key={key} value={key}>{name}</option>)}</select></label>
      <p className="grid gap-1 self-end text-xs font-medium text-[var(--muted)]">실결제<output aria-live="polite" className={`${typeScale.metric} tabular-nums text-[var(--foreground)]`}>{won(netPaid)}</output></p>
    </div>

    {taxable < 0 && <p className="mt-3 text-xs font-medium text-[var(--danger)]">할인과 포인트가 총 시술금액을 {won(-taxable)} 넘습니다.</p>}
    {overPoints && <p className="mt-3 text-xs font-medium text-[var(--warning)]">보유 포인트를 {won(num(pointsUsed) - (availablePoints ?? 0))} 초과했습니다.</p>}
    {remainder < 0 && <p className="mt-3 text-xs font-medium text-[var(--danger)]">분할 결제 합계가 실결제액을 {won(-remainder)} 넘습니다.</p>}

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
        return <label className={label} key={key}>{name}{key === primary && " · 나머지"}{key === "points" && " · 사용 포인트"}<input className={`${field}${derived ? " bg-[var(--background)] text-[var(--muted)]" : ""}`} inputMode="numeric" name={`payment_${key}`} onChange={derived ? undefined : (event) => setSplits((previous) => ({ ...previous, [key]: digits(event.target.value) }))} readOnly={derived} value={tender(key)} /></label>;
      })}</div>
    </details>
  </section>;
}
