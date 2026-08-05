import Link from "next/link";

import type { JsonObject, JsonValue, SalonRecord, SalonSnapshot } from "../../lib/salon-domain";
import { AppShell } from "../app-shell";

const card = "rounded-[8px] border border-[var(--border)] bg-[var(--surface)]";
const dayNames = ["오늘", "내일", "모레", "글피"] as const;
const dateFormatter = new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone: "Asia/Seoul", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", hour12: false, minute: "2-digit", timeZone: "Asia/Seoul" });

function objectValue(record: SalonRecord<JsonValue>): JsonObject {
  return typeof record.value === "object" && record.value !== null && !Array.isArray(record.value) ? record.value as JsonObject : {};
}

function textValue(value: JsonObject, key: string, fallback = "-") {
  return typeof value[key] === "string" ? value[key] : fallback;
}

function validDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(value: Date | string) {
  const date = validDate(value);
  if (!date) return null;
  const parts = dateFormatter.formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addDays(key: string, days: number) {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function statusLabel(status: string) {
  return ({ confirmed: "예약", completed: "완료", waiting: "대기", cancelled: "취소" } as Record<string, string>)[status] ?? status;
}

function auditDateLabel(value: string) {
  const date = validDate(value);
  return date ? date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "날짜 확인 필요";
}

export function DashboardPage({ snapshot, today = new Date() }: { snapshot: SalonSnapshot; today?: Date }) {
  const customers = snapshot.records.customers ?? [];
  const bookings = snapshot.records.bookings ?? [];
  const waitingCustomers = snapshot.records["waiting-customers"] ?? [];
  const automations = snapshot.records.automations ?? [];
  const notices = snapshot.records.notices ?? [];
  const settings = snapshot.settings;
  const shopName = typeof settings.shopName === "string" ? settings.shopName : "헤어해요";
  const ownerName = typeof settings.ownerName === "string" ? settings.ownerName : "서원";
  const smsRemaining = typeof settings.smsRemaining === "number" ? settings.smsRemaining : 0;
  const todayKey = dateKey(today) ?? new Date().toISOString().slice(0, 10);
  const customerNames = new Map(customers.map((record) => [record.id, textValue(objectValue(record), "name", record.id)]));
  const todayBookings = bookings.filter((record) => dateKey(textValue(objectValue(record), "startsAt")) === todayKey).sort((left, right) => textValue(objectValue(left), "startsAt").localeCompare(textValue(objectValue(right), "startsAt")));
  const dayCounts = dayNames.map((label, offset) => ({ label, count: bookings.filter((record) => dateKey(textValue(objectValue(record), "startsAt")) === addDays(todayKey, offset)).length }));
  const todaySales = snapshot.ledger.filter((entry) => dateKey(entry.occurredAt) === todayKey).reduce((total, entry) => total + entry.amountWon, 0);
  const recentAudit = snapshot.auditEvents.slice(-5).reverse();
  const malformedDateCount = bookings.filter((record) => dateKey(textValue(objectValue(record), "startsAt")) === null).length + snapshot.ledger.filter((entry) => dateKey(entry.occurredAt) === null).length + snapshot.auditEvents.filter((event) => validDate(event.occurredAt) === null).length;

  return (
    <AppShell activeHref="/" contentClassName="overflow-hidden" customers={customers} ownerName={ownerName} settings={settings} shopName={shopName} smsRemaining={smsRemaining} today={today}>
      <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden px-7 pb-6 pt-[22px]">
        <div className="flex items-center gap-3">
          <h1 className="text-[14px] font-semibold tracking-[-0.01em]">오늘 할 일</h1>
          <div className="h-px min-w-0 flex-1 bg-transparent" />
          <nav aria-label="빠른 작업" className="flex gap-2">
            {[["예약 등록", "/bookings?new=1"], ["고객 등록", "/customers?new=1"], ["결제 등록", "/sales/transactions?new=1"], ["대기 등록", "/customers?waiting=1"], ["문자 발송", "/messages?new=1"]].map(([label, href], index) => <Link className={`rounded-[8px] px-3.5 py-2 text-[12.5px] font-medium ${index === 0 ? "bg-[var(--brand)] text-white" : "border border-[var(--border)] bg-white text-[var(--foreground)]"}`} href={href} key={href}>{label}</Link>)}
          </nav>
        </div>

        {malformedDateCount > 0 && <p className="mt-4 rounded-[8px] border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm font-bold" role="status">날짜 확인 필요: {malformedDateCount}건</p>}

        <div className="mt-[18px] grid min-h-0 grid-cols-[minmax(0,1fr)_336px] items-start gap-[18px]" data-dashboard-timeline-layout="compact">
          <section aria-label="원장 예약 타임라인" className={`${card} flex min-h-0 flex-col overflow-hidden`}>
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-[18px] py-[15px]"><h2 className="text-[13.5px] font-semibold">하루 축</h2><div className="h-px min-w-0 flex-1" /><div className="flex items-center gap-2.5 font-mono text-[11px] text-[var(--muted)]">{dayCounts.map(({ label, count }, index) => <span key={label}>{index > 0 && <i className="mx-1 inline-block h-3 w-px bg-[var(--border)]" />} {label} <b className="text-[var(--foreground)]">{count}건</b></span>)}</div><Link className="rounded-[7px] border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium" href="/bookings">날짜별 예약 현황</Link><span className="font-mono text-[10.5px] text-[var(--muted)]">09:00 – 20:00 · 30분</span></div>
            <div className="min-h-0 flex-1 overflow-auto p-[18px]">
              {todayBookings.length > 0 ? <ol className="divide-y divide-[var(--border)]">{todayBookings.map((record) => { const booking = objectValue(record); const startsAt = textValue(booking, "startsAt"); const customerId = textValue(booking, "customerId"); return <li className="grid min-h-[74px] grid-cols-[76px_1fr_auto] items-center gap-3 py-2" key={record.id}><time className="font-mono text-[11px] text-[var(--muted)]" dateTime={startsAt}>{timeFormatter.format(new Date(startsAt))}</time><div className="border-l-2 border-[var(--brand)] pl-3"><strong className="block text-[12.5px]">{customerNames.get(customerId) ?? customerId}</strong><span className="mt-1 block text-[10.5px] text-[var(--muted)]">{textValue(booking, "service")}</span></div><span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10.5px] font-medium text-[var(--brand)]">● {statusLabel(textValue(booking, "status"))}</span></li>; })}</ol> : <div className="grid h-full min-h-[280px] place-items-center text-center" data-dashboard-empty-timeline><div><p className="font-mono text-[11px] text-[var(--muted)]">오늘 예약이 없습니다.</p><Link className="mt-3 inline-block rounded-[8px] bg-[var(--brand)] px-3 py-2 text-xs font-medium text-white" href="/bookings?new=1">예약 등록</Link></div></div>}
            </div>
          </section>

          <aside className="min-h-0 space-y-[18px] overflow-auto pr-1">
            <section aria-label="운영 현황" className={`${card} overflow-hidden`}><div className="flex items-center justify-between border-b border-[var(--border)] px-[18px] py-3"><h2 className="text-[13.5px] font-semibold">운영 현황</h2><span className="font-mono text-[10px] text-[var(--muted)]">현재 변동</span></div><dl className="px-[18px] py-2">{[["매출", `₩${todaySales.toLocaleString("ko-KR")}`], ["예약", `${todayBookings.length}건`], ["대기 고객", `${waitingCustomers.length}명`], ["미수금", "₩0"], ["SMS 잔여", `${smsRemaining.toLocaleString("ko-KR")}건`]].map(([label, value]) => <div className="flex items-center gap-2 border-b border-[var(--border)] py-[10px] last:border-0" key={label}><dt className="text-[12px] text-[var(--muted)]">{label}</dt><div className="h-px min-w-0 flex-1" /><dd className="font-mono text-[13px] font-medium">{value}</dd></div>)}<div className="flex items-center gap-2 pt-3 text-[10.5px] text-[var(--muted)]"><span className="h-2.5 w-0.5 bg-[var(--accent)]" />정정 {recentAudit.filter((event) => event.action.includes("correction")).length}건 · 삭제 없이 원장에 덧붙임</div></dl></section>
            <section aria-label="대기 고객" className={`${card} overflow-hidden`}><div className="flex items-center justify-between border-b border-[var(--border)] px-[18px] py-3"><h2 className="text-[13.5px] font-semibold">대기 고객</h2><span className="font-mono text-[10.5px] text-[var(--muted)]">{waitingCustomers.length}명</span></div><ul className="px-[18px] py-1">{waitingCustomers.length ? waitingCustomers.slice(0, 3).map((record) => { const waiting = objectValue(record); const customerId = textValue(waiting, "customerId", ""); return <li className="flex items-center gap-2 border-b border-[var(--border)] py-3 last:border-0" key={record.id}><div className="min-w-0 flex-1"><strong className="block text-[12.5px]">{textValue(waiting, "name")}</strong><span className="mt-1 block text-[10.5px] text-[var(--muted)]">{textValue(waiting, "memo", "메모 없음")}</span></div><span className="font-mono text-[10.5px] text-[var(--muted)]">대기</span><Link className="rounded-[8px] border border-[var(--border)] px-2.5 py-1.5 text-[11px]" href={customerId ? `/customers?customer=${customerId}` : "/customers?waiting=1"}>배정</Link></li>; }) : <li className="py-5 text-sm text-[var(--muted)]">대기 고객이 없습니다.</li>}</ul></section>
            <section aria-label="자동 문자" className={`${card} overflow-hidden`}><div className="flex items-center justify-between border-b border-[var(--border)] px-[18px] py-3"><h2 className="text-[13.5px] font-semibold">자동 문자</h2><span className="font-mono text-[10.5px] text-[var(--muted)]">오늘 예정</span></div><div className="grid grid-cols-2 gap-x-3 gap-y-3 px-[18px] py-3">{automations.length ? automations.slice(0, 6).map((record) => { const automation = objectValue(record); const enabled = textValue(automation, "status") === "사용"; return <div className="flex items-start gap-1.5" key={record.id}><span className={`mt-1 size-1.5 rounded-full ${enabled ? "bg-[var(--success)]" : "bg-[var(--muted)]"}`} /><div><strong className="block text-[11.5px]">{textValue(automation, "label")}</strong><span className="font-mono text-[10px] text-[var(--muted)]">{textValue(automation, "schedule")} · {enabled ? "켜짐" : "꺼짐"}</span></div></div>; }) : <p className="col-span-2 py-3 text-sm text-[var(--muted)]">대기 중인 자동화가 없습니다.</p>}</div><p className="mx-[18px] mb-3 rounded-[7px] bg-[var(--brand-soft)] px-2 py-1.5 text-[10.5px] text-[var(--brand)]">발송 전 확인 필요 · 설정 › 문자에서 켜고 끕니다</p></section>
          </aside>
        </div>

        <div className="sr-only"><h2>공지사항</h2>{notices.length ? notices.map((record) => <Link href={`/settings?section=help#${record.id}`} key={record.id}>{textValue(objectValue(record), "title")}</Link>) : <p>공지사항이 없습니다.</p>}<h2>최근 감사 이력</h2>{recentAudit.length ? recentAudit.map((event) => <span key={event.id}>{event.actor} · {event.action} · {event.kind ?? "시스템"} · {auditDateLabel(event.occurredAt)}</span>) : <p>감사 이력이 없습니다.</p>}<p>오늘 매출</p><p>오늘 예약</p><p>대기 고객</p><p>자동화 대기열</p><p>SMS 잔여 {smsRemaining.toLocaleString("ko-KR")}건</p>{automations.map((record) => <p key={`automation-summary-${record.id}`}>{textValue(objectValue(record), "status")}</p>)}{dayCounts.map(({ label, count }) => <p key={`summary-${label}`}>{label} {count}건</p>)}</div>
      </main>
    </AppShell>
  );
}
