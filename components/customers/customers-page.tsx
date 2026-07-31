import Link from "next/link";

import { archiveCustomer, completeWaitingCustomer, saveCustomer, saveCustomerPolicy, saveWaitingCustomer } from "../../app/customer-actions";
import { AppShell } from "../app-shell";
import type { JsonObject, JsonValue, LedgerEntry, SalonRecord } from "../../lib/salon-domain";

const searchModes = [
  ["phone-or-name", "핸드폰 뒷번호/고객명"], ["nickname", "닉네임"], ["phone", "전화번호 뒷번호"], ["group", "그룹명"], ["memo", "메모"],
  ["address", "주소"], ["motive", "방문동기"], ["email", "이메일"], ["point-card", "포인트 카드"], ["family", "패밀리번호"],
] as const;
const segments = [["power", "파워 고객"], ["sales", "매출 기준"], ["grade", "등급별"], ["group", "그룹별"], ["gender", "성별"], ["motive", "방문동기"], ["recent", "최근 방문"], ["nonvisit", "미방문"], ["birthday", "생일 대상"]] as const;
const historyTabs = ["기본 정보", "예약", "시술·결제", "상품", "포인트", "쿠폰·선불", "문자"] as const;

type Props = {
  customers: readonly SalonRecord<JsonValue>[];
  waitingCustomers: readonly SalonRecord<JsonValue>[];
  settings: JsonObject;
  bookings: readonly SalonRecord<JsonValue>[];
  messages: readonly SalonRecord<JsonValue>[];
  ledger: readonly LedgerEntry[];
  selectedCustomerId?: string;
  query?: string;
  mode?: string;
  segment?: string;
  showNew?: boolean;
  showWaiting?: boolean;
};

function value(record: SalonRecord<JsonValue>) {
  return typeof record.value === "object" && record.value !== null && !Array.isArray(record.value) ? record.value as JsonObject : {};
}

function text(record: SalonRecord<JsonValue>, key: string, fallback = "-") {
  const field = value(record)[key];
  return typeof field === "string" ? field : fallback;
}

function number(record: SalonRecord<JsonValue>, key: string) {
  const field = value(record)[key];
  return typeof field === "number" ? field : 0;
}

function matchesSearch(record: SalonRecord<JsonValue>, mode: string, query: string) {
  if (!query) return true;
  const customer = value(record);
  const fields: Record<string, string[]> = {
    "phone-or-name": ["phone", "name"], nickname: ["nickname"], phone: ["phone"], group: ["group"], memo: ["memo"], address: ["address"], motive: ["motive"], email: ["email"], "point-card": ["pointCard"], family: ["familyNumber"],
  };
  return (fields[mode] ?? fields["phone-or-name"]).some((key) => typeof customer[key] === "string" && customer[key].includes(query));
}

function matchesSegment(record: SalonRecord<JsonValue>, segment?: string) {
  if (!segment) return true;
  const customer = value(record);
  if (segment === "power") return number(record, "points") >= 100;
  if (segment === "sales") return typeof customer.salesWon === "number" && customer.salesWon >= 100000;
  if (segment === "recent") return customer.visitType === "repeat";
  if (segment === "nonvisit") return customer.visitType === "first";
  if (segment === "birthday") return typeof customer.birthday === "string" && customer.birthday.length > 0;
  return typeof customer[segment] === "string" && String(customer[segment]).length > 0;
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="grid gap-1 text-xs font-medium text-[var(--muted)]"><span>{label}</span>{children}</label>;
}

const input = "h-10 rounded-[8px] border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)]";

