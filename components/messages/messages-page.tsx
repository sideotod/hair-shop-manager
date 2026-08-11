"use client";

import Link from "next/link";
import { memo, useCallback, useMemo, useState } from "react";

import { queueMessage, saveAutomationRule } from "../../app/message-actions";
import { button } from "../button";
import { PageToolbar } from "../page-toolbar";
import { SubmitButton } from "../submit-button";
import { eligibleRecipients, messageBytes, messageType, type MessageSegment, type Recipient } from "../../lib/messages";
import type { JsonObject, JsonValue, SalonRecord } from "../../lib/salon-domain";

const input = "h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";
const segments: readonly [MessageSegment, string][] = [["all", "전체 고객"], ["women", "여성 고객"], ["men", "남성 고객"], ["power", "파워 고객"]];

type Props = { customers: readonly Recipient[]; messages: readonly SalonRecord<JsonValue>[]; automations: readonly SalonRecord<JsonValue>[]; settings: JsonObject; requestKey: string; error?: string; notice?: string; segment?: string };
function value(record: Recipient) { return typeof record.value === "object" && record.value !== null && !Array.isArray(record.value) ? record.value as JsonObject : {}; }
function text(record: Recipient, key: string, fallback = "-") { const item = value(record)[key]; return typeof item === "string" ? item : fallback; }
function recipientName(record: Recipient) { return text(record, "name", record.id); }

/** `{고객명}` 같은 템플릿 변수를 골드로 띄운다. Figma 문자 본문 규칙. */
function TemplateText({ value: body }: { value: string }) {
  return <>{body.split(/(\{[^{}]{1,20}\})/).map((part, index) => part.startsWith("{") && part.endsWith("}")
    ? <span className="font-medium text-[var(--accent)]" key={index}>{part}</span>
    : <span key={index}>{part}</span>)}</>;
}

const maxRecipients = 3;
/** 검색 결과로 한 번에 보여줄 최대 인원. 이름 몇 글자면 대개 한 자릿수로 좁혀진다. */
const maxMatches = 20;

function RecipientRow({ customer, checked, disabled, onToggle }: { customer: Recipient; checked: boolean; disabled: boolean; onToggle: (id: string, checked: boolean) => void }) {
  const optedOut = value(customer).smsOptIn === false;
  return <label className={`flex items-center gap-2 rounded-[var(--radius-control)] border px-3 py-2 text-sm ${checked ? "border-[var(--brand)] bg-[var(--brand-soft)]" : "border-[var(--border)]"} ${disabled ? "opacity-45" : ""}`}>
    <input checked={checked} disabled={disabled} name="recipientIds" onChange={(event) => onToggle(customer.id, event.target.checked)} type="checkbox" value={customer.id} />
    {recipientName(customer)} <span className="text-xs text-[var(--muted)]">{optedOut ? "수신 거부" : "수신 동의"}</span>
  </label>;
}

/**
 * 858명 중 최대 3명을 고르는 자리다. 전원을 항상 그려 두면 두 가지가 동시에 깨졌다.
 *   1) 사람: 13,228px 목록을 288px 창으로 훑어야 이름 하나를 찾는다(검색 없음).
 *   2) 기계: 본문 한 글자마다 858개 라벨이 다시 그려져 한글 입력이 120–575ms 씩 끊겼다(실측).
 * 그래서 목록을 지우고 검색을 넣는다. 화면에는 "고른 사람 + 검색에 걸린 사람"만 남는다.
 * 가상화가 아니라 검색인 이유: 여기서 필요한 건 많이 보여주기가 아니라 적게 보여주기다.
 *
 * `memo` 는 성능 장식이 아니라 위 2)의 수정 그 자체다. 부모의 `draft`(본문) 상태가 바뀌어도
 * 이 트리는 props 가 그대로면 다시 그리지 않는다 — 그래서 `onToggle` 이 `useCallback` 이어야 한다.
 */
