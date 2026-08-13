import Link from "next/link";

import { button, focusRing } from "../button";
import { bookingSettings } from "../../lib/booking";
import { displayStatus, minutesOfDay, railHeight, railHourMarks, railOffset, railTotalHeight, statusStyles } from "../../lib/day-rail";
import type { AuditEvent, JsonObject, JsonValue, LedgerEntry, SalonRecord } from "../../lib/salon-domain";
import { seoulDate } from "../../lib/seoul-date";
import { surface as card } from "../surface";
import { typeScale } from "../type";
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

/** 예약도 원장과 같은 참 시각 ISO 다(`lib/seoul-date.ts`). 날짜 키는 `dateKey` 하나로 충분하다. */
function bookingDateKey(startsAt: string) { return dateKey(startsAt); }

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
  const automations = data.records.automations ?? [];
  const notices = data.records.notices ?? [];
  const settings = data.settings;
  const shopName = typeof settings.shopName === "string" ? settings.shopName : "헤어해요";
  const ownerName = typeof settings.ownerName === "string" ? settings.ownerName : "서원";
  const smsRemaining = typeof settings.smsRemaining === "number" ? settings.smsRemaining : 0;
  // 폴백도 서울 기준이어야 한다. UTC 는 09:00 이전에 어제를 오늘이라 부른다.
  const todayKey = dateKey(today) ?? seoulDate();
  const customerNames = new Map(customers.map((record) => [record.id, textValue(objectValue(record), "name", record.id)]));
  const todayBookings = bookings.filter((record) => bookingDateKey(textValue(objectValue(record), "startsAt")) === todayKey).sort((left, right) => textValue(objectValue(left), "startsAt").localeCompare(textValue(objectValue(right), "startsAt")));
  const dayCounts = dayNames.map((label, offset) => ({ label, count: bookings.filter((record) => bookingDateKey(textValue(objectValue(record), "startsAt")) === addDays(todayKey, offset)).length }));
  const todaySales = data.todayLedger.filter((entry) => dateKey(entry.occurredAt) === todayKey).reduce((total, entry) => total + entry.amountWon, 0);
  const recentAudit = data.recentAudit;
  const malformedDateCount = bookings.filter((record) => bookingDateKey(textValue(objectValue(record), "startsAt")) === null).length + data.malformedLedgerDates;

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
      label: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
      name: customerNames.get(customerId) ?? customerId,
      service: textValue(booking, "service"),
      start,
      startsAt,
      status,
      style: statusStyles[status],
    }];
  });
  /**
   * 빈 구간은 예약 **사이**만이 아니다. 첫 예약 전과 마지막 예약 후도 비어 있다.
   *
   * 지금까지는 인접한 두 예약의 틈만 셌다. 오전 첫 예약이 14시면 09–14시가 통째로
   * 비어 있는데도 축에 아무 표시가 없었다.
   *
   * 경계를 `[영업시작, 예약1시작, 예약1종료, …, 영업종료]` 로 늘어놓으면 짝수 자리가
   * 빈 구간의 시작이 된다. 예약이 없는 날은 `[시작, 종료]` 하나 — 하루 전체가 빈 구간이다.
   */
  const railEdges = [openMinutes, ...railBookings.flatMap((booking) => [booking.start, booking.end]), closeMinutes];
  const railGaps = railEdges.flatMap((start, index) => {
    const gap = index % 2 === 0 ? railEdges[index + 1] - start : 0;
    return gap >= policy.bookingSlotMinutes ? [{ height: railHeight(gap), minutes: gap, startMinutes: start, top: railOffset(start, openMinutes) }] : [];
  });
  // 빈 슬롯이 "배정 가능"이라고 말만 하던 자리에 실제 목적지를 준다.
  // 예약 폼은 `defaultValue` 로만 채운다 — 사용자가 시간을 고칠 수 있어야 한다.
  const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const assignHref = (customerId = "", startMinutes?: number) => `/bookings?new=1&date=${todayKey}${customerId ? `&customerId=${encodeURIComponent(customerId)}` : ""}${startMinutes === undefined ? "" : `&startTime=${clock(startMinutes)}`}`;
  // 예약 블록의 다음 동작은 예약 화면 행과 같은 규칙이다(설계 §4.1·§4.2).
  // `returnTo` 를 `/` 로 주면 `app/payment-actions.ts:12` 허용 목록에 없어 `/sales` 로 떨어진다.
  // 대시보드는 오늘 하루 화면이므로 오늘 날짜의 예약 목록으로 돌려보낸다.
  // `waiting` 은 확정이 POST 라 링크로 못 만든다 — 확정 버튼이 있는 그 행으로 보낸다.
  const dayHref = `/bookings?date=${todayKey}`;
  const nextHref = (booking: { id: string; status: string }) =>
    booking.status === "confirmed" || booking.status === "in-progress" ? `/sales?tab=payment&booking=${booking.id}&returnTo=${encodeURIComponent(dayHref)}`
    : booking.status === "waiting" ? `${dayHref}&edit=${booking.id}`
    : null;
  /**
   * 빈 시간과 예약을 시작 분으로 합쳐 하나의 `<ol>` 로 그린다.
   *
   * 예약 블록이 포커스를 받는 순간 두 배열을 따로 그리는 건 깨진다 — DOM 순서가
   * "빈 시간 전부 → 예약 전부" 라 Tab 이 하루를 두 번 훑으며 시간 순서를 잃는다.
   * 위치는 그대로 `absolute` 다. 이건 DOM 순서 변경이지 레이아웃 변경이 아니다.
   */
  const railItems = [
    ...railGaps.map((gap) => ({ gap, key: `gap-${gap.top}`, sort: gap.startMinutes } as const)),
    ...railBookings.map((booking) => ({ booking, key: booking.id, sort: booking.start } as const)),
  ].sort((left, right) => left.sort - right.sort);
  const completedToday = railBookings.filter((booking) => booking.status === "completed").length;
  const enabledAutomations = automations.filter((record) => textValue(objectValue(record), "status") === "사용").length;

  return (
      <main className="flex min-w-0 flex-col px-7 pb-6 pt-5">
        <div className="flex items-center gap-3">
          <h2 className={typeScale.section}>오늘 할 일</h2>
          <div className="h-px min-w-0 flex-1 bg-transparent" />
          <nav aria-label="빠른 작업" className="flex gap-2">
            {[["예약 등록", "/bookings?new=1"], ["고객 등록", "/customers?new=1"], ["결제 등록", "/sales?tab=payment"], ["문자 발송", "/messages?new=1"]].map(([label, href], index) => <Link className={button("md", index === 0 ? "primary" : "secondary")} href={href} key={href}>{label}</Link>)}
          </nav>
        </div>

        {/* 서버가 처음부터 그려 보내는 내용이다. `role="status"` 를 붙이면 살아 있는 영역이 되어
            바뀐 적도 없는 문장을 읽는 순서에서 한 번, 알림으로 또 한 번 듣게 된다. */}
        {malformedDateCount > 0 && <p className="mt-4 rounded-[var(--radius-card)] border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm font-bold">날짜 확인 필요: {malformedDateCount}건</p>}

        <div className="mt-5 grid min-h-0 grid-cols-[minmax(0,1fr)_336px] items-start gap-5" data-dashboard-timeline-layout="compact">
          <section aria-label="사용자 예약 타임라인" className={`${card} flex min-h-0 flex-col overflow-hidden`}>
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-[18px] py-[15px]"><h2 className={typeScale.section}>하루 축</h2><div className="h-px min-w-0 flex-1" /><div className="flex items-center gap-2.5 font-mono text-[11px] text-[var(--muted)]">{dayCounts.map(({ label, count }, index) => <span key={label}>{index > 0 && <i className="mx-1 inline-block h-3 w-px bg-[var(--border)]" />} {label} <b className="text-[var(--foreground)]">{count}건</b></span>)}</div><Link className={button("xs")} href="/bookings">날짜별 예약 현황</Link><span className="font-mono text-[11px] text-[var(--muted)]">{policy.bookingOpen} – {policy.bookingClose} · {policy.bookingSlotMinutes}분</span></div>
            {/* 축은 영업시간 전체를 그려 거의 항상 세로로 넘친다. 스크롤 상자는 스스로 포커스를
                받을 수 있어야 키보드만 쓰는 사용자가 축을 위아래로 넘길 수 있다. */}
            <div aria-label="하루 축 스크롤 영역" className="min-h-0 flex-1 overflow-auto p-[18px] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--brand)]" tabIndex={0}>
              {railBookings.length > 0 ? (
                <div className="relative" style={{ height: `${railHeightPx}px` }}>
                  {hourMarks.map(({ label, top }) => (
                    <div className="absolute inset-x-0" key={label} style={{ top: `${top}px` }}>
                      <span className="absolute left-0 -translate-y-1/2 font-mono text-[11px] text-[var(--muted)]">{label}</span>
                      <span className="absolute left-[56px] right-0 h-px bg-[rgba(224,222,215,0.85)]" />
                    </div>
                  ))}
                  <ol>
                    {railItems.map((item) => "gap" in item ? (
                      <li className="absolute left-[56px] right-0" key={item.key} style={{ height: `${item.gap.height}px`, top: `${item.gap.top}px` }}>
                        <Link className={`grid h-full place-items-center rounded-[var(--radius-control)] text-[11px] text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] ${focusRing}`} href={assignHref("", item.gap.startMinutes)}>
                          {item.gap.minutes}분 비어 있음
                        </Link>
                      </li>
                    ) : (
                      <li className={`absolute left-[56px] right-0 overflow-hidden rounded-[var(--radius-control)] border ${item.booking.style.card}`} data-booking-status={item.booking.status} key={item.key} style={{ height: `${railHeight(item.booking.end - item.booking.start)}px`, top: `${railOffset(item.booking.start, openMinutes)}px` }}>
                        <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${item.booking.style.stripe}`} />
                        {/* 축 위에서 가장 큰 물체가 지금까지 죽어 있었다 — 빈 시간만 링크였다(설계 §4.2).
                            완료·취소는 다음 동작이 없으므로 링크로 감싸지 않는다. 감싸고 비활성화하면 Tab 만 늘어난다. */}
                        {(() => { const href = nextHref(item.booking); const inner = <div className="flex h-full items-center gap-3 py-1.5 pl-[12px] pr-3">
                          <time className="shrink-0 font-mono text-[11px] text-[var(--muted)]" dateTime={item.booking.startsAt}>{item.booking.label}</time>
                          <div className="min-w-0 flex-1">
                            <strong className="block truncate text-[13px]">{item.booking.name}</strong>
                            <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">{item.booking.service}</span>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${item.booking.style.badge}`}>
                            <span aria-hidden="true" className={`mr-1 inline-block size-1.5 rounded-full align-middle ${item.booking.style.dot}`} />
                            {item.booking.style.label}
                          </span>
                        </div>; return href ? <Link className={`block h-full rounded-[var(--radius-control)] ${focusRing}`} href={href}>{inner}</Link> : inner; })()}
                      </li>
                    ))}
                  </ol>
                  {nowVisible && (
                    <div aria-label={`현재 시각 ${timeFormatter.format(today)}`} className="pointer-events-none absolute inset-x-0" data-now-line role="separator" style={{ top: `${railOffset(nowMinutes!, openMinutes)}px` }}>
                      <span className="absolute left-0 -translate-y-1/2 rounded-[var(--radius-chip)] bg-[var(--accent)] px-[5px] py-[2px] font-mono text-[10px] leading-none text-white">{timeFormatter.format(today)}</span>
                      <span className="absolute left-[44px] right-0 h-px bg-[var(--accent)]" />
                    </div>
                  )}
                </div>
              ) : <div className="grid h-full min-h-[280px] place-items-center text-center" data-dashboard-empty-timeline><div><p className="font-mono text-[11px] text-[var(--muted)]">오늘 예약이 없습니다.</p><Link className={button("sm", "primary", "mt-3")} href="/bookings?new=1">예약 등록</Link></div></div>}
            </div>
          </section>

          <aside className="min-h-0 space-y-[18px] overflow-auto pr-1">
            <section aria-label="운영 현황" className={`${card} overflow-hidden`}><div className="flex items-center justify-between border-b border-[var(--border)] px-[18px] py-3"><h2 className={typeScale.section}>운영 현황</h2><span className="font-mono text-[10px] text-[var(--muted)]">확정 반영</span></div><dl className="px-[18px] py-2"><div className="flex items-end justify-between gap-2 border-b border-[var(--border)] py-[10px]"><dt className="text-[11px] text-[var(--muted)]">매출</dt><dd className={`font-mono ${typeScale.display}`}>₩{todaySales.toLocaleString("ko-KR")}</dd></div>{[["예약", `완료 ${completedToday}건 · 남은 ${todayBookings.length - completedToday}건`, `${todayBookings.length}건`], ["미수금", "없음", "₩0"], ["SMS 잔여", `자동 발송 ${enabledAutomations}건 예정`, `${smsRemaining.toLocaleString("ko-KR")}건`]].map(([label, subtitle, value]) => <div className="flex items-center gap-[8px] border-b border-[var(--border)] py-[10px] last:border-0" key={label}><div className="min-w-0 flex-1"><dt className="text-[12px]">{label}</dt><span className="mt-0.5 block text-[11px] text-[var(--muted)]">{subtitle}</span></div><dd className="font-mono font-medium">{value}</dd></div>)}<div className="flex items-center gap-2 pt-3 text-[11px] text-[var(--muted)]"><span className="h-[11px] w-[2px] bg-[var(--accent)]" />정정 {recentAudit.filter((event) => event.action.includes("correction")).length}건 · 삭제 없이 원장에 덧붙임</div></dl></section>
            <section aria-label="자동 문자" className={`${card} overflow-hidden`}><div className="flex items-center justify-between border-b border-[var(--border)] px-[18px] py-3"><h2 className={typeScale.section}>자동 문자</h2><span className="font-mono text-[11px] text-[var(--muted)]">오늘 예정</span></div><div className="grid grid-cols-2 gap-x-3 gap-y-3 px-[18px] py-3">{automations.length ? automations.slice(0, 6).map((record) => { const automation = objectValue(record); const enabled = textValue(automation, "status") === "사용"; return <div className="flex items-start gap-1.5" key={record.id}><span className={`mt-1 size-1.5 rounded-full ${enabled ? "bg-[var(--success)]" : "bg-[var(--muted)]"}`} /><div><strong className="block text-[12px]">{textValue(automation, "label")}</strong><span className="font-mono text-[10px] text-[var(--muted)]">{textValue(automation, "schedule")} · {enabled ? "켜짐" : "꺼짐"}</span></div></div>; }) : <p className="col-span-2 py-3 text-sm text-[var(--muted)]">대기 중인 자동화가 없습니다.</p>}</div><p className="mx-[18px] mb-3 rounded-[var(--radius-card)] bg-[var(--brand-soft)] px-2 py-1.5 text-[11px] text-[var(--brand)]">발송 전 확인 필요 · 설정 › 문자에서 켜고 끕니다</p></section>
          </aside>
        </div>

        <div className="sr-only"><h2>공지사항</h2>{notices.length ? notices.map((record) => <Link href={`/settings?section=help#${record.id}`} key={record.id}>{textValue(objectValue(record), "title")}</Link>) : <p>공지사항이 없습니다.</p>}<h2>최근 감사 이력</h2>{recentAudit.length ? recentAudit.map((event) => <span key={event.id}>{event.actor} · {event.action} · {event.kind ?? "시스템"} · {auditDateLabel(event.occurredAt)}</span>) : <p>감사 이력이 없습니다.</p>}<p>오늘 매출</p><p>오늘 예약</p><p>자동화 대기열</p><p>SMS 잔여 {smsRemaining.toLocaleString("ko-KR")}건</p>{automations.map((record) => <p key={`automation-summary-${record.id}`}>{textValue(objectValue(record), "status")}</p>)}{dayCounts.map(({ label, count }) => <p key={`summary-${label}`}>{label} {count}건</p>)}</div>
      </main>
  );
}
