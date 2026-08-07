import Link from "next/link";

import { button } from "../button";
import { bookingSettings } from "../../lib/booking";
import { displayStatus, minutesOfDay, railHeight, railHourMarks, railOffset, railTotalHeight, statusStyles } from "../../lib/day-rail";
import type { AuditEvent, JsonObject, JsonValue, LedgerEntry, SalonRecord } from "../../lib/salon-domain";
import { surface as card } from "../surface";
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

function auditDateLabel(value: string) {
  const date = validDate(value);
  return date ? date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "날짜 확인 필요";
}

/** 서울 기준 현재 시각을 자정 기준 분으로. now-line 위치 계산용. */
function seoulMinutes(now: Date) {
  return minutesOfDay(timeFormatter.format(now));
}

function gapLabel(minutes: number, waitingCount: number) {
  return waitingCount > 0 ? `${minutes}분 비어 있음 · 대기 고객 ${waitingCount}명 배정 가능` : `${minutes}분 비어 있음`;
}

/**
 * 대시보드가 실제로 읽는 것만 받는다. 예전엔 `SalonSnapshot` 전체(모든 kind + 원장 5,576행 +
 * 감사 6,435행, 실측 76.07ms)를 받아놓고 원장에선 "오늘 합계", 감사에선 "마지막 5행"만 썼다.
 */
export type DashboardData = {
  readonly records: Readonly<Record<string, readonly SalonRecord<JsonValue>[]>>;
  readonly settings: Readonly<JsonObject>;
  /** 오늘 영업일 원장 행만. 합계는 여기서 낸다. */
  readonly todayLedger: readonly LedgerEntry[];
  /** 최신순 5행. */
  readonly recentAudit: readonly AuditEvent[];
  /** 원장 + 감사에서 날짜가 깨진 행 수. 예약 쪽은 `records.bookings` 에서 직접 센다. */
  readonly malformedLedgerDates: number;
};