const RecipientPicker = memo(function RecipientPicker({ customers, selectedIds, onToggle }: { customers: readonly Recipient[]; selectedIds: readonly string[]; onToggle: (id: string, checked: boolean) => void }) {
  const [search, setSearch] = useState("");
  const selected = useMemo(() => selectedIds.map((id) => customers.find((customer) => customer.id === id)).filter((customer): customer is Recipient => customer !== undefined), [customers, selectedIds]);
  const term = search.trim();
  // 검색어가 없을 때도 앞쪽 몇 명은 그대로 보인다. 빈 상자로 시작하면 "무엇을 입력해야 하는지" 알 수 없고,
  // 서버 렌더에 체크박스가 하나도 없어 JS 없이는 수신자를 아예 고를 수 없다.
  const matches = useMemo(() => {
    const rest = customers.filter((customer) => !selectedIds.includes(customer.id));
    return term ? rest.filter((customer) => recipientName(customer).includes(term)) : rest;
  }, [customers, selectedIds, term]);
  const full = selectedIds.length >= maxRecipients;

  return <fieldset className="col-span-2">
    <legend className="text-sm font-bold">개별 수신자 (최대 {maxRecipients}명)</legend>
    <p className="mt-1 text-xs text-[var(--muted)]">선택하면 단체 대상보다 개별 선택을 우선합니다. SMS 수신 거부 고객은 제외됩니다.</p>
    {/* 정원이 차도 검색은 잠그지 않는다. 3명을 고른 뒤 한 명을 바꾸려면 먼저 후보를 찾아야 하는데,
        입력창까지 막으면 "해제 → 검색 → 선택" 순서를 강요당한다. 정원 제한은 체크박스가 지킨다. */}
    <label className="mt-2 grid gap-1 text-xs font-medium text-[var(--muted)]"><span>고객 이름으로 찾기</span><input autoComplete="off" className={input} onChange={(event) => setSearch(event.target.value)} placeholder="이름 일부를 입력하세요" type="search" value={search} /></label>
    {/* 정원이 찼다는 사실은 색이 아니라 글로도 알려야 한다. 예전에는 4번째 클릭이 조용히 무시됐다. */}
    <p aria-live="polite" className="mt-2 text-xs text-[var(--muted)]" role="status">
      현재 <span className="tabular-nums">{selectedIds.length}</span>/{maxRecipients}명 선택.{full ? ` 최대 인원입니다. 다른 고객을 고르려면 먼저 선택을 해제하세요.` : term ? ` "${term}" 검색 결과 ${matches.length.toLocaleString("ko-KR")}명.` : ` 등록 고객 ${customers.length.toLocaleString("ko-KR")}명 중에서 찾습니다.`}
    </p>
    <div className="mt-2 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1" data-message-recipient-list>
      {selected.map((customer) => <RecipientRow checked customer={customer} disabled={false} key={customer.id} onToggle={onToggle} />)}
      {matches.slice(0, maxMatches).map((customer) => <RecipientRow checked={false} customer={customer} disabled={full} key={customer.id} onToggle={onToggle} />)}
    </div>
    {term && matches.length === 0 && <p className="mt-2 text-sm text-[var(--muted)]">&quot;{term}&quot;와(과) 일치하는 고객이 없습니다.</p>}
    {matches.length > maxMatches && <p className="mt-2 text-xs text-[var(--muted)]">{customers.length.toLocaleString("ko-KR")}명 중 <span className="tabular-nums">{maxMatches}</span>명을 표시했습니다. 이름을 입력해 좁히세요.</p>}
    {customers.length === 0 && <p className="mt-2 text-sm text-[var(--muted)]">등록된 고객이 없어 개별 발송 대상을 선택할 수 없습니다.</p>}
  </fieldset>;
});


