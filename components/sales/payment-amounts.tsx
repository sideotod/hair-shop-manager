"use client";

import { useState } from "react";

import { PAYMENT_METHODS, settleAmounts, type PaymentMethod, type VatMode } from "../../lib/settlement";
import { control, focusRing } from "../button";
import { typeScale } from "../type";
import { usePaymentCustomer } from "./payment-customer";

const field = `${control} w-full min-w-0`;
const label = "grid gap-1 text-xs font-medium text-[var(--muted)]";
const digits = (value: string) => value.replace(/\D/g, "").replace(/^0+(?=\d)/, "") || "0";
const num = (value: string) => Number(value || "0");
const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/** 화면에는 읽기 쉬운 천 단위 구분을, 서버에는 `finance.ts`가 받는 정수 문자열을 보낸다. */
export const formatWonInput = (value: string) => Number(value || "0").toLocaleString("ko-KR");

function MoneyInput({ className = field, name, onChange, readOnly, value, ...props }: Omit<React.ComponentProps<"input">, "name" | "value" | "onChange"> & { name: string; value: string; onChange?: React.ChangeEventHandler<HTMLInputElement>; readOnly?: boolean }) {
  return <><input name={name} type="hidden" value={value} /><input {...props} className={className} data-money-input={name} inputMode="numeric" onChange={onChange} readOnly={readOnly} value={formatWonInput(value)} /></>;
}

/**
 * 분할 결제는 여섯 가지다. 카운터에서 실제로 나눠 받는 것들만 남긴다 —
 * `현금영수증`·`제로페이`·`포인트` 는 이 격자에 없다. 포인트는 위 포인트칸이 이미 정하고,
 * 나머지 둘은 손으로 나눠 적을 일이 없어 기본 수단 셀렉트에만 남는다.
 * 서버는 `PAYMENT_METHODS` 아홉 칸을 전부 읽으므로(`finance.ts`), 여기 없는 칸은 숨은 0으로 보낸다.
 */
const SPLIT_METHODS = ["card", "cash", "transfer", "naverPay", "other", "prepaid"] as const satisfies readonly PaymentMethod[];
const methodLabel = new Map(PAYMENT_METHODS.map(({ key, label: name }) => [key, name]));

/** 단일 결제에서 고른 수단을 자동 잔액 칸으로 둔다. 다른 수단을 적으면 그만큼 줄어든다. */
export function splitTender(key: typeof SPLIT_METHODS[number], primary: typeof SPLIT_METHODS[number], netPaid: number, splits: Partial<Record<PaymentMethod, string>>) {
  if (key !== primary) return splits[key] ?? "0";
  const assigned = SPLIT_METHODS.filter((method) => method !== primary).reduce((sum, method) => sum + num(splits[method] ?? "0"), 0);
  return String(Math.max(netPaid - assigned, 0));
}

/**
 * 금액 · 결제수단 — 이 폼에서 유일한 클라이언트 섹션.
 *
 * 서버는 `finance.ts:51,56,57,58` 네 줄로 **화면에 없던 숫자**와의 일치를 요구했다.
 * 사용자는 `총액−할인−포인트`(+VAT별도)를 머릿속으로 풀어 결제수단 칸에 옮겨 적어야 했고,
 * 틀리면 33칸이 통째로 날아갔다. 검증식은 한 글자도 바꾸지 않는다 — 대신 화면이 **미리 만족시킨다.**
 *
 * 그래서 계산은 `settleAmounts()` **하나**만 쓴다. 서버가 부르는 것과 같은 함수다.
 * 여기에 산식을 다시 적으면 두 벌이 되고, 두 벌은 언젠가 갈라져서
 * "화면 합계는 맞는데 저장은 실패"가 된다.
 *
 * 숫자칸은 입력 즉시 숫자만 남긴다. 화면에는 `50,000`으로 읽히되, 숨은 필드에는
 * 서버 `won()`(`finance.ts`)이 요구하는 `50000`만 낸다.
 */
