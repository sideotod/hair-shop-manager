import Link from "next/link";

import type { JsonObject, JsonValue, SalonRecord, SalonSnapshot } from "../../lib/salon-domain";
import { AppShell } from "../app-shell";

const card = "rounded-[16px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(13,21,18,0.03)]";
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
  const todayBookings = bookings
    .filter((record) => dateKey(textValue(objectValue(record), "startsAt")) === todayKey)
    .sort((left, right) => textValue(objectValue(left), "startsAt").localeCompare(textValue(objectValue(right), "startsAt")));
  const dayCounts = dayNames.map((label, offset) => ({ label, count: bookings.filter((record) => dateKey(textValue(objectValue(record), "startsAt")) === addDays(todayKey, offset)).length }));
  const todaySales = snapshot.ledger.filter((entry) => dateKey(entry.occurredAt) === todayKey).reduce((total, entry) => total + entry.amountWon, 0);
  const recentAudit = snapshot.auditEvents.slice(-5).reverse();
  const malformedDateCount = bookings.filter((record) => dateKey(textValue(objectValue(record), "startsAt")) === null).length
    + snapshot.ledger.filter((entry) => dateKey(entry.occurredAt) === null).length
    + snapshot.auditEvents.filter((event) => validDate(event.occurredAt) === null).length;

  return (
    <AppShell activeHref="/" customers={customers} ownerName={ownerName} settings={settings} shopName={shopName} smsRemaining={smsRemaining} today={today}>
      <main className="px-8 pb-14 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[30px] font-semibold tracking-[-0.04em]">운영 현황</h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">예약, 대기, 문자 자동화를 한 화면에서 확인합니다.</p>
          </div>
          <nav aria-label="빠른 작업" className="flex flex-wrap justify-end gap-2">
            {[
              ["고객 등록", "/customers?new=1"],
              ["대기 등록", "/customers?waiting=1"],
              ["예약 등록", "/bookings?new=1"],
              ["결제 등록", "/sales/transactions?new=1"],
              ["문자 발송", "/messages?new=1"],
            ].map(([label, href]) => <Link className="rounded-[9px] border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--brand)] first:bg-[var(--brand)] first:text-white" href={href} key={href}>{label}</Link>)}
          </nav>
        </div>

        {malformedDateCount > 0 && <p className="mt-5 rounded-[10px] border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm font-bold" role="status">날짜 확인 필요: {malformedDateCount}건</p>}

        <section aria-label="오늘 핵심 지표" className="mt-7 grid grid-cols-4 gap-4">
          {[
            ["오늘 매출", `₩${todaySales.toLocaleString("ko-KR")}`, "서버 거래 원장 합계"],
            ["오늘 예약", `${todayBookings.length}건`, "단일 원장 예약"],
            ["대기 고객", `${waitingCustomers.length}명`, "현재 대기 목록"],
            ["SMS", `${smsRemaining.toLocaleString("ko-KR")}건`, "발송 가능 잔여량"],
          ].map(([label, value, meta]) => (
            <article className={`${card} min-h-28 px-5 py-4`} key={label}>
              <h2 className="text-[13px] font-medium text-[var(--muted)]">{label}</h2>
              <p className="mt-3 text-[26px] font-bold leading-none tabular-nums">{value}</p>
              <p className="mt-3 text-xs text-[var(--muted)]">{meta}</p>
            </article>
          ))}
        </section>

        <section aria-label="나흘 예약 건수" className="mt-5 grid grid-cols-4 gap-3">
          {dayCounts.map(({ label, count }) => <p className={`${card} px-4 py-3 text-center text-sm font-medium`} key={label}>{label} {count}건</p>)}
        </section>

        <div className="mt-5 grid grid-cols-[minmax(0,1.45fr)_minmax(340px,0.8fr)] gap-5">
          <section className={`${card} px-6 py-5`}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">원장 예약 타임라인</h2><Link className="text-xs font-medium text-[var(--brand)]" href="/bookings">예약 전체 보기</Link></div>
            {todayBookings.length > 0 ? (
              <ol className="mt-4 divide-y divide-[var(--border)]">
                {todayBookings.map((record) => {
                  const booking = objectValue(record);
                  const startsAt = textValue(booking, "startsAt");
                  const customerId = textValue(booking, "customerId");
                  return (
                    <li className="grid min-h-20 grid-cols-[76px_1fr_88px] items-center gap-3" key={record.id}>
                      <time className="font-bold tabular-nums text-[var(--brand)]" dateTime={startsAt}>{timeFormatter.format(new Date(startsAt))}</time>
                      <div><strong className="block text-sm">{customerNames.get(customerId) ?? customerId}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{textValue(booking, "service")}</span></div>
                      <span className="justify-self-start rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-medium text-[var(--brand)]">상태: {statusLabel(textValue(booking, "status"))}</span>
                    </li>
                  );
                })}
              </ol>
            ) : <p className="mt-8 rounded-[10px] bg-[var(--background)] p-8 text-center text-sm text-[var(--muted)]">오늘 예약이 없습니다.</p>}
          </section>

          <section className={`${card} px-5 py-5`}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">대기 고객</h2><Link className="text-xs font-medium text-[var(--brand)]" href="/customers?waiting=1">대기 등록</Link></div>
            {waitingCustomers.length > 0 ? (
              <ul className="mt-4 divide-y divide-[var(--border)]">
                {waitingCustomers.map((record) => {
                  const waiting = objectValue(record);
                  const customerId = textValue(waiting, "customerId", "");
                  return (
                    <li className="py-4" key={record.id}>
                      <div className="flex items-start justify-between gap-4"><div><strong className="block text-sm">{textValue(waiting, "name")}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{textValue(waiting, "memo", "메모 없음")}</span></div><span className="rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--warning)]">상태: 대기</span></div>
                      <div className="mt-3 flex gap-3 text-xs font-medium"><Link className="text-[var(--brand)]" href={customerId ? `/customers?customer=${customerId}` : `/customers?waiting=${record.id}`}>고객 보기</Link><Link className="text-[var(--brand)]" href={customerId ? `/sales/transactions?customer=${customerId}` : "/customers?new=1"}>{customerId ? "결제 이동" : "고객 등록"}</Link></div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-6 text-sm text-[var(--muted)]">대기 고객이 없습니다.</p>}
          </section>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-5">
          <section className={`${card} px-5 py-5`}><h2 className="text-lg font-bold">자동화 대기열</h2>{automations.length > 0 ? <ul className="mt-4 space-y-3">{automations.map((record) => { const automation = objectValue(record); return <li className="rounded-[10px] bg-[var(--background)] p-3 text-sm" key={record.id}><div className="flex justify-between gap-3"><strong>{textValue(automation, "label")}</strong><span className="font-medium text-[var(--brand)]">상태: {textValue(automation, "status")}</span></div><span className="mt-1 block text-xs text-[var(--muted)]">{textValue(automation, "schedule")}</span></li>; })}</ul> : <p className="mt-6 text-sm text-[var(--muted)]">대기 중인 자동화가 없습니다.</p>}</section>
          <section className={`${card} px-5 py-5`}><div className="flex items-center justify-between"><h2 className="text-lg font-bold">공지사항</h2><Link className="text-xs font-bold text-[var(--brand)]" href="/settings?section=help">도움말·FAQ</Link></div>{notices.length > 0 ? <ul className="mt-4 space-y-3">{notices.map((record) => { const notice = objectValue(record); return <li className="rounded-[10px] border border-[var(--border)] p-3" key={record.id}><Link className="text-sm font-bold" href={`/settings?section=help#${record.id}`}>{textValue(notice, "title")}</Link><p className="mt-1 text-xs text-[var(--muted)]">{textValue(notice, "body")}</p></li>; })}</ul> : <p className="mt-6 text-sm text-[var(--muted)]">공지사항이 없습니다.</p>}</section>
          <section className={`${card} px-5 py-5`}><h2 className="text-lg font-bold">최근 감사 이력</h2>{recentAudit.length > 0 ? <ol className="mt-4 space-y-3">{recentAudit.map((event) => <li className="border-b border-[var(--border)] pb-3 text-xs last:border-0" key={event.id}><strong className="block text-sm">{event.actor} · {event.action}</strong><span className="mt-1 block text-[var(--muted)]">{event.kind ?? "시스템"} · {auditDateLabel(event.occurredAt)}</span></li>)}</ol> : <p className="mt-6 text-sm text-[var(--muted)]">감사 이력이 없습니다.</p>}</section>
        </div>
      </main>
    </AppShell>
  );
}
