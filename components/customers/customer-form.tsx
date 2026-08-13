"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { saveCustomer } from "../../app/customer-actions";
import { formatPhone } from "../../lib/phone";
import type { JsonObject, JsonValue, SalonRecord } from "../../lib/salon-domain";
import { button, control, focusRing } from "../button";
import { SubmitButton } from "../submit-button";
import { typeScale } from "../type";

/** 등록 칸 한 줄의 폭. 확인 패널도 같은 값을 쓴다 — 두 칸이 나란히 서려면 폭이 같아야 한다. */
const column = "w-[380px]";
const input = `${control} min-w-0 w-full`;
const label = "grid gap-1 text-xs font-medium text-[var(--muted)]";
/** 확인 패널의 값 줄. 입력칸과 같은 높이(h-10)라 두 칸의 줄이 서로 맞는다. */
const readout = "flex h-10 items-center rounded-[var(--radius-control)] bg-[var(--surface)] px-3 text-sm";

/** 목록이 보내주는 최소 색인. 등록 폼과 같은 순서다 — 패널이 그 순서 그대로 보여준다. */
export type DuplicateEntry = readonly [id: string, name: string, gender: string, phone: string, joinedAt: string, memo: string];

/**
 * 어디가 같은지 다섯 갈래. 강한 일치가 앞에 온다.
 *
 * "중복입니다" 한 마디로는 사용자가 판단할 수 없다. 번호까지 같으면 대개 같은 사람이고,
 * 이름만 같으면 동명이인이며, 뒷자리만 같으면 앞자리를 잘못 친 것일 수 있다 —
 * 셋은 서로 다른 상황이라 서로 다른 행동으로 이어진다.
 */
const tiers = [
  { label: "이름과 휴대전화가 같습니다", name: true, phone: true },
  { label: "휴대전화가 같습니다", name: false, phone: true },
  { label: "이름과 휴대전화 뒷자리가 같습니다", name: true, phone: true },
  { label: "휴대전화 뒷자리가 같습니다", name: false, phone: true },
  { label: "이름이 같습니다", name: true, phone: false },
] as const;

const genders: Record<string, string> = { female: "여성", male: "남성" };

/**
 * 이름은 **두 글자부터** 본다. 한 글자로 858명을 훑으면 "김" 한 번에 수십 명이 걸려
 * 패널이 등록을 시작하자마자 열린다. 번호는 뒷자리 네 자리가 모여야 의미가 생긴다.
 *
 * 양쪽 번호를 **모두 숫자만 남겨** 비교한다. 옮겨온 고객은 `010 - 7124 - 2419` 처럼
 * 공백과 하이픈이 섞인 채로 저장돼 있어서(실측), 한쪽만 정리하면 번호가 똑같은 사람도
 * "뒷자리만 같음" 으로 떨어진다.
 */
export function findDuplicates(index: readonly DuplicateEntry[], name: string, phone: string, excludeId?: string) {
  const digits = phone.replace(/\D/g, "");
  const typed = name.trim();
  const tail = digits.length >= 4 ? digits.slice(-4) : "";
  if (!tail && typed.length < 2) return [];
  return index
    .map((entry) => {
      const [id, otherName, , otherPhone] = entry;
      if (id === excludeId) return null;
      const other = otherPhone.replace(/\D/g, "");
      const sameName = typed.length >= 2 && otherName.trim() === typed;
      const samePhone = digits.length >= 8 && other === digits;
      const sameTail = Boolean(tail) && !samePhone && other.endsWith(tail);
      const tier = sameName && samePhone ? 0 : samePhone ? 1 : sameName && sameTail ? 2 : sameTail ? 3 : sameName ? 4 : -1;
      return tier < 0 ? null : { entry, tier };
    })
    .filter((match): match is { entry: DuplicateEntry; tier: number } => match !== null)
    .sort((left, right) => left.tier - right.tier);
}

/**
 * 고객 등록 · 수정 — **6칸 1열.**
 *
 * 22칸 3열이었다. 그중 등급·그룹·방문동기·생일·집전화·주소·이메일·닉네임·포인트카드·
 * 패밀리번호는 화면 어디에서도 읽지 않아 영구히 삭제했다. 남은 칸은 사용자가 손님을
 * 다시 찾을 때 쓰는 것들뿐이다.
 *
 * 1열인 이유는 팝업이기 때문이다. 3열이면 Tab 이 가로로 튀어 눈과 손이 갈라진다.
 *
 * SMS 수신과 방문 구분은 칸을 두지 않고 **숨은 값으로 이어받는다.** 칸을 없앤다고
 * 값까지 없애면 수신 거부해 둔 손님이 수정 한 번에 수신 동의로 돌아간다.
 */
