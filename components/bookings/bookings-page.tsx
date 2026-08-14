import Link from "next/link";

import { cancelBooking, changeBookingStatus, saveBooking } from "../../app/booking-actions";
import { bookingSettings } from "../../lib/booking";
import { customerOptions } from "../../lib/customer-options";
import { displayStatus, minutesOfDay, railHeight, railHourMarks, railOffset, railTotalHeight, statusStyles } from "../../lib/day-rail";
import { seoulClockOrEmpty } from "../../lib/seoul-date";
import type { JsonObject, JsonValue, SalonRecord } from "../../lib/salon-domain";
import { closeHref, toSearchParams, withoutParams } from "../../lib/navigation";
import { button, control, focusRing, rowLink } from "../button";
import { ModalHost } from "../modal-host";
import { surface as card } from "../surface";
import { SubmitButton, ActionForm, NoticeBanner } from "../submit-button";
import { typeScale } from "../type";
import { NaverMailConnection } from "./naver-mail-connection";

const input = control;

type Props = { bookings: readonly SalonRecord<JsonValue>[]; customers: readonly SalonRecord<JsonValue>[]; settings: JsonObject; syncHistory: readonly SalonRecord<JsonValue>[]; date?: string; view?: string; period?: string; showNew?: boolean; newCustomerId?: string; newStartTime?: string; error?: string; notice?: string; edit?: string; now?: Date; searchParams?: Record<string, string | string[] | undefined>; };

const seoulClock = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", hour12: false, minute: "2-digit", timeZone: "Asia/Seoul" });

