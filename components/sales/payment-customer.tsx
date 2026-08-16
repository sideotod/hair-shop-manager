"use client";

import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";

import { formatPhone } from "../../lib/phone";
import type { JsonObject } from "../../lib/salon-domain";
import { button, control, focusRing } from "../button";
import type { DuplicateEntry } from "../customers/customer-form";
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

/** 고객 확인칸에 무언가 적었지만 일치하는 등록 고객이 없을 때만 경고한다. */
export const isUnregisteredCustomer = (blank: boolean, matchCount: number) => !blank && matchCount === 0;

/** 비회원 카드와 같은 높이로, 입력한 정보가 등록 목록에 없다는 사실만 말한다. */
export function UnregisteredCustomerNotice() {
  return <div className="mt-1 flex h-[59px] flex-col justify-center rounded-[4px] border border-[var(--danger)] bg-[var(--danger-soft)] px-3" role="alert"><strong className="text-[12px] text-[var(--danger)]">등록되지 않은 고객이에요</strong><span className="mt-1 text-[11px] text-[var(--foreground)]">비회원 결제로 등록됩니다.</span></div>;
}

/** 같은 이름·뒷자리 후보가 여럿이면 비회원 상태와 같은 경고 카드에서 선택을 요청한다. */
export function CustomerChoiceNotice({ count, onChoose }: { count: number; onChoose: () => void }) {
  return <div className="flex h-[59px] items-center justify-between rounded-[4px] border border-[var(--warning)] bg-[var(--warning-soft)] px-3"><div className="flex flex-col justify-center"><strong className="text-[12px] text-[var(--warning)]">고객님이 {count}명이에요</strong><span className="mt-1 text-[11px] text-[var(--foreground)]">한 분을 선택해 주세요.</span></div><button className={`text-[12px] font-semibold underline ${focusRing} text-[var(--warning)]`} onClick={onChoose} type="button">고르기</button></div>;
}

function CustomerRows({ entry, points = 0 }: { entry: DuplicateEntry; points?: number }) {
  return <dl className="grid gap-2">
    {([["휴대전화", formatPhone(entry[3].replace(/\D/g, "")) || "휴대전화 없음"], ["성별", genders[entry[2]] ?? "미지정"], ["첫 방문", entry[4].slice(0, 10) || "기록 없음"], ["보유 포인트", `${points.toLocaleString("ko-KR")}P`]] as const).map(([term, description]) => <div className="flex items-center gap-2" key={term}>
      <dt className="w-[70px] shrink-0 text-[11px] text-[var(--muted)]">{term}</dt><dd className="min-w-0 flex-1 text-[13px] font-medium tabular-nums text-[var(--foreground)]">{description}</dd>
    </div>)}
  </dl>;
}