export function CustomerForm({ customer, duplicateIndex = [], returnTo, settings, today }: {
  customer?: SalonRecord<JsonValue>;
  /** 팝업이 열렸을 때만 내려온다. 목록 화면에는 실리지 않는다. */
  duplicateIndex?: readonly DuplicateEntry[];
  returnTo: string;
  settings: JsonObject;
  /** 서울 기준 오늘. 첫 방문날짜의 기본값이다. */
  today: string;
}) {
  const current = customer && typeof customer.value === "object" && customer.value !== null && !Array.isArray(customer.value) ? customer.value as JsonObject : {};
  const string = (key: string) => typeof current[key] === "string" ? current[key] : "";
  const defaultGender = !customer && ["female", "male", "unspecified"].includes(String(settings.defaultGender)) ? String(settings.defaultGender) : "unspecified";
  const smsOptIn = customer ? current.smsOptIn !== false : settings.defaultSmsOptIn !== false;
  const points = typeof current.points === "number" ? current.points : 0;

  const [name, setName] = useState(string("name"));
  const [phone, setPhone] = useState(string("phone"));
  const [confirmed, setConfirmed] = useState(false);
  const duplicates = useMemo(() => findDuplicates(duplicateIndex, name, phone, customer?.id), [duplicateIndex, name, phone, customer?.id]);
  const [match] = duplicates;
  // "다른 사람이에요" 를 누르면 패널이 접힌다. 판단이 끝난 화면에 확인 패널을 남겨두면
  // 사용자는 무엇을 더 해야 하는지 다시 읽어야 한다.
  const open = duplicates.length > 0 && !confirmed;
  const tier = match ? tiers[match.tier] : null;

  return <form action={saveCustomer} aria-label={customer ? "고객 정보 수정" : "고객 등록"} className="mt-5 flex items-stretch">
    <div className={`grid ${column} shrink-0 content-start gap-4`}>
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="smsOptIn" type="hidden" value={smsOptIn ? "on" : "off"} />
      <input name="visitType" type="hidden" value={string("visitType") || "first"} />
      {/* 옆 확인 패널이 켜 주는 값이다. 폼 맨 밑의 체크박스는 없앴다 — 늘 켜는 체크는 확인이 아니다. */}
      <input name="allowDuplicate" type="hidden" value={confirmed ? "on" : ""} />
      {customer && <input name="customerId" type="hidden" value={customer.id} />}

      <label className={label}>성명<input className={input} name="name" onChange={(event) => { setName(event.target.value); setConfirmed(false); }} required value={name} /></label>
      <label className={label}>성별<select className={input} defaultValue={customer ? string("gender") || "unspecified" : defaultGender} name="gender"><option value="female">여성</option><option value="male">남성</option><option value="unspecified">미지정</option></select></label>
      <label className={label}>휴대전화<input className={input} name="phone" onChange={(event) => { setPhone(event.target.value); setConfirmed(false); }} placeholder="010-0000-0000" required type="tel" value={phone} /></label>
      {/* 포인트는 폼이 만드는 값이 아니다 — 결제마다 원장이 쌓고, 조정은 사유가 붙는 별도 경로다. */}
      {customer && <p className={label}>포인트<span className="flex h-10 items-center text-sm tabular-nums text-[var(--foreground)]">{points.toLocaleString("ko-KR")}P<span className="ml-2 text-xs font-normal text-[var(--muted)]">결제와 포인트 조정으로만 움직입니다.</span></span></p>}
      {/* 오늘 등록하는 손님은 대개 오늘 처음 온다. 기본값을 오늘로 두면 대부분 손대지 않아도 맞다.
          옮겨온 고객은 `2020-02-18T12:00:00.000Z` 처럼 시각까지 들고 있다 — `type="date"` 는
          그 값을 읽지 못해 칸이 통째로 비어 보였고, 그대로 저장하면 첫 방문날짜가 지워졌다. */}
      <label className={label}>첫 방문날짜<input className={input} defaultValue={string("joinedAt").slice(0, 10) || today} name="joinedAt" type="date" /></label>
      {/* 잔액을 덮어쓰면 원장에 없는 돈이 생긴다. 수정 화면에서는 칸 자체를 두지 않는다. */}
      {!customer && <label className={label}>선결제 금액<input className={input} defaultValue="0" inputMode="numeric" name="prepaidWon" /></label>}
      <label className={label}>메모 (150자 이하)<textarea className={`${input} h-20 py-2`} defaultValue={string("memo")} maxLength={150} name="memo" /></label>

      {/* 패널이 열려 있는 동안에는 저장 버튼을 그리지 않는다. 화면에 살아 있는 주된 행동은 언제나 하나다 —
          지금은 "이 사람이 그 사람인가" 를 정하는 것이고, 그 버튼은 옆 패널에 있다.
          버튼과 같은 높이(h-11)를 차지해 왼쪽 칸의 길이가 흔들리지 않는다. */}
      {open
        ? <p className={`flex h-11 items-center ${typeScale.meta} text-[var(--warning)]`} role="status">옆에서 같은 고객인지 확인해 주세요.</p>
        : <SubmitButton extra="w-full">{customer ? "고객 정보 저장" : "고객 등록"}</SubmitButton>}
      {/* 되돌리기는 저장 버튼 **아래**다. 확인을 끝낸 뒤에야 필요한 길이라 그전에는 자리도 차지하지 않는다. */}
      {confirmed && duplicates.length > 0 && <button className={`${typeScale.meta} text-[var(--muted)] underline ${focusRing}`} onClick={() => setConfirmed(false)} type="button">중복 확인 되돌리기</button>}
    </div>

    {/*
      두루마리처럼 옆으로 펴진다. `grid-template-columns` 를 `0fr → 1fr` 로 옮기면
      안쪽 내용의 실제 폭을 재지 않고도 펼침이 애니메이션된다(JS 측정도, 고정 높이도 필요 없다).
      곡선과 시간은 팝업이 열릴 때(`dialog-in`)와 같은 값이라 두 움직임이 한 몸으로 읽힌다.

      칸 사이 여백은 **패널 자신의 `ml-5`** 다. 바깥 `gap` 이나 안쪽 `pl-5` 로 두면
      접힌 상태에서도 20px 이 남는다(`border-box` 라 폭 0에도 패딩은 자리를 차지한다).
      그러면 폼이 400px 이 되고, 헤더가 그 폭에 맞춰 늘어나 닫기 버튼만 오른쪽으로 밀린다.
      마진은 `overflow-hidden` 이 내용과 함께 잘라내므로 접힌 폭이 정확히 380px 로 남는다.
    */}
    <div aria-hidden={!open} className={`grid overflow-hidden transition-[grid-template-columns] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${open ? "grid-cols-[1fr]" : "grid-cols-[0fr]"}`}>
      <div className="min-w-0 overflow-hidden">
        <section aria-label="중복 고객 확인" className={`ml-5 flex h-full ${column} flex-col rounded-[var(--radius-card)] border border-[var(--warning)] bg-[var(--warning-soft)] p-4`}>
          <p className={`${typeScale.micro} text-[var(--muted)]`}>이미 있는 고객</p>
          {/* 무엇이 같은지가 이 패널의 답이다. 가장 크게 적는다. */}
          <h3 className={`mt-1 ${typeScale.title} text-[var(--accent-ink)]`}>{tier?.label}</h3>

          {/* 왼쪽 칸과 **같은 순서**로 나열한다 — 성명·성별·휴대전화·첫 방문날짜·메모.
              순서가 다르면 사용자가 두 칸을 번갈아 보며 어느 줄이 어느 줄인지 매번 다시 찾아야 한다. */}
          {match && tier && <dl className="mt-4 grid gap-3">
            {([["성명", match.entry[1] || "-", tier.name], ["성별", genders[match.entry[2]] ?? "미지정", false], ["휴대전화", formatPhone(match.entry[3].replace(/\D/g, "")) || "휴대전화 없음", tier.phone], ["첫 방문날짜", match.entry[4].slice(0, 10) || "기록 없음", false]] as const)
              .map(([term, description, same]) => <div className="grid gap-1" key={term}>
                <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">{term}{same && <span className={`${typeScale.micro} rounded-[var(--radius-chip)] bg-[var(--warning)] px-1.5 py-px text-white`}>같음</span>}</dt>
                <dd className={`${readout} tabular-nums${same ? " font-semibold" : ""}`}>{description}</dd>
              </div>)}
            <div className="grid gap-1">
              <dt className="text-xs font-medium text-[var(--muted)]">메모</dt>
              <dd className={`${readout} h-20 items-start whitespace-pre-wrap py-2`}>{match.entry[5].trim() || "없음"}</dd>
            </div>
          </dl>}

          {duplicates.length > 1 && <p className={`mt-3 ${typeScale.micro} text-[var(--muted)]`}>비슷한 고객 {duplicates.length - 1}명이 더 있습니다.</p>}

          {/* 확인 다음에 할 일은 둘 중 하나다 — 그 고객으로 가거나, 다른 사람이라고 말하거나. */}
          <div className="mt-auto grid gap-2 pt-4">
            {match && <Link className={button("md", "secondary", "w-full")} href={`/customers?customer=${match.entry[0]}`}>이 고객 열기</Link>}
            <button className={button("md", "primary", "w-full")} onClick={() => setConfirmed(true)} type="button">다른 사람이에요</button>
          </div>
        </section>
      </div>
    </div>
  </form>;
}