function CustomerForm({ customer }: { customer?: SalonRecord<JsonValue> }) {
  const current = customer ? value(customer) : {};
  const string = (key: string) => typeof current[key] === "string" ? current[key] : "";
  const checked = (key: string, expected = "on") => key === "smsOptIn" ? current[key] !== false : string(key) === expected;
  return (
    <form action={saveCustomer} aria-label="고객 등록 및 수정" className="grid grid-cols-3 gap-4">
      {customer && <input name="customerId" type="hidden" value={customer.id} />}
      <Field label="성명"><input className={input} defaultValue={string("name")} name="name" required /></Field>
      <Field label="성별"><select className={input} defaultValue={string("gender") || "unspecified"} name="gender"><option value="female">여성</option><option value="male">남성</option><option value="unspecified">미지정</option></select></Field>
      <Field label="휴대전화"><input className={input} defaultValue={string("phone")} name="phone" placeholder="010-0000-0000" /></Field>
      <label className="col-span-3 flex items-center gap-2 text-sm"><input defaultChecked={current.phoneAbsent === true} name="phoneAbsent" type="checkbox" /> 휴대전화 없음</label>
      <Field label="일반 전화"><input className={input} defaultValue={string("telephone")} name="telephone" /></Field>
      <Field label="주소 / 우편번호"><input className={input} defaultValue={string("address")} name="address" /></Field>
      <Field label="이메일"><input className={input} defaultValue={string("email")} name="email" type="email" /></Field>
      <Field label="SMS 수신"><select className={input} defaultValue={checked("smsOptIn") ? "on" : "off"} name="smsOptIn"><option value="on">수신 동의</option><option value="off">수신 거부</option></select></Field>
      <Field label="생년월일"><input className={input} defaultValue={string("birthday")} name="birthday" type="date" /></Field>
      <Field label="생일 구분"><span className="flex h-10 items-center gap-4 text-sm text-[var(--foreground)]"><label><input defaultChecked={string("birthdayCalendar") !== "lunar"} name="birthdayCalendar" type="radio" value="solar" /> 양력</label><label><input defaultChecked={string("birthdayCalendar") === "lunar"} name="birthdayCalendar" type="radio" value="lunar" /> 음력</label></span></Field>
      <Field label="닉네임"><input className={input} defaultValue={string("nickname")} name="nickname" /></Field>
      <Field label="고객 등급"><select className={input} defaultValue={string("grade") || "일반"} name="grade"><option>일반</option><option>VIP1</option><option>VIP2</option></select></Field>
      <Field label="고객 그룹"><input className={input} defaultValue={string("group")} name="group" /></Field>
      <Field label="방문 동기"><input className={input} defaultValue={string("motive")} name="motive" /></Field>
      <Field label="포인트"><input className={input} defaultValue={String(number(customer ?? { value: {}, id: "", kind: "", createdAt: "", updatedAt: "", archivedAt: null }, "points"))} min="0" name="points" type="number" /></Field>
      <Field label="포인트 카드"><input className={input} defaultValue={string("pointCard")} name="pointCard" /></Field>
      <Field label="패밀리 번호"><input className={input} defaultValue={string("familyNumber")} name="familyNumber" /></Field>
      <Field label="첫 만남 날짜"><input className={input} defaultValue={string("firstMetAt")} name="firstMetAt" type="date" /></Field>
      <Field label="가입일"><input className={input} defaultValue={string("joinedAt")} name="joinedAt" type="date" /></Field>
      <Field label="방문 구분"><select className={input} defaultValue={string("visitType") || "first"} name="visitType"><option value="first">첫 방문</option><option value="repeat">재방문</option></select></Field>
      <Field label="메모 (150자 이하)"><textarea className={`${input} h-20 py-2`} defaultValue={string("memo")} maxLength={150} name="memo" /></Field>
      <label className="col-span-2 flex items-center gap-2 self-end text-sm"><input name="allowDuplicate" type="checkbox" /> 이름 또는 휴대전화 중복 등록 허용</label>
      <fieldset className="col-span-3 grid grid-cols-3 gap-4 rounded-[10px] bg-[var(--background)] p-4"><legend className="px-1 text-sm font-bold">등록 직후 작업</legend><Field label="초기 예약 날짜"><input className={input} name="initialBookingDate" type="date" /></Field><Field label="초기 예약 시간"><input className={input} name="initialBookingTime" type="time" /></Field><Field label="초기 예약 시술"><input className={input} name="initialBookingService" /></Field><label className="text-sm"><input name="initialSms" type="checkbox" /> 등록 직후 SMS 발송</label><label className="text-sm"><input name="registerWaiting" type="checkbox" /> 대기 고객 동시 등록</label><Field label="대기 메모"><input className={input} name="waitingMemo" /></Field></fieldset>
      <button className="col-span-3 rounded-[9px] bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white" type="submit">{customer ? "고객 정보 저장" : "고객 등록"}</button>
    </form>
  );
}