export function MessagesPage({ customers, messages, automations, settings, requestKey, error, notice, segment: selectedSegment }: Props) {
  const [draft, setDraft] = useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const segment = segments.some(([name]) => name === selectedSegment) ? selectedSegment as MessageSegment : "all";
  const powerMinimum = typeof settings.powerCustomerMinPoints === "number" && settings.powerCustomerMinPoints >= 0 ? settings.powerCustomerMinPoints : 100;
  const eligible = eligibleRecipients(customers, segment, powerMinimum, selectedRecipientIds);
  const smsRemaining = typeof settings.smsRemaining === "number" ? settings.smsRemaining : 0;
  const smsEnabled = settings.smsEnabled !== false;
  // 빈 문자열도 fallback 을 태운다. `typeof === "string"` 만 보면 저장된 `""` 가 그대로 통과해
  // "보내는 사람: " 처럼 라벨만 남는다(실측).
  const ownerName = typeof settings.ownerName === "string" && settings.ownerName.trim() ? settings.ownerName.trim() : "서원";
  // 목록 자식이 `memo` 로 `draft` 변경에서 분리되려면 이 콜백의 신원이 렌더마다 바뀌면 안 된다.
  const toggleRecipient = useCallback((id: string, checked: boolean) => setSelectedRecipientIds((ids) => checked ? ids.length < maxRecipients ? [...ids, id] : ids : ids.filter((item) => item !== id)), []);

  return <main className="min-w-0 px-7 pb-6 pt-5">
    <PageToolbar description="모든 발송은 저장 전용 dry-run입니다. 실제 전달 여부는 확인하거나 표시하지 않습니다."><span className="rounded-full border border-[var(--brand)] px-3 py-2 text-sm font-bold text-[var(--brand)]">상태: dry-run · SMS 기능 {smsEnabled ? "켜짐" : "꺼짐"}</span></PageToolbar>
    {!smsEnabled && <p className="mt-5 rounded-[var(--radius-card)] border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm font-bold" role="status">SMS 기능이 꺼져 있어 문자 요청을 저장할 수 없습니다. 설정의 고객 정책에서 SMS 기능을 켜세요.</p>}
    {error && <p className="mt-5 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">입력 내용을 수정하세요: {error}</p>}{notice && <p className="mt-5 rounded-[var(--radius-card)] border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]" role="status">{notice} · 실제 발송 없음</p>}
    <nav aria-label="문자 작업 영역" className="mt-5 flex gap-1 border-b border-[var(--border)]"><a className={button("md", "primary")} href="#compose">직접 발송</a><a className={button("md", "secondary", "text-[var(--muted)] hover:text-[var(--brand)]")} href="#automation">자동 규칙</a><a className={button("md", "secondary", "text-[var(--muted)] hover:text-[var(--brand)]")} href="#history">발송 내역</a></nav>
    {/* 600+320 은 셸 바닥에서 31px 넘쳤다. 두 칸 다 바닥에서 들어가는 폭으로 내린다. */}
    <div className="mt-5 grid grid-cols-[minmax(520px,1.3fr)_minmax(300px,0.7fr)] gap-5">
      <section aria-labelledby="compose-title" className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5" id="compose"><div className="flex items-center justify-between"><h2 className="font-bold" id="compose-title">문자 작성</h2><span className="text-sm text-[var(--muted)]">잔여 <span className="tabular-nums">{smsRemaining.toLocaleString("ko-KR")}</span>건</span></div>
        <form className="mt-4 flex items-end gap-2" method="get"><label className="grid flex-1 gap-1 text-xs font-medium text-[var(--muted)]"><span>단체 대상 미리보기</span><select className={input} defaultValue={segment} name="segment">{segments.map(([name, label]) => <option key={name} value={name}>{label}</option>)}</select></label><button className={button("md", "secondary", "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]")} type="submit">대상 확인</button></form>
        <form action={queueMessage} aria-label="문자 dry-run 저장" className="mt-5"><fieldset disabled={!smsEnabled} className="grid grid-cols-2 gap-4"><input name="requestKey" type="hidden" value={requestKey} /><input name="segment" type="hidden" value={segment} />
          <RecipientPicker customers={customers} onToggle={toggleRecipient} selectedIds={selectedRecipientIds} />
          <label className="col-span-2 grid gap-1 text-xs font-medium text-[var(--muted)]"><span>문자 내용</span><textarea className={`${input} h-28 py-3`} maxLength={2000} name="text" onChange={(event) => setDraft(event.target.value)} placeholder="발송할 내용을 입력하세요." required value={draft} /></label><label className="grid gap-1 text-xs font-medium text-[var(--muted)]"><span>예약 발송 (비우면 즉시 저장)</span><input className={input} name="scheduledAt" type="datetime-local" /></label><div className="grid content-end gap-1 text-sm"><strong>보내는 사람: {ownerName}</strong><strong>메시지 형식: {messageType(draft.trim())}</strong><span className="text-[var(--muted)]"><span className="tabular-nums">{messageBytes(draft.trim())}</span> / 90 bytes · LMS는 90 bytes 초과</span></div><SubmitButton extra="col-span-2 w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">{smsEnabled ? `dry-run 저장 (${eligible.length}건 예상 차감)` : "SMS 기능 꺼짐"}</SubmitButton></fieldset></form>
      </section>
      <aside className="space-y-5"><section aria-labelledby="preview-title" className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="font-bold" id="preview-title">대상 미리보기</h2><p className="mt-1 text-sm text-[var(--muted)]">{selectedRecipientIds.length ? "개별 선택" : segments.find(([name]) => name === segment)?.[1]} · 수신 동의 <span className="tabular-nums">{eligible.length}</span>명</p><div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--background)] p-3" data-message-body-preview><p className="text-[11px] font-medium tracking-[0.06em] text-[var(--muted)]">보내는 사람 {ownerName} · {messageType(draft.trim())} · <span className="tabular-nums">{messageBytes(draft.trim())}</span>/90 bytes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{draft.trim() ? <TemplateText value={draft} /> : <span className="text-[var(--muted)]">문자 내용을 입력하면 여기에 미리 보입니다. {"{고객명}"} 같은 변수는 발송 시 채워집니다.</span>}</p></div>{eligible.length ?<><ul className="mt-3 max-h-[480px] divide-y divide-[var(--border)] overflow-y-auto pr-1" data-message-recipient-preview>{eligible.slice(0, maxMatches).map((customer) => <li className="py-2 text-sm" key={customer.id}>{recipientName(customer)}</li>)}</ul>{eligible.length > maxMatches && <p className="mt-2 text-xs text-[var(--muted)]">앞 <span className="tabular-nums">{maxMatches}</span>명만 표시했습니다. 저장 시에는 <span className="tabular-nums">{eligible.length.toLocaleString("ko-KR")}</span>명 전원에게 반영됩니다.</p>}</> : <p className="mt-3 rounded-[var(--radius-card)] bg-[var(--background)] p-3 text-sm text-[var(--muted)]">발송 가능한 고객이 없습니다. 고객의 SMS 수신 동의를 확인하세요.</p>}</section><section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5" id="history"><h2 className="font-bold">최근 dry-run 저장</h2>{messages.length ? <ul className="mt-2 divide-y divide-[var(--border)]">{messages.slice(-5).reverse().map((message) => <li className="py-2 text-sm" key={message.id}><strong>{text(message, "channel")}</strong><span className="ml-2">상태: {text(message, "status")}</span></li>)}</ul> : <p className="mt-2 text-sm text-[var(--muted)]">저장된 문자 요청이 없습니다.</p>}</section></aside>
    </div>
    <section aria-labelledby="automation-title" className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5" id="automation"><div className="flex items-center justify-between"><div><h2 className="font-bold" id="automation-title">자동 문자</h2><p className="mt-1 text-sm text-[var(--muted)]">자동 발송은 설정만 저장하며, 실제 전달은 수행하지 않습니다.</p></div><Link className="text-sm text-[var(--brand)]" href="/settings?section=messages">문자 자동화 안내</Link></div><div className="mt-4 grid grid-cols-3 gap-3">{automations.map((rule) => <form action={saveAutomationRule} className="rounded-[var(--radius-card)] bg-[var(--background)] p-4" key={rule.id}><input name="id" type="hidden" value={rule.id} /><input name="label" type="hidden" value={text(rule, "label")} /><input name="text" type="hidden" value={text(rule, "text", "안내 문자")} /><input name="schedule" type="hidden" value={text(rule, "schedule")} /><label className="flex items-center justify-between gap-3 text-sm font-bold">{text(rule, "label")}<input defaultChecked={text(rule, "status") === "사용"} name="enabled" type="checkbox" /></label><p className="mt-2 text-xs text-[var(--muted)]">{text(rule, "schedule")} · 상태: dry-run</p><button className="mt-3 text-sm text-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]" type="submit">설정 저장</button></form>)}{automations.length === 0 && <p className="col-span-3 rounded-[var(--radius-card)] bg-[var(--background)] p-4 text-sm text-[var(--muted)]">자동 문자 설정이 없습니다.</p>}</div></section>
  </main>;
}
