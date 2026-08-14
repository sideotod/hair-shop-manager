"use client";

import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";

import { formatPhone } from "../../lib/phone";
import type { JsonObject } from "../../lib/salon-domain";
import { button, control, focusRing } from "../button";
import { CustomerForm, type DuplicateEntry } from "../customers/customer-form";
import { typeScale } from "../type";

const field = `${control} w-full`;
const label = "grid gap-1 text-xs font-medium text-[var(--muted)]";
const genders: Record<string, string> = { female: "여성", male: "남성" };

/**
 * **회원·비회원 구분칸은 없다.** 등록되어 있는 사람이 회원이다.
 *
 * 예전에는 `구분` 셀렉트가 회원/비회원을 묻고, 그 옆에서 858명짜리 드롭다운이 고객을 물었다.
 * 두 칸이 같은 사실을 두 번 물었고 서로 어긋날 수 있었다(회원인데 비회원, 비회원인데 고객 선택).
 * 이제 묻는 것은 **이름과 휴대전화 뒷자리** 둘뿐이다 — 카운터에서 실제로 오가는 말과 같다.
 * 찾으면 그 사람이 회원이고, 못 찾거나 비우면 비회원 결제다.
 *
 * 금액 섹션이 포인트칸을 열지 잠글지도 이 값 하나로 정해진다(`payment-amounts.tsx`).
 * 그래서 선택 결과를 컨텍스트로 내린다 — 두 섹션은 폼 안에서 서로 떨어져 있다.
 */
export type Chosen = { customerId: string; points: number };
const empty: Chosen = { customerId: "", points: 0 };
const CustomerContext = createContext<readonly [Chosen, (next: Chosen) => void]>([empty, () => {}]);

/**
 * 고객 확인칸과 금액칸을 잇는 스코프. 두 섹션은 폼 안에서 서로 떨어져 있으므로
 * 상태는 공통 조상인 여기가 든다 — 아래 마크업은 전부 서버에서 그려져 children 으로 통과한다.
 * `fixed` 는 /customers 처럼 고객이 이미 정해진 화면용이다. 그때는 확인칸 자체가 없다.
 */
export function PaymentCustomerScope({ children, fixed }: { children: React.ReactNode; fixed?: Chosen }) {
  const state = useState<Chosen>(fixed ?? empty);
  return <CustomerContext.Provider value={fixed ? [fixed, () => {}] : state}>{children}</CustomerContext.Provider>;
}

/** 지금 결제가 붙는 고객. `customerId` 가 비어 있으면 등록되지 않은 손님이다. */
export function usePaymentCustomer() { return useContext(CustomerContext)[0]; }

/** 뒷자리는 네 자리가 모여야 뜻이 생긴다. 이름은 한 글자로도 좁혀 볼 수 있게 둔다(동명이인은 팝업이 받는다). */
function lookup(index: readonly DuplicateEntry[], name: string, tail: string) {
  const typed = name.trim();
  if (!typed && tail.length < 4) return [];
  return index.filter(([, otherName, , otherPhone]) => {
    const digits = otherPhone.replace(/\D/g, "");
    if (typed && otherName.trim() !== typed) return false;
    if (tail.length === 4 && !digits.endsWith(tail)) return false;
    return true;
  });
}

function Readout({ entry }: { entry: DuplicateEntry }) {
  return <dl className="grid gap-3">
    {([["성명", entry[1] || "-"], ["성별", genders[entry[2]] ?? "미지정"], ["휴대전화", formatPhone(entry[3].replace(/\D/g, "")) || "휴대전화 없음"], ["첫 방문날짜", entry[4].slice(0, 10) || "기록 없음"]] as const).map(([term, description]) => <div className="grid gap-1" key={term}>
      <dt className="text-xs font-medium text-[var(--muted)]">{term}</dt>
      <dd className="flex h-10 items-center rounded-[var(--radius-control)] bg-[var(--background)] px-3 text-sm tabular-nums">{description}</dd>
    </div>)}
  </dl>;
}

/** 결제 팝업 위에 다시 뜨는 창. 딤과 곡선은 아래 팝업과 같은 값이라 두 겹이 한 어법으로 읽힌다. */
function Layer({ children, label: name, level }: { children: React.ReactNode; label: string; level: 1 | 2 }) {
  return createPortal(
    <div aria-label={name} className={`fixed inset-0 grid place-items-center bg-[rgb(13_21_18/38%)] p-8 ${level === 1 ? "z-[60]" : "z-[70]"}`} role="group">
      <section aria-label={name} aria-modal="true" className="max-h-[calc(100vh-64px)] w-[560px] max-w-full overflow-auto rounded-[var(--radius-card)] bg-[var(--surface)] p-5 shadow-[0_24px_64px_rgb(13_21_18/24%)]" role="dialog">{children}</section>
    </div>,
    document.body,
  );
}