export function CustomersPage({ customers, waitingCustomers, settings, bookings, messages, ledger, selectedCustomerId, query = "", mode = "phone-or-name", segment, showNew, showWaiting }: Props) {
  const filtered = customers.filter((record) => matchesSearch(record, mode, query) && matchesSegment(record, segment));
  const selected = customers.find(({ id }) => id === selectedCustomerId) ?? null;
  const selectedBookings = selected ? bookings.filter((record) => text(record, "customerId", "") === selected.id) : [];
  const selectedMessages = selected ? messages.filter((record) => text(record, "recipientId", "") === selected.id) : [];
  const shopName = typeof settings.shopName === "string" ? settings.shopName : "수원 본점";
  const ownerName = typeof settings.ownerName === "string" ? settings.ownerName : "원장";
  const smsRemaining = typeof settings.smsRemaining === "number" ? settings.smsRemaining : 0;

  return <AppShell activeHref="/customers" customers={customers} ownerName={ownerName} shopName={shopName} smsRemaining={smsRemaining}>
    <main className="min-w-[1048px] px-8 pb-14 pt-8">
      <div className="flex items-start justify-between gap-6"><div><p className="text-xs font-medium text-[var(--muted)]">고객 관리 · FUNCTION.md 2.1–2.5</p><h1 className="mt-1 text-[28px] font-bold tracking-[-0.03em]">고객 관리</h1><p className="mt-2 text-sm text-[var(--muted)]">등록, 이력, 분류, 대기 고객을 원장 계정으로 관리합니다.</p></div><div className="flex gap-2"><Link className="rounded-[9px] border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium" href="/customers?waiting=1">대기 등록</Link><Link className="rounded-[9px] bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white" href="/customers?new=1">고객 등록</Link></div></div>
      <section aria-label="고객 검색과 분류" className="mt-7 rounded-[14px] border border-[var(--border)] bg-white p-5"><form className="flex gap-2" method="get"><select aria-label="고객 검색 기준" className={input} defaultValue={mode} name="mode">{searchModes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><input aria-label="고객 검색어" className={`${input} flex-1`} defaultValue={query} name="query" placeholder="고객명 또는 조건 검색" /><button className="rounded-[8px] bg-[var(--brand)] px-4 text-sm font-bold text-white" type="submit">검색</button></form><nav aria-label="고객 분류" className="mt-4 flex flex-wrap gap-2">{segments.map(([key, label]) => <Link className={`rounded-full px-3 py-2 text-xs font-medium ${segment === key ? "bg-[var(--brand)] text-white" : "bg-[var(--brand-soft)] text-[var(--brand)]"}`} href={`/customers?segment=${key}`} key={key}>{label}</Link>)}</nav></section>
      <div className="mt-5 grid grid-cols-[minmax(420px,0.85fr)_minmax(560px,1.15fr)] gap-5">
        <section aria-label="고객 검색 결과" className="rounded-[14px] border border-[var(--border)] bg-white"><div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><h2 className="font-bold">고객 목록</h2><span className="text-xs text-[var(--muted)]">{filtered.length}명</span></div><ul className="divide-y divide-[var(--border)]">{filtered.map((record) => <li key={record.id}><Link className="block px-5 py-4 hover:bg-[var(--brand-soft)]" href={`/customers?customer=${record.id}`}><div className="flex justify-between gap-3"><strong>{text(record, "name")}</strong><span className="rounded-full bg-[var(--background)] px-2 py-0.5 text-[11px]">등급: {text(record, "grade", "일반")}</span></div><span className="mt-1 block text-xs text-[var(--muted)]">{text(record, "phone", "휴대전화 없음")} · 그룹: {text(record, "group", "미지정")}</span></Link></li>)}{filtered.length === 0 && <li className="p-10 text-center text-sm text-[var(--muted)]">조건에 맞는 고객이 없습니다.</li>}</ul></section>
        <aside aria-label="고객 상세" className="rounded-[14px] border border-[var(--border)] bg-white p-6">{selected ? <><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium text-[var(--muted)]">선택 고객</p><h2 className="mt-1 text-2xl font-bold">{text(selected, "name")}</h2><p className="mt-2 text-sm text-[var(--muted)]">{text(selected, "phone", "휴대전화 없음")} · SMS {value(selected).smsOptIn === false ? "수신 거부" : "수신 동의"}</p></div><form action={archiveCustomer}><input name="customerId" type="hidden" value={selected.id} /><button className="rounded-[8px] border border-red-200 px-3 py-2 text-xs font-bold text-red-700" type="submit">고객 보관</button></form></div><nav aria-label="고객 상세 탭" className="mt-5 flex flex-wrap gap-2 border-y border-[var(--border)] py-3">{historyTabs.map((tab) => <a className="rounded-full bg-[var(--background)] px-3 py-1.5 text-xs font-medium" href={`#${tab}`} key={tab}>{tab}</a>)}</nav><section className="mt-5" id="기본 정보"><h3 className="font-bold">기본 정보</h3><dl className="mt-3 grid grid-cols-3 gap-3 text-sm"><div><dt className="text-xs text-[var(--muted)]">포인트</dt><dd className="mt-1 font-bold">{number(selected, "points").toLocaleString("ko-KR")}P</dd></div><div><dt className="text-xs text-[var(--muted)]">방문 동기</dt><dd className="mt-1">{text(selected, "motive")}</dd></div><div><dt className="text-xs text-[var(--muted)]">생일</dt><dd className="mt-1">{text(selected, "birthday")} · {text(selected, "birthdayCalendar", "양력")}</dd></div></dl></section><section className="mt-5" id="예약"><h3 className="font-bold">예약 이력</h3><p className="mt-2 text-sm text-[var(--muted)]">{selectedBookings.length ? `${selectedBookings.length}건의 예약이 있습니다.` : "예약 이력이 없습니다."}</p></section><section className="mt-5" id="시술·결제"><h3 className="font-bold">시술·결제 이력</h3><p className="mt-2 text-sm text-[var(--muted)]">{ledger.filter((entry) => entry.requestKey.includes(selected.id)).length ? "결제 이력이 있습니다." : "시술·결제 이력이 없습니다."}</p></section><section className="mt-5" id="상품"><h3 className="font-bold">상품 구매 이력</h3><p className="mt-2 text-sm text-[var(--muted)]">상품 구매 이력이 없습니다.</p></section><section className="mt-5" id="포인트"><h3 className="font-bold">포인트 이력</h3><p className="mt-2 text-sm text-[var(--muted)]">현재 {number(selected, "points").toLocaleString("ko-KR")}P</p></section><section className="mt-5" id="쿠폰·선불"><h3 className="font-bold">쿠폰·선불권 이력</h3><p className="mt-2 text-sm text-[var(--muted)]">쿠폰·선불권 이력이 없습니다.</p></section><section className="mt-5" id="문자"><h3 className="font-bold">문자 발송 이력</h3><p className="mt-2 text-sm text-[var(--muted)]">{selectedMessages.length ? `${selectedMessages.length}건의 문자 기록이 있습니다.` : "문자 발송 이력이 없습니다."} <Link className="font-medium text-[var(--brand)]" href={`/messages?customer=${selected.id}`}>문자 발송으로 이동</Link></p></section><details className="mt-6 rounded-[10px] bg-[var(--background)] p-4"><summary className="cursor-pointer font-bold">고객 정보 수정</summary><div className="mt-4"><CustomerForm customer={selected} /></div></details></> : <p className="p-12 text-center text-sm text-[var(--muted)]">목록에서 고객을 선택하면 상세와 이력을 확인할 수 있습니다.</p>}</aside>
      </div>
      {(showNew || showWaiting) && <section aria-label={showWaiting ? "대기 고객 등록" : "고객 등록"} className="mt-5 rounded-[14px] border border-[var(--border)] bg-white p-6"><h2 className="text-xl font-bold">{showWaiting ? "대기 고객 등록" : "신규 고객 등록"}</h2>{showWaiting ? <form action={saveWaitingCustomer} className="mt-5 grid grid-cols-[1fr_2fr_auto] gap-3"><Field label="대기 고객명"><input className={input} name="name" required /></Field><Field label="대기 메모 (150자 이하)"><input className={input} maxLength={150} name="memo" /></Field><button className="mt-5 rounded-[8px] bg-[var(--brand)] px-4 text-sm font-bold text-white" type="submit">대기 등록</button></form> : <div className="mt-5"><CustomerForm /></div>}</section>}
      <section aria-label="대기 고객과 일괄 작업" className="mt-5 grid grid-cols-[1fr_auto] gap-5 rounded-[14px] border border-[var(--border)] bg-white p-6"><div><h2 className="text-xl font-bold">대기 고객</h2><ul className="mt-4 divide-y divide-[var(--border)]">{waitingCustomers.map((record) => <li className="flex items-center justify-between gap-4 py-3" key={record.id}><div><strong>{text(record, "name")}</strong><span className="ml-3 text-xs text-[var(--muted)]">{text(record, "memo", "메모 없음")}</span></div><div className="flex gap-3 text-xs"><Link className="font-bold text-[var(--brand)]" href={text(record, "customerId", "") !== "" ? `/sales/transactions?customer=${text(record, "customerId", "")}` : "/customers?new=1"}>기존 회원 결제 이동</Link><form action={completeWaitingCustomer}><input name="waitingId" type="hidden" value={record.id} /><button className="font-bold text-[var(--brand)]" type="submit">대기 완료</button></form></div></li>)}{waitingCustomers.length === 0 && <li className="py-6 text-sm text-[var(--muted)]">대기 고객이 없습니다.</li>}</ul></div><div className="w-64"><h2 className="text-xl font-bold">일괄 작업</h2><form action={saveCustomerPolicy} className="mt-4 grid gap-3"><Field label="고객 그룹"><input className={input} defaultValue={typeof settings.customerGroups === "string" ? settings.customerGroups : ""} name="customerGroups" /></Field><Field label="고객 등급"><input className={input} defaultValue={typeof settings.customerGrades === "string" ? settings.customerGrades : ""} name="customerGrades" /></Field><Field label="방문 동기"><input className={input} defaultValue={typeof settings.visitMotives === "string" ? settings.visitMotives : ""} name="visitMotives" /></Field><Field label="SMS 기본값"><select className={input} defaultValue={settings.defaultSmsOptIn === false ? "off" : "on"} name="defaultSmsOptIn"><option value="on">수신 동의</option><option value="off">수신 거부</option></select></Field><button className="rounded-[8px] border border-[var(--border)] py-2 text-sm font-bold" type="submit">그룹·등급 설정 저장</button></form><form className="mt-5 grid gap-2" method="get"><label className="text-sm font-bold" htmlFor="print-layout">고객 목록 인쇄</label><select className={input} id="print-layout" name="printLayout"><option value="1">인쇄 양식 1</option><option value="2">인쇄 양식 2</option><option value="3">인쇄 양식 3</option><option value="4">인쇄 양식 4</option></select><button className="rounded-[8px] border border-[var(--border)] py-2 text-sm font-bold" type="submit">인쇄 양식 선택</button></form></div></section>
    </main>
  </AppShell>;
}