export function DashboardPage({ data, today = new Date() }: { data: DashboardData; today?: Date }) {
  const customers = data.records.customers ?? [];
  const bookings = data.records.bookings ?? [];
  const waitingCustomers = data.records["waiting-customers"] ?? [];
  const automations = data.records.automations ?? [];
  const notices = data.records.notices ?? [];
  const settings = data.settings;
  const shopName = typeof settings.shopName === "string" ? settings.shopName : "헤어해요";
  const ownerName = typeof settings.ownerName === "string" ? settings.ownerName : "서원";
  const smsRemaining = typeof settings.smsRemaining === "number" ? settings.smsRemaining : 0;
  const todayKey = dateKey(today) ?? new Date().toISOString().slice(0, 10);
  const customerNames = new Map(customers.map((record) => [record.id, textValue(objectValue(record), "name", record.id)]));
  const todayBookings = bookings.filter((record) => dateKey(textValue(objectValue(record), "startsAt")) === todayKey).sort((left, right) => textValue(objectValue(left), "startsAt").localeCompare(textValue(objectValue(right), "startsAt")));
  const dayCounts = dayNames.map((label, offset) => ({ label, count: bookings.filter((record) => dateKey(textValue(objectValue(record), "startsAt")) === addDays(todayKey, offset)).length }));
  const todaySales = data.todayLedger.filter((entry) => dateKey(entry.occurredAt) === todayKey).reduce((total, entry) => total + entry.amountWon, 0);
  const recentAudit = data.recentAudit;
  const malformedDateCount = bookings.filter((record) => dateKey(textValue(objectValue(record), "startsAt")) === null).length + data.malformedLedgerDates;

  const policy = bookingSettings({
    bookingOpen: typeof settings.bookingOpen === "string" ? settings.bookingOpen : undefined,
    bookingClose: typeof settings.bookingClose === "string" ? settings.bookingClose : undefined,
    bookingSlotMinutes: typeof settings.bookingSlotMinutes === "number" ? settings.bookingSlotMinutes : undefined,
  });
  const openMinutes = minutesOfDay(policy.bookingOpen) ?? 540;
  const closeMinutes = minutesOfDay(policy.bookingClose) ?? 1200;
  const nowMinutes = seoulMinutes(today);
  const hourMarks = railHourMarks(openMinutes, closeMinutes);
  const railHeightPx = railTotalHeight(openMinutes, closeMinutes);
  const nowVisible = nowMinutes !== null && nowMinutes >= openMinutes && nowMinutes <= closeMinutes;

  // 예약을 레일 좌표로 옮기고, 인접 예약 사이 빈 구간을 같은 축 위에 표시한다.
  const railBookings = todayBookings.flatMap((record) => {
    const booking = objectValue(record);
    const startsAt = textValue(booking, "startsAt");
    const start = minutesOfDay(startsAt);
    if (start === null) return [];
    const end = minutesOfDay(textValue(booking, "endsAt")) ?? start + policy.bookingSlotMinutes;
    const status = displayStatus(textValue(booking, "status"), start, end, nowMinutes);
    const customerId = textValue(booking, "customerId");
    return [{
      id: record.id,
      customerId,
      end,
      name: customerNames.get(customerId) ?? customerId,
      service: textValue(booking, "service"),
      start,
      startsAt,
      status,
      style: statusStyles[status],
    }];
  });
  const railGaps = railBookings.flatMap((booking, index) => {
    const next = railBookings[index + 1];
    const gap = next ? next.start - booking.end : 0;
    return gap >= policy.bookingSlotMinutes ? [{ height: railHeight(gap), minutes: gap, top: railOffset(booking.end, openMinutes) }] : [];
  });
  const completedToday = railBookings.filter((booking) => booking.status === "completed").length;
  const enabledAutomations = automations.filter((record) => textValue(objectValue(record), "status") === "사용").length;

  return (
      <main className="flex min-w-0 flex-col px-7 pb-6 pt-5">
        <div className="flex items-center gap-3">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em]">오늘 할 일</h2>
          <div className="h-px min-w-0 flex-1 bg-transparent" />
          <nav aria-label="빠른 작업" className="flex gap-2">
            {[["예약 등록", "/bookings?new=1"], ["고객 등록", "/customers?new=1"], ["결제 등록", "/sales?tab=payment"], ["대기 등록", "/customers?waiting=1"], ["문자 발송", "/messages?new=1"]].map(([label, href], index) => <Link className={button("md", index === 0 ? "primary" : "secondary")} href={href} key={href}>{label}</Link>)}
          </nav>
        </div>

        {malformedDateCount > 0 && <p className="mt-4 rounded-[var(--radius-card)] border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm font-bold" role="status">날짜 확인 필요: {malformedDateCount}건</p>}

        <div className="mt-5 grid min-h-0 grid-cols-[minmax(0,1fr)_336px] items-start gap-5" data-dashboard-timeline-layout="compact">
          <section aria-label="원장 예약 타임라인" className={`${card} flex min-h-0 flex-col overflow-hidden`}>
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-[18px] py-[15px]"><h2 className="text-[13.5px] font-semibold">하루 축</h2><div className="h-px min-w-0 flex-1" /><div className="flex items-center gap-2.5 font-mono text-[11px] text-[var(--muted)]">{dayCounts.map(({ label, count }, index) => <span key={label}>{index > 0 && <i className="mx-1 inline-block h-3 w-px bg-[var(--border)]" />} {label} <b className="text-[var(--foreground)]">{count}건</b></span>)}</div><Link className={button("xs")} href="/bookings">날짜별 예약 현황</Link><span className="font-mono text-[10.5px] text-[var(--muted)]">{policy.bookingOpen} – {policy.bookingClose} · {policy.bookingSlotMinutes}분</span></div>
            <div className="min-h-0 flex-1 overflow-auto p-[18px]">
              {railBookings.length > 0 ? (
                <div className="relative" style={{ height: `${railHeightPx}px` }}>
                  {hourMarks.map(({ label, top }) => (
                    <div className="absolute inset-x-0" key={label} style={{ top: `${top}px` }}>
                      <span className="absolute left-0 -translate-y-1/2 font-mono text-[10.5px] text-[var(--muted)]">{label}</span>
                      <span className="absolute left-[56px] right-0 h-px bg-[rgba(224,222,215,0.85)]" />
                    </div>
                  ))}
                  {railGaps.map(({ height, minutes, top }) => (
                    <p className="absolute left-[56px] right-0 grid place-items-center text-[10.5px] text-[var(--muted)]" key={`gap-${top}`} style={{ height: `${height}px`, top: `${top}px` }}>
                      {gapLabel(minutes, waitingCustomers.length)}
                    </p>
                  ))}
                  <ol>
                    {railBookings.map((booking) => (
                      <li className={`absolute left-[56px] right-0 overflow-hidden rounded-[var(--radius-control)] border ${booking.style.card}`} data-booking-status={booking.status} key={booking.id} style={{ height: `${railHeight(booking.end - booking.start)}px`, top: `${railOffset(booking.start, openMinutes)}px` }}>
                        <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${booking.style.stripe}`} />
                        <div className="flex h-full items-center gap-3 py-1.5 pl-[12px] pr-3">
                          <time className="shrink-0 font-mono text-[11px] text-[var(--muted)]" dateTime={booking.startsAt}>{timeFormatter.format(new Date(booking.startsAt))}</time>
                          <div className="min-w-0 flex-1">
                            <strong className="block truncate text-[12.5px]">{booking.name}</strong>
                            <span className="mt-0.5 block truncate text-[10.5px] text-[var(--muted)]">{booking.service}</span>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-medium ${booking.style.badge}`}>
                            <span aria-hidden="true" className={`mr-1 inline-block size-1.5 rounded-full align-middle ${booking.style.dot}`} />
                            {booking.style.label}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {nowVisible && (
                    <div aria-label={`현재 시각 ${timeFormatter.format(today)}`} className="pointer-events-none absolute inset-x-0" data-now-line role="separator" style={{ top: `${railOffset(nowMinutes!, openMinutes)}px` }}>
                      <span className="absolute left-0 -translate-y-1/2 rounded-[var(--radius-chip)] bg-[var(--accent)] px-[5px] py-[2px] font-mono text-[9.5px] leading-none text-white">{timeFormatter.format(today)}</span>
                      <span className="absolute left-[44px] right-0 h-px bg-[var(--accent)]" />
                    </div>
                  )}
                </div>
              ) : <div className="grid h-full min-h-[280px] place-items-center text-center" data-dashboard-empty-timeline><div><p className="font-mono text-[11px] text-[var(--muted)]">오늘 예약이 없습니다.</p><Link className={button("sm", "primary", "mt-3")} href="/bookings?new=1">예약 등록</Link></div></div>}
            </div>
          </section>

          <aside className="min-h-0 space-y-[18px] overflow-auto pr-1">
            <section aria-label="운영 현황" className={`${card} overflow-hidden`}><div className="flex items-center justify-between border-b border-[var(--border)] px-[18px] py-3"><h2 className="text-[13.5px] font-semibold">운영 현황</h2><span className="font-mono text-[10px] text-[var(--muted)]">확정 반영</span></div><dl className="px-[18px] py-2"><div className="flex items-end justify-between gap-2 border-b border-[var(--border)] py-[10px]"><dt className="text-[11px] text-[var(--muted)]">매출</dt><dd className="font-mono text-[29px] font-medium leading-none tracking-[-0.8px]">₩{todaySales.toLocaleString("ko-KR")}</dd></div>{[["예약", `완료 ${completedToday}건 · 남은 ${todayBookings.length - completedToday}건`, `${todayBookings.length}건`], ["대기 고객", waitingCustomers.length ? "배정 대기" : "없음", `${waitingCustomers.length}명`], ["미수금", "없음", "₩0"], ["SMS 잔여", `자동 발송 ${enabledAutomations}건 예정`, `${smsRemaining.toLocaleString("ko-KR")}건`]].map(([label, subtitle, value]) => <div className="flex items-center gap-[8px] border-b border-[var(--border)] py-[10px] last:border-0" key={label}><div className="min-w-0 flex-1"><dt className="text-[12px]">{label}</dt><span className="mt-0.5 block text-[10.5px] text-[var(--muted)]">{subtitle}</span></div><dd className="font-mono text-[14px] font-medium">{value}</dd></div>)}<div className="flex items-center gap-2 pt-3 text-[10.5px] text-[var(--muted)]"><span className="h-[11px] w-[2px] bg-[var(--accent)]" />정정 {recentAudit.filter((event) => event.action.includes("correction")).length}건 · 삭제 없이 원장에 덧붙임</div></dl></section>
            <section aria-label="대기 고객" className={`${card} overflow-hidden`}><div className="flex items-center justify-between border-b border-[var(--border)] px-[18px] py-3"><h2 className="text-[13.5px] font-semibold">대기 고객</h2><span className="font-mono text-[10.5px] text-[var(--muted)]">{waitingCustomers.length}명</span></div><ul className="px-[18px] py-1">{waitingCustomers.length ? waitingCustomers.slice(0, 3).map((record) => { const waiting = objectValue(record); const customerId = textValue(waiting, "customerId", ""); return <li className="flex items-center gap-2 border-b border-[var(--border)] py-3 last:border-0" key={record.id}><div className="min-w-0 flex-1"><strong className="block text-[12.5px]">{textValue(waiting, "name")}</strong><span className="mt-1 block text-[10.5px] text-[var(--muted)]">{textValue(waiting, "memo", "메모 없음")}</span></div><span className="font-mono text-[10.5px] text-[var(--muted)]">대기</span><Link className={button("xs")} href={customerId ? `/customers?customer=${customerId}` : "/customers?waiting=1"}>배정</Link></li>; }) : <li className="py-5 text-sm text-[var(--muted)]">대기 고객이 없습니다.</li>}</ul></section>
            <section aria-label="자동 문자" className={`${card} overflow-hidden`}><div className="flex items-center justify-between border-b border-[var(--border)] px-[18px] py-3"><h2 className="text-[13.5px] font-semibold">자동 문자</h2><span className="font-mono text-[10.5px] text-[var(--muted)]">오늘 예정</span></div><div className="grid grid-cols-2 gap-x-3 gap-y-3 px-[18px] py-3">{automations.length ? automations.slice(0, 6).map((record) => { const automation = objectValue(record); const enabled = textValue(automation, "status") === "사용"; return <div className="flex items-start gap-1.5" key={record.id}><span className={`mt-1 size-1.5 rounded-full ${enabled ? "bg-[var(--success)]" : "bg-[var(--muted)]"}`} /><div><strong className="block text-[11.5px]">{textValue(automation, "label")}</strong><span className="font-mono text-[10px] text-[var(--muted)]">{textValue(automation, "schedule")} · {enabled ? "켜짐" : "꺼짐"}</span></div></div>; }) : <p className="col-span-2 py-3 text-sm text-[var(--muted)]">대기 중인 자동화가 없습니다.</p>}</div><p className="mx-[18px] mb-3 rounded-[var(--radius-card)] bg-[var(--brand-soft)] px-2 py-1.5 text-[10.5px] text-[var(--brand)]">발송 전 확인 필요 · 설정 › 문자에서 켜고 끕니다</p></section>
          </aside>
        </div>

        <div className="sr-only"><h2>공지사항</h2>{notices.length ? notices.map((record) => <Link href={`/settings?section=help#${record.id}`} key={record.id}>{textValue(objectValue(record), "title")}</Link>) : <p>공지사항이 없습니다.</p>}<h2>최근 감사 이력</h2>{recentAudit.length ? recentAudit.map((event) => <span key={event.id}>{event.actor} · {event.action} · {event.kind ?? "시스템"} · {auditDateLabel(event.occurredAt)}</span>) : <p>감사 이력이 없습니다.</p>}<p>오늘 매출</p><p>오늘 예약</p><p>대기 고객</p><p>자동화 대기열</p><p>SMS 잔여 {smsRemaining.toLocaleString("ko-KR")}건</p>{automations.map((record) => <p key={`automation-summary-${record.id}`}>{textValue(objectValue(record), "status")}</p>)}{dayCounts.map(({ label, count }) => <p key={`summary-${label}`}>{label} {count}건</p>)}</div>
      </main>
  );
}