export function PaymentAmounts({ cardFeeRate: initialCardFeeRate, dialog = false, extrasOpen: controlledExtrasOpen, onExtrasOpenChange, pointEarnRate = 0, splitOpen: initialSplitOpen = false, vatMode: initialVatMode }: { cardFeeRate: number; /** Figma 09 결제 등록 모달의 398px 금액 열 */ dialog?: boolean; extrasOpen?: boolean; onExtrasOpenChange?: (open: boolean) => void; pointEarnRate?: number; splitOpen?: boolean; vatMode: VatMode }) {
  const [gross, setGross] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [pointsUsedInput, setPointsUsed] = useState("0");
  const [pointsEarnedInput, setPointsEarned] = useState<string | null>(null);
  const [vatMode, setVatMode] = useState<VatMode>(initialVatMode);
  const [cardFeeRate, setCardFeeRate] = useState(String(initialCardFeeRate));
  const [primary, setPrimary] = useState<PaymentMethod>("card");
  const [splits, setSplits] = useState<Partial<Record<PaymentMethod, string>>>({});
  const [splitOpen, setSplitOpen] = useState(initialSplitOpen);
  const [uncontrolledExtrasOpen, setUncontrolledExtrasOpen] = useState(false);
  const extrasOpen = controlledExtrasOpen ?? uncontrolledExtrasOpen;
  const setExtrasOpen = (open: boolean | ((current: boolean) => boolean)) => {
    const next = typeof open === "function" ? open(extrasOpen) : open;
    if (controlledExtrasOpen === undefined) setUncontrolledExtrasOpen(next);
    onExtrasOpenChange?.(next);
  };

  /**
   * 등록되지 않은 손님은 포인트를 쓸 수도 쌓을 수도 없다 (`finance.ts`). 지금까지는 저장을
   * 눌러야 알 수 있었다 — 고객칸과 포인트칸이 서로 다른 섹션에 있어 서로를 몰랐기 때문이다.
   * 이제 위 고객 확인이 아무도 못 찾으면 두 칸이 그 자리에서 0으로 잠긴다. 서버 검증은 그대로
   * 두되 화면에서 도달할 수 없게 만든다 — 실패시키는 것보다 못 적게 하는 쪽이 싸다.
   */
  const { customerId, points: availablePoints } = usePaymentCustomer();
  const member = customerId !== "";
  const pointsUsed = member ? pointsUsedInput : "0";
  const pointsCleared = !member && (num(pointsUsedInput) > 0 || num(pointsEarnedInput ?? "0") > 0);
  const pointsLock = member ? "" : " bg-[var(--background)] text-[var(--muted)]";

  const { taxable, netPaid, vat } = settleAmounts(num(gross), num(discount), num(pointsUsed), vatMode);
  // 적립은 설정의 적립률로 **미리 채운다**. 사용자가 그 칸을 한 번이라도 만지면(`null` 이 아니게 되면)
  // 그 뒤로는 총액을 고쳐도 손으로 적은 값을 덮지 않는다 — 고친 숫자가 조용히 사라지는 게 더 나쁘다.
  const pointsEarned = !member ? "0" : pointsEarnedInput ?? String(Math.floor(netPaid * pointEarnRate / 100));
  // 포인트는 결제수단 합계에서 빠진다. 기본 수단은 나머지를 받는 칸이다.
  // 단일 결제면 나눠 적은 값이 없으므로 기본 수단 하나가 실결제 전액을 받는다 — `splits` 는 읽지 않는다.
  const splitPrimary = SPLIT_METHODS.includes(primary as typeof SPLIT_METHODS[number]) ? primary as typeof SPLIT_METHODS[number] : "card";
  const assigned = splitOpen ? SPLIT_METHODS.filter((key) => key !== splitPrimary).reduce((sum, key) => sum + num(splits[key] ?? "0"), 0) : 0;
  const remainder = netPaid - assigned;
  const tender = (key: PaymentMethod) => key === "points" ? pointsUsed : splitOpen && SPLIT_METHODS.includes(key as typeof SPLIT_METHODS[number]) ? splitTender(key as typeof SPLIT_METHODS[number], splitPrimary, netPaid, splits) : key === primary ? String(netPaid) : "0";
  const overPoints = member && num(pointsUsed) > availablePoints;
  /** 화면에 칸이 있는 수단. 나머지는 숨은 값으로 나간다. */
  const visible = new Set<PaymentMethod>(splitOpen ? SPLIT_METHODS : []);
  const extraPanel = <div aria-hidden={!extrasOpen} className={`grid overflow-hidden transition-[grid-template-columns] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${extrasOpen ? "grid-cols-[1fr]" : "pointer-events-none grid-cols-[0fr]"}`}>
    <div className="min-w-0 overflow-hidden">
      {/* `CustomerForm`의 중복 확인 패널과 같은 구조. 패널 자신의 마진만 열리므로
          닫힌 폭은 0px, 열린 폭은 16px + 236px(총 252px)다. */}
      <section aria-label="부가 항목" className={dialog ? "ml-4 flex h-full w-[236px] flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--background)] p-4" : "ml-4 flex h-full w-[180px] flex-col gap-4 rounded-none rounded-br-[var(--radius-card)] border-0 border-l border-[var(--border)] bg-[var(--background)] p-4"}>
        <label className={label}>VAT<select className={field} name="vatMode" onChange={(event) => setVatMode(event.target.value === "separate" ? "separate" : "included")} value={vatMode}><option value="included">포함</option><option value="separate">별도</option></select></label>
        <label className={label}>카드 수수료(%)<input className={field} inputMode="decimal" name="cardFeeRate" onChange={(event) => setCardFeeRate(event.target.value)} value={cardFeeRate} /></label>
        <p className="grid gap-1 text-xs font-medium text-[var(--muted)]">부가세<span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">{won(vat)}</span></p>
      </section>
    </div>
  </div>;

  // `control`의 h-10보다 우선해야 601px 모달의 분할 2행이 한 화면에 들어간다.
  const compactField = `${field} !h-9`;

  return <section className={dialog ? "flex h-full shrink-0" : "rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5"}>
    <div className={dialog ? "flex h-full min-h-0 w-[398px] shrink-0 flex-col" : undefined}>
    {/* 부가 항목 펼치기는 `금액` 글씨와 같은 선상이다 — 이 섹션이 무엇인지와 무엇을 더 열 수 있는지가 한 줄에 있다. */}
    <div className="flex h-7 items-center justify-between gap-4">
      <h2 className={dialog ? "text-[15px] font-semibold" : typeScale.section}>금액</h2>
      <button aria-expanded={extrasOpen} className={`${typeScale.meta} text-[var(--brand)] underline ${focusRing}`} onClick={() => setExtrasOpen((open) => !open)} type="button">부가 항목 {extrasOpen ? "접기" : "펼치기"}</button>
    </div>

    {/* 부가 항목은 옆에 **붙어서** 펴진다. 사이 여백을 두면 접힌 상태에서도 그만큼이 남아
        칸 폭이 흔들린다 — `0fr → 1fr` 격자와 `overflow-hidden` 이 폭을 정확히 0으로 접는다. */}
    <div className={dialog ? "mt-3 shrink-0" : "mt-4 flex items-stretch"}>
      <div className={dialog ? "min-w-0" : "min-w-0 flex-1"}>
        {/* 부가 항목이 열리면 왼쪽 칸이 236px 좁아진다. 2열을 그대로 두면 칸이 눌려 금액이 잘렸다 —
            열려 있는 동안에는 한 줄에 한 칸씩 세운다. `min-w-0` 이 없으면 격자가 내용 폭을 우선해 넘친다. */}
        <div className={`grid ${dialog ? "grid-cols-2 gap-x-3 gap-y-2" : `gap-4 ${extrasOpen ? "grid-cols-1" : "grid-cols-2"}`}`}>
          <label className={label}>총 시술금액<MoneyInput className={dialog ? compactField : field} name="grossWon" onChange={(event) => setGross(digits(event.target.value))} value={gross} /></label>
          <label className={label}>할인<MoneyInput aria-describedby={taxable < 0 ? "payment-taxable-error" : undefined} aria-invalid={taxable < 0 || undefined} className={dialog ? compactField : field} name="discountWon" onChange={(event) => setDiscount(digits(event.target.value))} value={discount} /></label>
          <label className={label}>포인트 사용{member && <span className="font-normal"> · 보유 {availablePoints.toLocaleString("ko-KR")}P</span>}{!member && <span className="font-normal"> · 등록 고객만</span>}<MoneyInput aria-describedby={overPoints ? "payment-points-error" : pointsCleared ? "payment-member-points-error" : undefined} aria-invalid={overPoints || undefined} className={`${dialog ? compactField : field}${pointsLock}`} name="pointsUsedWon" onChange={(event) => setPointsUsed(digits(event.target.value))} readOnly={!member} value={pointsUsed} /></label>
          <label className={label}>포인트 적립{member && pointEarnRate > 0 && pointsEarnedInput === null && <span className="font-normal"> · 결제 금액의 {pointEarnRate}%</span>}{!member && <span className="font-normal"> · 등록 고객만</span>}<MoneyInput aria-describedby={pointsCleared ? "payment-member-points-error" : undefined} className={`${dialog ? compactField : field}${pointsLock}`} name="pointsEarnedWon" onChange={(event) => setPointsEarned(digits(event.target.value))} readOnly={!member} value={pointsEarned} /></label>
        </div>

        {/* 단일이냐 분할이냐를 먼저 고른다. 예전에는 분할이 `<details>` 안에 숨어 있어
            "나눠 받는다" 는 흔한 일이 접힘 뒤에 있었다. */}
        <div className={dialog ? "mt-3 border-t border-[var(--border)] pt-2" : "mt-5 border-t border-[var(--border)] pt-4"}>
          <div className="flex items-center justify-between gap-4">
            <span className={dialog ? "text-[15px] font-semibold" : "whitespace-nowrap text-xs font-medium text-[var(--muted)]"}>{dialog ? "결제" : "결제 방식"}</span>
            <span className="flex gap-2">
              {([[false, "단일 결제"], [true, "분할 결제"]] as const).map(([split, name]) => <button aria-pressed={splitOpen === split} className={buttonTone(splitOpen === split)} key={name} onClick={() => setSplitOpen(split)} type="button">{name}</button>)}
            </span>
          </div>

          {!splitOpen && <div className={dialog ? "mt-3" : "mt-4 grid grid-cols-2 gap-4"}>
            <label className={label}>결제수단<select className={field} onChange={(event) => setPrimary(event.target.value as PaymentMethod)} value={primary}>{SPLIT_METHODS.map((key) => <option key={key} value={key}>{methodLabel.get(key)}</option>)}</select></label>
            {!dialog && <p className="grid gap-1 self-end text-xs font-medium text-[var(--muted)]">결제 금액<output aria-live="polite" className={`${typeScale.metric} tabular-nums text-[var(--foreground)]`}>{won(netPaid)}</output></p>}
          </div>}

          {/* 여섯 칸 3개씩. 단일 결제에서 고른 수단만 자동 잔액을 받고, 나머지는 실제 받은 금액을 적는다. */}
          {splitOpen && <>
            <div className={`mt-3 grid grid-cols-3 ${dialog ? "gap-x-3 gap-y-2" : "gap-3"}`} data-payment-method-grid>{SPLIT_METHODS.map((key) => {
              const primaryRemainder = key === splitPrimary;
              return <label className={label} key={key}><span className="truncate">{methodLabel.get(key)}</span><MoneyInput aria-describedby={!primaryRemainder && remainder < 0 ? "payment-split-error" : undefined} className={`${dialog ? compactField : field}${primaryRemainder ? " bg-[var(--background)] text-[var(--muted)]" : ""}`} name={`payment_${key}`} onChange={primaryRemainder ? undefined : (event) => setSplits((previous) => ({ ...previous, [key]: digits(event.target.value) }))} readOnly={primaryRemainder} value={tender(key)} /></label>;
            })}</div>
          </>}
        </div>

        {/* 셋 다 입력값이 만든 오류다. 눈으로는 칸 아래에 붙어 있지만, 보조 기술에는
            `aria-describedby` 로 칸과 묶고 `role="alert"` 로 나타난 순간을 알린다. */}
        {taxable < 0 && <p className="mt-3 text-xs font-medium text-[var(--danger)]" id="payment-taxable-error" role="alert">할인과 포인트가 총 시술금액을 {won(-taxable)} 넘습니다.</p>}
        {overPoints && <p className="mt-3 text-xs font-medium text-[var(--warning)]" id="payment-points-error" role="alert">보유 포인트를 {won(num(pointsUsed) - availablePoints)} 초과했습니다.</p>}
        {/* 적어 둔 값이 조용히 0이 되면 그게 더 나쁘다. 비운 사실을 말하고, 되돌리는 법도 말한다. */}
        {pointsCleared && <p className="mt-3 text-xs font-medium text-[var(--warning)]" id="payment-member-points-error" role="alert">등록되지 않은 고객은 포인트를 쓰거나 쌓을 수 없어 두 칸을 0으로 두었습니다. 위에서 고객을 찾으면 되돌아옵니다.</p>}
        {splitOpen && remainder < 0 && <p className="mt-3 text-xs font-medium text-[var(--danger)]" id="payment-split-error" role="alert">분할 결제 수단 합계가 결제 금액보다 {won(-remainder)} 초과했습니다.</p>}
      </div>

      {!dialog && extraPanel}
    </div>

    {dialog && <div className="mt-auto flex h-12 shrink-0 items-center rounded-[9px] bg-[var(--brand-soft)] px-3"><span className="text-[12px] font-medium">결제 금액</span><output aria-live="polite" className="ml-auto text-[22px] font-semibold tabular-nums">{won(netPaid)}</output></div>}

    {/* 지출칸은 없앴다 — 결제 한 건에 딸린 지출을 여기서 적는 일이 없었고, 지출은 `/sales?tab=expenses`
        가 자기 화면으로 관리한다. 서버는 여전히 이 값을 읽으므로 0을 보낸다. */}
    <input name="expenseWon" type="hidden" value="0" />
    {/* 화면에 칸이 없는 수단은 숨은 값으로 보낸다 — 서버는 아홉 칸 전부를 읽고 합계를 검증한다. */}
    {PAYMENT_METHODS.filter(({ key }) => !visible.has(key)).map(({ key }) => <input key={key} name={`payment_${key}`} type="hidden" value={tender(key)} />)}
    </div>
    {dialog && extraPanel}
  </section>;
}

/** 결제 방식 두 칩. `button.ts` 의 `xs` 와 같은 크기지만 눌림 상태를 `aria-pressed` 로 말한다. */
function buttonTone(active: boolean) {
  return `inline-flex h-[26px] shrink-0 items-center justify-center rounded-[var(--radius-control)] border px-2.5 text-[11px] font-medium transition-colors ${focusRing} ${active ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"}`;
}