export function PaymentCustomer({ index, points = {}, settings, today }: { index: readonly DuplicateEntry[]; /** 고객별 보유 포인트. 금액칸이 "보유 500P" 를 그리는 데 쓴다. */ points?: Readonly<Record<string, number>>; settings: JsonObject; today: string }) {
  const [, choose] = useContext(CustomerContext);
  const [name, setName] = useState("");
  const [tail, setTail] = useState("");
  const [picked, setPicked] = useState<DuplicateEntry | null>(null);
  /** 마지막으로 "다 적었다" 고 신호한 조합. 글자를 칠 때마다 팝업이 뜨면 이름 한 자마다 창이 열린다. */
  const [probed, setProbed] = useState("");
  const [detail, setDetail] = useState<DuplicateEntry | null>(null);
  const [confirming, setConfirming] = useState<DuplicateEntry | null>(null);
  const [registering, setRegistering] = useState(false);

  const matches = lookup(index, name, tail);
  const auto = matches.length === 1 ? matches[0] : null;
  const chosen = picked ?? auto;
  const key = `${name.trim()}|${tail}`;
  const blank = !name.trim() && !tail;
  // 팝업은 손이 칸을 떠난 뒤에만 뜬다. 그 조합을 이미 한 번 지나쳤으면 다시 뜨지 않는다.
  const probing = probed === key && !blank && !chosen;
  const missing = probing && matches.length === 0;
  const crowded = probing && matches.length > 1;

  // 렌더 중이 아니라 상태가 정해질 때 올린다 — 금액칸의 포인트 잠금이 이 값 하나로 갈린다.
  const settle = (entry: DuplicateEntry | null) => choose(entry ? { customerId: entry[0], points: points[entry[0]] ?? 0 } : empty);
  const close = () => { setProbed(""); setDetail(null); setConfirming(null); };
  /** 칸을 고치면 앞선 선택은 무효다. 한 명으로 좁혀지면 그 자리에서 확정한다(09B). */
  const retype = (nextName: string, nextTail: string) => {
    setName(nextName);
    setTail(nextTail);
    setPicked(null);
    close();
    const found = lookup(index, nextName, nextTail);
    settle(found.length === 1 ? found[0] : null);
  };

  return <>
    <input name="customerId" type="hidden" value={chosen ? chosen[0] : ""} />
    {/* 등록되지 않은 손님의 이름은 원장에 그대로 남는다 (`finance.ts` `details.customerName`). */}
    {!chosen && <input name="nonMemberName" type="hidden" value={name.trim()} />}

    <div className="grid grid-cols-2 gap-4">
      <label className={label}>이름<input autoComplete="off" className={field} name="lookupName" onBlur={() => setProbed(key)} onChange={(event) => retype(event.target.value, tail)} value={name} /></label>
      <label className={label}>휴대전화 뒷자리<input autoComplete="off" className={`${field} tabular-nums`} inputMode="numeric" maxLength={4} name="lookupTail" onBlur={() => setProbed(key)} onChange={(event) => retype(name, event.target.value.replace(/\D/g, "").slice(0, 4))} value={tail} /></label>
    </div>

    {/* 결과는 칸 바로 아래 한 줄로 말한다. 셋 중 하나다 — 비회원 / 찾음 / 확인 필요. */}
    <p className={`mt-3 flex h-8 items-center gap-2 ${typeScale.meta}`} role="status">
      {blank
        ? <span className="text-[var(--muted)]">이름과 뒷자리를 비우면 <strong className="font-semibold text-[var(--foreground)]">비회원 결제</strong>로 저장됩니다.</span>
        : chosen
          ? <>
            <span className="rounded-[var(--radius-chip)] bg-[var(--brand-soft)] px-1.5 py-px font-semibold text-[var(--brand)]">등록 고객</span>
            <span className="tabular-nums text-[var(--foreground)]">{chosen[1] || "-"} · {formatPhone(chosen[3].replace(/\D/g, "")) || "휴대전화 없음"}</span>
            <button className={`underline ${focusRing} text-[var(--muted)]`} onClick={() => retype("", "")} type="button">지우기</button>
          </>
          : matches.length > 1
            ? <button className={`underline ${focusRing} text-[var(--warning)]`} onClick={() => setProbed(key)} type="button">고객님이 {matches.length}명이에요 · 고르기</button>
            : <span className="text-[var(--muted)]">목록에서 찾으면 회원 결제로 저장됩니다.</span>}
    </p>

    {/* 09E — 적었는데 목록에 없다. 중복 확인 패널(`customer-form.tsx`)과 같은 경고 어법을 쓴다. */}
    {missing && <Layer label="등록되지 않은 고객" level={1}>
      <h3 className={`${typeScale.title} text-[var(--accent-ink)]`}>목록에 없는 고객이에요</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">{name.trim() || "이름 없음"}{tail && ` · 뒷자리 ${tail}`} 으로는 등록된 고객을 찾지 못했습니다. 처음 오신 손님이면 지금 등록하고 이어서 결제할 수 있습니다.</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button className={button("md", "secondary")} onClick={close} type="button">비회원으로 결제</button>
        <button className={button("md", "primary")} onClick={() => { setRegistering(true); close(); }} type="button">고객 등록</button>
      </div>
    </Layer>}

    {/* 처음 오는 손님은 등록 창까지 이어진다. 결제 폼 **밖**(portal)에 그려야 `<form>` 이 겹치지 않는다. */}
    {registering && <Layer label="고객 등록" level={1}>
      <div className="flex items-center justify-between gap-4">
        <h3 className={typeScale.title}>고객 등록</h3>
        <button className={button("md")} onClick={() => setRegistering(false)} type="button">닫기</button>
      </div>
      {/* 방금 친 이름은 그대로 들고 들어간다 — 못 찾았다고 두 번 치게 하지 않는다.
          뒷자리는 넘기지 않는다. 저장은 `^01\d{8,9}$` 를 요구하므로(`customer-operations.ts:49`)
          네 자리만 채워 두면 다 적은 것처럼 보이는 칸이 저장에서 거절된다. 아래 안내가 대신 말한다. */}
      <CustomerForm defaultName={name.trim()} duplicateIndex={index} returnTo="/customers" settings={settings} today={today} />
      <p className={`mt-3 ${typeScale.meta} text-[var(--muted)]`}>{tail && <>휴대전화 뒷자리 <strong className="font-semibold tabular-nums text-[var(--foreground)]">{tail}</strong> 로 찾았습니다. 번호를 앞자리까지 적어 주세요. </>}저장하면 고객 화면으로 이동합니다. 등록을 마친 뒤 그 고객의 결제 등록을 다시 열어 주세요.</p>
    </Layer>}

    {/* 09F·09G — 팝업 위 팝업. 고르면 옆으로 밀려나며 상세가 나온다. */}
    {crowded && <Layer label="고객 고르기" level={1}>
      <div className="flex items-center justify-between gap-4">
        <h3 className={typeScale.title}>고객님이 {matches.length}명이에요</h3>
        <button className={button("md")} onClick={close} type="button">닫기</button>
      </div>
      <p className={`mt-1 ${typeScale.meta} text-[var(--muted)]`}>{name.trim() && `이름 ${name.trim()}`}{name.trim() && tail && " · "}{tail && `뒷자리 ${tail}`} 로 찾은 고객입니다. 한 명을 고르면 옆에서 자세히 보여 드립니다.</p>

      <div className="mt-4 flex items-stretch">
        <ul className="w-[280px] shrink-0 divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]">
          {matches.map((entry) => <li key={entry[0]}>
            <button aria-current={detail?.[0] === entry[0] ? "true" : undefined} className={`flex w-full flex-col gap-0.5 py-2 pl-4 pr-3 text-left ${focusRing} ${detail?.[0] === entry[0] ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--background)]"}`} onClick={() => setDetail(entry)} type="button">
              <strong className={`truncate ${detail?.[0] === entry[0] ? "text-[var(--brand)]" : ""}`}>{entry[1] || "-"}</strong>
              <span className={`truncate tabular-nums ${typeScale.meta} text-[var(--muted)]`}>{formatPhone(entry[3].replace(/\D/g, "")) || "휴대전화 없음"}</span>
            </button>
          </li>)}
        </ul>
        {/* 두루마리처럼 옆으로 펴진다 — 중복 확인 패널과 같은 `0fr → 1fr` 어법이다. */}
        <div aria-hidden={!detail} className={`grid overflow-hidden transition-[grid-template-columns] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${detail ? "grid-cols-[1fr]" : "grid-cols-[0fr]"}`}>
          <div className="min-w-0 overflow-hidden">
            <div className="ml-4 flex h-full w-[220px] flex-col">
              {detail && <>
                <Readout entry={detail} />
                <button className={button("md", "primary", "mt-auto w-full")} onClick={() => setConfirming(detail)} type="button">확인</button>
              </>}
            </div>
          </div>
        </div>
      </div>
    </Layer>}

    {/* 09H — 팝업 위 팝업 위 확인. 정보를 한 번 더 보여주고, 예를 누르면 두 창이 함께 닫힌다. */}
    {confirming && <Layer label="고객 확인" level={2}>
      <h3 className={typeScale.title}>이 고객님으로 할까요?</h3>
      <div className="mt-4"><Readout entry={confirming} /></div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button className={button("md", "secondary")} onClick={() => setConfirming(null)} type="button">다시 고르기</button>
        <button className={button("md", "primary")} onClick={() => { setPicked(confirming); settle(confirming); setProbed(""); setDetail(null); setConfirming(null); }} type="button">이 고객님이에요</button>
      </div>
    </Layer>}
  </>;
}