function value(record: SalonRecord<JsonValue>) { return typeof record.value === "object" && record.value !== null && !Array.isArray(record.value) ? record.value as JsonObject : {}; }
function text(record: SalonRecord<JsonValue>, key: string, fallback = "") { const field = value(record)[key]; return typeof field === "string" ? field : fallback; }
function bool(record: SalonRecord<JsonValue>, key: string) { return value(record)[key] === true; }
function setting(settings: JsonObject, key: string, fallback = "") { return typeof settings[key] === "string" ? settings[key] : fallback; }
function addDays(date: string, days: number) { const next = new Date(`${date}T00:00:00.000Z`); next.setUTCDate(next.getUTCDate() + days); return next.toISOString().slice(0, 10); }
export function todayInSeoul(now = new Date()) { const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now); const part = (type: string) => parts.find((item) => item.type === type)?.value; return `${part("year")}-${part("month")}-${part("day")}`; }
export function addCalendarMonths(date: string, months: number) { const [year, month, day] = date.split("-").map(Number); const target = year * 12 + month - 1 + months; const targetYear = Math.floor(target / 12); const targetMonth = target % 12 + 1; const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate(); return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`; }
function link(date: string, view: string, period: string, extra = "") { return `/bookings?date=${date}&view=${view}${period ? `&period=${period}` : ""}${extra}`; }
function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="grid gap-1 text-xs font-medium text-[var(--muted)]"><span>{label}</span>{children}</label>; }

function BookingForm({ booking, customerId, customers, date, returnTo, slotMinutes, startTime }: { booking?: SalonRecord<JsonValue>; customerId?: string; customers: Props["customers"]; date: string; returnTo: string; slotMinutes: number; startTime?: string }) {
  const current = booking ? value(booking) : {}; const string = (key: string, fallback = "") => typeof current[key] === "string" ? current[key] : fallback;
  const start = seoulClockOrEmpty(string("startsAt")); const end = seoulClockOrEmpty(string("endsAt"));
  // 시작 시간만 프리필하고 종료를 10:30 으로 두면 저장이 "예약 종료" 검증에서 튕긴다. 한 슬롯 뒤로 민다.
  const defaultStart = start.time || startTime || "10:00";
  const after = (Number(defaultStart.slice(0, 2)) * 60 + Number(defaultStart.slice(3, 5)) + slotMinutes) % 1440;
  const defaultEnd = end.time || `${String(Math.floor(after / 60)).padStart(2, "0")}:${String(after % 60).padStart(2, "0")}`;
  return <ActionForm action={saveBooking} aria-label={booking ? "예약 수정" : "예약 등록"} className="grid grid-cols-4 gap-3" errorClassName="col-span-4 rounded-[var(--radius-card)] border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]" errorPrefix="입력 내용을 수정하세요: "><input name="returnTo" type="hidden" value={returnTo} />
    {booking && <input name="bookingId" type="hidden" value={booking.id} />}<Field label="기존 고객"><select className={input} defaultValue={string("customerId") || customerId || ""} name="customerId"><option value="">신규 고객으로 등록</option>{customerOptions(customers).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field><Field label="신규 고객명"><input className={input} name="newCustomerName" placeholder="기존 고객 미선택 시" /></Field><Field label="신규 휴대전화"><input className={input} name="newCustomerPhone" placeholder="010-0000-0000" type="tel" /></Field><Field label="시술 메뉴"><input className={input} defaultValue={string("service")} name="service" required /></Field>
    <Field label="예약 날짜"><input className={input} defaultValue={start.date || date} name="date" required type="date" /></Field><Field label="시작 시간"><input className={input} defaultValue={defaultStart} name="startTime" required type="time" /></Field><Field label="종료 시간"><input className={input} defaultValue={defaultEnd} name="endTime" required type="time" /></Field><Field label="상태"><select className={input} defaultValue={string("status", "confirmed")} name="status"><option value="confirmed">예약</option><option value="waiting">대기</option><option value="completed">완료</option></select></Field>
    <label className="flex items-center gap-2 text-sm"><input defaultChecked={bool(booking ?? { id: "", kind: "", value: {}, createdAt: "", updatedAt: "", archivedAt: null }, "reminderDayBefore")} name="reminderDayBefore" type="checkbox" /> 전일 알림</label><label className="flex items-center gap-2 text-sm"><input defaultChecked={bool(booking ?? { id: "", kind: "", value: {}, createdAt: "", updatedAt: "", archivedAt: null }, "reminderDayOf")} name="reminderDayOf" type="checkbox" /> 당일 알림</label><Field label="방문일 추가 문구"><input className={input} defaultValue={string("reminderText")} maxLength={150} name="reminderText" /></Field><Field label="예약 메모"><input className={input} defaultValue={string("memo")} maxLength={150} name="memo" /></Field>
    <SubmitButton extra="col-span-4 w-full">{booking ? "예약 저장" : "예약 등록"}</SubmitButton>
  </ActionForm>;
}

export function BookingsPage({ bookings, customers, settings, syncHistory, date, view = "day", period = "7", showNew, newCustomerId, newStartTime, error, notice, edit, searchParams, now = new Date() }: Props) {
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? date! : todayInSeoul();
  const activeView = ["day", "month", "period"].includes(view) ? view : "day";
  const days = Math.min(31, Math.max(1, Number(period) || 7));
  const policy = bookingSettings({ bookingOpen: setting(settings, "bookingOpen") || undefined, bookingClose: setting(settings, "bookingClose") || undefined, bookingSlotMinutes: typeof settings.bookingSlotMinutes === "number" ? settings.bookingSlotMinutes : undefined });
  const names = new Map(customers.map((customer) => [customer.id, text(customer, "name", customer.id)]));
  // 저장 값은 참 시각 ISO 다. 날짜 비교는 서울 벽시계 날짜로 되돌린 뒤에 한다.
  const bookingDate = (booking: SalonRecord<JsonValue>) => seoulClockOrEmpty(text(booking, "startsAt")).date;
  const visible = bookings.filter((booking) => activeView === "month" ? bookingDate(booking).startsWith(selectedDate.slice(0, 7)) : activeView === "period" ? bookingDate(booking) >= selectedDate && bookingDate(booking) < addDays(selectedDate, days) : bookingDate(booking) === selectedDate).sort((a, b) => text(a, "startsAt").localeCompare(text(b, "startsAt")));
  const previousDate = activeView === "month" ? addCalendarMonths(selectedDate, -1) : addDays(selectedDate, activeView === "period" ? -days : -1);
  const nextDate = activeView === "month" ? addCalendarMonths(selectedDate, 1) : addDays(selectedDate, activeView === "period" ? days : 1);
  // 닫기·복귀 경로는 현재 URL 에서 파생한다. `link()` 로 손 조립하면 `edit` 같은 파라미터가 사라진다.
  // `error`/`notice` 는 서버 액션이 실패할 때 다시 붙이는 일회성 값이라 복귀 경로에서는 뺀다.
  const current = toSearchParams(searchParams ?? { date: selectedDate, view: activeView, ...(period ? { period } : {}) });
  const returnTo = closeHref("/bookings", current, "new", "error", "notice");
  const editReturnTo = (bookingId: string) => { const params = withoutParams(current, "new", "error", "notice"); params.set("edit", bookingId); return `/bookings?${params}`; };
  const openHref = (() => { const params = withoutParams(current, "error", "notice"); params.set("new", "1"); return `/bookings?${params}`; })();
  // 결제 화면으로 넘어갔다 돌아올 자리도 `returnTo` 하나에서 나온다. 여기서 `/bookings?date=...` 를
  // 손으로 이어 붙이면 `view`·`period`·`edit` 이 조용히 떨어져 저장 후 엉뚱한 날짜로 돌아온다.
  const payHref = (bookingId: string) => `/sales?tab=payment&booking=${bookingId}&returnTo=${encodeURIComponent(returnTo)}`;

  const openMinutes = minutesOfDay(policy.bookingOpen) ?? 540;
  const closeMinutes = minutesOfDay(policy.bookingClose) ?? 1200;
  const isToday = selectedDate === todayInSeoul(now);
  const nowMinutes = isToday ? minutesOfDay(seoulClock.format(now)) : null;
  const railHeightPx = railTotalHeight(openMinutes, closeMinutes);
  const hourMarks = railHourMarks(openMinutes, closeMinutes);
  const nowVisible = nowMinutes !== null && nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
  /** 저장 상태 + 현재 시각으로 표시 상태를 정한다. 리스트·레일이 같은 색을 쓰도록 한 곳에서 계산. */
  const statusOf = (booking: SalonRecord<JsonValue>) => {
    const start = minutesOfDay(text(booking, "startsAt"));
    const end = minutesOfDay(text(booking, "endsAt")) ?? (start === null ? null : start + policy.bookingSlotMinutes);
    return displayStatus(text(booking, "status"), start, end, bookingDate(booking) === todayInSeoul(now) ? nowMinutes : null);
  };
  const railBookings = activeView !== "day" ? [] : visible.flatMap((booking) => {
    const start = minutesOfDay(text(booking, "startsAt"));
    if (start === null) return [];
    const end = minutesOfDay(text(booking, "endsAt")) ?? start + policy.bookingSlotMinutes;
    const status = statusOf(booking);
    return [{ end, id: booking.id, label: seoulClockOrEmpty(text(booking, "startsAt")).time, name: names.get(text(booking, "customerId")) ?? "고객 확인 필요", service: text(booking, "service"), start, startsAt: text(booking, "startsAt"), status, style: statusStyles[status] }];
  });
  const overlay = showNew ? <section aria-label="새 예약 등록" aria-modal="true" data-dialog-panel role="dialog" className="p-5"><div className="flex items-center justify-between gap-4"><h2 className={typeScale.title}>새 예약 등록</h2><Link data-dialog-close href={returnTo} className={button("md")}>닫기</Link></div><div className="mt-4"><BookingForm customerId={newCustomerId} customers={customers} date={selectedDate} returnTo={returnTo} slotMinutes={policy.bookingSlotMinutes} startTime={newStartTime} /></div></section> : undefined;
  return <main className="min-w-[1032px] px-7 pb-6 pt-5">
    {overlay && <ModalHost label="새 예약 등록">{overlay}</ModalHost>}
    {error && <p className="mb-5 rounded-[var(--radius-card)] border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]" role="alert">입력 내용을 수정하세요: {error}</p>}
    {notice && <NoticeBanner className="mb-5 rounded-[var(--radius-card)] border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">{notice}</NoticeBanner>}
    <section aria-label="예약 보기와 날짜 이동" className={`${card} flex items-center justify-between gap-4 p-4`}><nav aria-label="예약 보기" className="flex gap-2">{[["day", "일"], ["month", "월"], ["period", "기간"]].map(([key, label]) => <Link className={button("md", activeView === key ? "primary" : "secondary")} href={link(selectedDate, key, period)} key={key}>{label} 보기</Link>)}</nav><div className="flex items-center gap-2"><Link className={button("md")} href={link(previousDate, activeView, period)}>이전</Link><Link className={button("md")} href={link(todayInSeoul(), activeView, period)}>오늘</Link><Link className={button("md")} href={link(nextDate, activeView, period)}>다음</Link>{activeView === "period" && <form method="get"><input name="date" type="hidden" value={selectedDate} /><input name="view" type="hidden" value="period" /><select aria-label="기간 일수" className={input} defaultValue={String(days)} name="period"><option value="7">7일</option><option value="14">14일</option><option value="31">31일</option></select><button className={button("md", "secondary", "ml-2")} type="submit">적용</button></form>}{/* 등록 버튼은 화면을 말로 설명하던 툴바 대신 날짜 줄 오른쪽 끝에 산다. */}<Link className={button("md", "primary", "ml-2")} href={openHref}>예약 등록</Link></div></section>
    <div className="mt-5 grid grid-cols-[minmax(0,1.4fr)_360px] gap-5"><section className={`${card} p-5`}><div className="flex items-baseline justify-between"><h2 className={typeScale.section}>{activeView === "month" ? `${selectedDate.slice(0, 7)} 월간` : activeView === "period" ? `${selectedDate}부터 ${days}일` : selectedDate}</h2><span className="text-sm text-[var(--muted)]">{visible.length}건</span></div>
      {/* 축 그림은 바로 아래 예약 목록과 같은 내용을 시간 위치로만 다시 그린다.
          보조 기술에는 목록 하나만 읽히면 된다 — 여기에는 포커스 갈 곳도 없다. */}
      {activeView === "day" && railBookings.length > 0 && <div aria-hidden="true" className="relative mt-4 overflow-hidden border-b border-[var(--border)] pb-4" data-booking-rail style={{ height: `${railHeightPx + 16}px` }}>
        {hourMarks.map(({ label, top }) => <div className="absolute inset-x-0" key={label} style={{ top: `${top}px` }}><span className="absolute left-0 -translate-y-1/2 font-mono text-[11px] text-[var(--muted)]">{label}</span><span className="absolute left-[50px] right-0 h-px bg-[rgba(224,222,215,0.85)]" /></div>)}
        <ol>{railBookings.map((booking) => <li className={`absolute left-[50px] right-0 overflow-hidden rounded-[var(--radius-control)] border ${booking.style.card}`} data-booking-block={booking.id} data-booking-status={booking.status} key={booking.id} style={{ height: `${railHeight(booking.end - booking.start)}px`, top: `${railOffset(booking.start, openMinutes)}px` }}>
          <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[2.5px] ${booking.style.stripe}`} />
          <div className="flex h-full items-center gap-2.5 py-1 pl-3 pr-2.5"><time className="shrink-0 font-mono text-[11px] text-[var(--muted)]" dateTime={booking.startsAt}>{booking.label}</time><strong className="min-w-0 flex-1 truncate text-[12px]">{booking.name}</strong><span className="min-w-0 truncate text-[11px] text-[var(--muted)]">{booking.service}</span><span aria-label={booking.style.label} className={`size-[8px] shrink-0 rounded-[var(--radius-chip)] ${booking.style.dot}`} /></div>
        </li>)}</ol>
        {nowVisible && <div aria-label={`현재 시각 ${seoulClock.format(now)}`} className="pointer-events-none absolute inset-x-0" data-now-line role="separator" style={{ top: `${railOffset(nowMinutes!, openMinutes)}px` }}><span className="absolute left-0 -translate-y-1/2 rounded-[var(--radius-chip)] bg-[var(--accent)] px-1 py-px font-mono text-[10px] leading-none text-white">{seoulClock.format(now)}</span><span className="absolute left-[38px] right-0 h-px bg-[var(--accent)]" /></div>}
      </div>}
      {visible.length ? <ol className="mt-4 divide-y divide-[var(--border)]">{visible.map((booking) => { const status = statusOf(booking); const style = statusStyles[status]; const clock = seoulClockOrEmpty(text(booking, "startsAt")); const endClock = seoulClockOrEmpty(text(booking, "endsAt")); return <li className="py-4" data-booking-row={booking.id} key={booking.id}><div className="grid grid-cols-[92px_1fr_auto] items-start gap-3"><time className="font-bold tabular-nums text-[var(--brand)]" dateTime={text(booking, "startsAt")}>{clock.date} {clock.time}</time><div><Link className={`rounded-[var(--radius-control)] font-bold hover:text-[var(--brand)] ${focusRing}`} href={`/customers?customer=${text(booking, "customerId")}`}>{names.get(text(booking, "customerId")) ?? "고객 확인 필요"}</Link><span className="ml-2 text-sm text-[var(--muted)]">{text(booking, "service")}</span><p className="mt-1 text-xs text-[var(--muted)]">종료 {endClock.time || "시간 미입력"} · 알림: {bool(booking, "reminderDayBefore") ? "전일" : "전일 없음"} / {bool(booking, "reminderDayOf") ? "당일" : "당일 없음"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${style.badge}`}><span aria-hidden="true" className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${style.dot}`} />상태: {style.label}</span></div><div className="mt-3 flex gap-3 text-xs"><Link className={rowLink} href={`/customers?customer=${text(booking, "customerId")}`}>고객 상세</Link>
        {/* 상태가 정하는 다음 동작 **하나**만 꺼낸다(설계 §4.1). 행마다 결제·확정·완료를 다 펼치면
            20행짜리 목록이 Tab 60정거장이 된다. 완료 처리·취소·수정은 아래 `<details>` 안에 그대로 둔다.
            `in-progress` 에도 결제를 주는 이유: 시각 파생 상태라(`lib/day-rail.ts:53`) 사용자가 통제할 수 없고 시술 중 선결제가 실재한다. */}
        {status === "confirmed" || status === "in-progress" ? <Link className={button("sm")} data-booking-next="payment" href={payHref(booking.id)}>결제 등록</Link>
          : status === "waiting" ? <form action={changeBookingStatus}><input name="bookingId" type="hidden" value={booking.id} /><input name="returnTo" type="hidden" value={returnTo} /><button className={button("sm")} data-booking-next="confirm" name="status" value="confirmed">예약 확정</button></form>
          : null}
        <details open={edit === booking.id}><summary className={`${rowLink} cursor-pointer list-none`}>수정·상태 변경</summary><div className="mt-3 rounded-[var(--radius-card)] bg-[var(--background)] p-4"><BookingForm booking={booking} customers={customers} date={selectedDate} returnTo={editReturnTo(booking.id)} slotMinutes={policy.bookingSlotMinutes} /><div className="mt-3 flex gap-2"><form action={changeBookingStatus}><input name="bookingId" type="hidden" value={booking.id} /><input name="returnTo" type="hidden" value={editReturnTo(booking.id)} /><button className={button("sm")} name="status" value="completed">완료 처리</button></form><form action={cancelBooking}><input name="bookingId" type="hidden" value={booking.id} /><input name="returnTo" type="hidden" value={editReturnTo(booking.id)} /><input aria-label="취소 사유" className={`${input} h-8`} maxLength={150} name="cancelReason" placeholder="취소 사유" /><SubmitButton extra="ml-2" size="sm" tone="warning">취소</SubmitButton></form></div></div></details></div></li>; })}</ol> : <div className="mt-6 rounded-[var(--radius-card)] bg-[var(--background)] p-8 text-center"><p className="text-sm text-[var(--muted)]">선택한 날짜에 예약이 없습니다.</p><Link className={button("sm", "primary", "mt-3")} href={openHref}>예약 등록</Link></div>}</section>
      <aside className={`${card} h-fit p-5`}><h2 className={typeScale.section}>영업 시간</h2><p className="mt-2 text-sm text-[var(--muted)]">{policy.bookingOpen}–{policy.bookingClose} · {policy.bookingSlotMinutes}분 단위</p><p className="mt-3 rounded-[var(--radius-card)] bg-[var(--background)] p-3 text-xs text-[var(--muted)]">중복 예약: {settings.bookingAllowOverlap === true ? "허용" : "차단"} · 알림: {settings.reminderDayBefore === true ? "전일" : "전일 없음"} / {settings.reminderDayOf === true ? "당일" : "당일 없음"}. 모든 변경은 원장 감사 이력에 남습니다.</p>{/* 업무 화면은 값을 보여주기만 한다. 고치는 곳은 한 군데뿐이다 (설계 §5.3). */}<Link className={`${rowLink} mt-3 -ml-2 inline-block text-sm`} href="/settings?section=booking">설정에서 변경</Link></aside></div>
    <details data-booking-settings className={`${card} mt-5`}><summary className={`cursor-pointer list-none rounded-[var(--radius-card)] p-5 ${focusRing}`}><strong className={typeScale.section}>네이버 예약 메일 연동</strong><span className="ml-3 text-sm text-[var(--muted)]">외부 연동 상태</span></summary><div className="border-t border-[var(--border)] p-5"><NaverMailConnection history={syncHistory} settings={settings} /></div></details>
  </main>;
}