/** 결제 팝업 위에 다시 뜨는 창. 딤과 곡선은 아래 팝업과 같은 값이라 두 겹이 한 어법으로 읽힌다. */
function Layer({ children, label: name, level, onBackdrop, panelClass = "p-5", width }: { children: React.ReactNode; label: string; level: 1 | 2; onBackdrop: () => void; panelClass?: string; width: string }) {
  return createPortal(
    <div aria-label={name} className={`fixed inset-0 grid place-items-center bg-[rgb(13_21_18/38%)] p-8 ${level === 1 ? "z-[60]" : "z-[70]"}`} onPointerDown={(event) => { if (event.target === event.currentTarget) onBackdrop(); }} role="group">
      <section aria-label={name} aria-modal="true" className={`max-h-[calc(100vh-64px)] ${width} max-w-full overflow-auto rounded-[var(--radius-card)] bg-[var(--surface)] ${panelClass} shadow-[0_24px_64px_rgb(13_21_18/24%)]`} role="dialog">{children}</section>
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

  const matches = lookup(index, name, tail);
  const auto = matches.length === 1 ? matches[0] : null;
  const chosen = picked ?? auto;
  const key = `${name.trim()}|${tail}`;
  const blank = !name.trim() && !tail;
  const unregistered = isUnregisteredCustomer(blank, matches.length);
  // 팝업은 손이 칸을 떠난 뒤에만 뜬다. 그 조합을 이미 한 번 지나쳤으면 다시 뜨지 않는다.
  const probing = probed === key && !blank && !chosen;
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

    {/* 결과는 입력 아래에서 다음 행동을 분명히 한다. 등록 고객은 Figma 09B와 같이
        한 줄 칩이 아니라 59px 안내 블록으로 남겨 포인트칸이 열린 이유를 같이 말한다. */}
    <div className={`mt-3 ${typeScale.meta}`} role="status">
      {blank
        ? <div className="flex h-[59px] flex-col justify-center rounded-[4px] border border-[var(--warning)] bg-[var(--warning-soft)] px-3"><strong className="text-[12px] text-[var(--warning)]">비회원</strong><span className="mt-1 text-[11px] text-[var(--foreground)]">고객 정보 없이 비회원 결제로 저장됩니다.</span></div>
          : chosen
            ? <div className="flex h-[59px] flex-col justify-center rounded-[4px] border border-[var(--border)] bg-[var(--brand-soft)] px-3"><strong className="text-[12px] text-[var(--brand)]">등록 고객</strong><span className="mt-1 tabular-nums text-[11px] text-[var(--foreground)]">{chosen[1] || "-"} · {formatPhone(chosen[3].replace(/\D/g, "")) || "휴대전화 없음"}<button className={`ml-2 underline ${focusRing} text-[var(--muted)]`} onClick={() => retype("", "")} type="button">지우기</button></span></div>
          : matches.length > 1
            ? <CustomerChoiceNotice count={matches.length} onChoose={() => setProbed(key)} />
            : unregistered
              ? null
              : <p className="flex h-8 items-center text-[var(--muted)]">목록에서 찾으면 회원 결제로 저장됩니다.</p>}
      {unregistered && <UnregisteredCustomerNotice />}
    </div>

    {/* 09F·09G — 팝업 위 팝업. 고르면 옆으로 밀려나며 상세가 나온다. */}
    {crowded && <Layer label="고객 고르기" level={1} onBackdrop={close} panelClass="overflow-hidden p-0" width={detail ? "w-[760px]" : "w-[420px]"}>
      <div className="flex h-[391px] items-stretch"><div className="flex w-[420px] shrink-0 flex-col gap-3 p-5"><h3 className="text-[19px] font-semibold">고객님이 여러명이에요.</h3><p className="text-[12px] text-[var(--muted)]">{name.trim() || "입력한 조건"}으로 {matches.length}명이 등록돼 있어요. 한 분을 골라 주세요.</p>
        <ul className="h-[224px] w-full shrink-0 divide-y divide-[var(--border)] overflow-y-auto rounded-[9px] border border-[var(--border)]" data-payment-customer-results>{matches.map((entry) => <li key={entry[0]}><button aria-current={detail?.[0] === entry[0] ? "true" : undefined} className={`flex h-[56px] w-full items-center text-left ${focusRing} ${detail?.[0] === entry[0] ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--background)]"}`} onClick={() => setDetail(entry)} type="button"><span className={`h-10 w-0.5 shrink-0 ${detail?.[0] === entry[0] ? "bg-[var(--brand)]" : "bg-transparent"}`} /><span className="min-w-0 flex-1 px-3.5"><strong className={`block truncate text-[13px] ${detail?.[0] === entry[0] ? "text-[var(--brand)]" : "text-[var(--foreground)]"}`}>{entry[1] || "-"} · {formatPhone(entry[3].replace(/\D/g, "")) || "휴대전화 없음"}</strong><span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">첫 방문 · {entry[4].slice(0, 10) || "기록 없음"}</span></span></button></li>)}</ul>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-1"><button className={button("md", "secondary", "h-10")} onClick={close} type="button">닫기</button><button className={button("md", "primary", "h-10")} disabled={!detail} onClick={() => detail && setConfirming(detail)} type="button">확인</button></div></div>
        <div aria-hidden={!detail} className={`grid overflow-hidden transition-[grid-template-columns] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${detail ? "grid-cols-[1fr]" : "grid-cols-[0fr]"}`}><div className="min-w-0 overflow-hidden"><aside className="flex h-[391px] w-[340px] flex-col gap-2.5 rounded-br-[12px] rounded-tr-[12px] border-l border-[var(--border)] bg-[var(--background)] px-4 py-5"><p className="text-[10px] font-semibold text-[var(--muted)]">고른 고객</p>{detail && <><h4 className="text-[19px] font-semibold">{detail[1] || "-"}</h4><div className="border-t border-[var(--border)] pt-2.5"><CustomerRows entry={detail} points={points[detail[0]] ?? 0} /></div><p className="mt-auto text-[11px] text-[var(--muted)]">확인을 누르면 이 고객으로 결제합니다.</p></>}</aside></div></div>
      </div>
    </Layer>}

    {/* 09H — 팝업 위 팝업 위 확인. 정보를 한 번 더 보여주고, 예를 누르면 두 창이 함께 닫힌다. */}
    {confirming && <Layer label="고객 확인" level={2} onBackdrop={() => setConfirming(null)} width="w-[380px]">
      <h3 className="text-[19px] font-semibold">이 고객님으로 할까요?</h3>
      <p className="mt-3 text-[12px] text-[var(--muted)]">확인하면 고르기 창까지 함께 닫고 결제 등록으로 돌아갑니다.</p>
      <div className="mt-4 rounded-[9px] bg-[var(--background)] p-3"><CustomerRows entry={confirming} points={points[confirming[0]] ?? 0} /></div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button className={button("md", "secondary")} onClick={() => setConfirming(null)} type="button">닫기</button>
        <button className={button("md", "primary")} onClick={() => { setPicked(confirming); settle(confirming); setProbed(""); setDetail(null); setConfirming(null); }} type="button">이 고객으로 결제</button>
      </div>
    </Layer>}
  </>;
}
