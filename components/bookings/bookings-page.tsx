import Link from "next/link";

import { cancelBooking, changeBookingStatus, saveBooking, saveBookingSettings } from "../../app/booking-actions";
import { bookingSettings } from "../../lib/booking";
import { customerOptions } from "../../lib/customer-options";
import { displayStatus, minutesOfDay, railHeight, railHourMarks, railOffset, railTotalHeight, statusStyles } from "../../lib/day-rail";
import type { JsonObject, JsonValue, SalonRecord } from "../../lib/salon-domain";
import { closeHref, toSearchParams, withoutParams } from "../../lib/navigation";
import { button } from "../button";
import { ModalHost } from "../modal-host";
import { PageToolbar } from "../page-toolbar";
import { surface as card } from "../surface";
import { NaverMailConnection } from "./naver-mail-connection";

const input = "h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm";

type Props = { bookings: readonly SalonRecord<JsonValue>[]; customers: readonly SalonRecord<JsonValue>[]; settings: JsonObject; syncHistory: readonly SalonRecord<JsonValue>[]; date?: string; view?: string; period?: string; showNew?: boolean; newCustomerId?: string; newStartTime?: string; newWaitingId?: string; error?: string; notice?: string; edit?: string; now?: Date; searchParams?: Record<string, string | string[] | undefined>; };

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

function BookingForm({ booking, customerId, customers, date, returnTo, slotMinutes, startTime, waitingId }: { booking?: SalonRecord<JsonValue>; customerId?: string; customers: Props["customers"]; date: string; returnTo: string; slotMinutes: number; startTime?: string; waitingId?: string }) {
  const current = booking ? value(booking) : {}; const string = (key: string, fallback = "") => typeof current[key] === "string" ? current[key] : fallback;
  const start = string("startsAt"); const end = string("endsAt");
  // 시작 시간만 프리필하고 종료를 10:30 으로 두면 저장이 "예약 종료" 검증에서 튕긴다. 한 슬롯 뒤로 민다.
  const defaultStart = start.slice(11, 16) || startTime || "10:00";
  const after = (Number(defaultStart.slice(0, 2)) * 60 + Number(defaultStart.slice(3, 5)) + slotMinutes) % 1440;
  const defaultEnd = end.slice(11, 16) || `${String(Math.floor(after / 60)).padStart(2, "0")}:${String(after % 60).padStart(2, "0")}`;
  return <form action={saveBooking} aria-label={booking ? "예약 수정" : "예약 등록"} className="grid grid-cols-4 gap-3"><input name="returnTo" type="hidden" value={returnTo} />
    {/* 대기 고객에서 넘어왔으면 예약 저장 성공 시 그 대기 줄이 사라져야 한다. 두 번 처리할 일이 아니다. */}
    {waitingId && <input name="waitingId" type="hidden" value={waitingId} />}
    {booking && <input name="bookingId" type="hidden" value={booking.id} />}<Field label="기존 고객"><select className={input} defaultValue={string("customerId") || customerId || ""} name="customerId"><option value="">신규 고객으로 등록</option>{customerOptions(customers).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field><Field label="신규 고객명"><input className={input} name="newCustomerName" placeholder="기존 고객 미선택 시" /></Field><Field label="신규 휴대전화"><input className={input} name="newCustomerPhone" placeholder="010-0000-0000" /></Field><Field label="시술 메뉴"><input className={input} defaultValue={string("service")} name="service" required /></Field>
    <Field label="예약 날짜"><input className={input} defaultValue={start.slice(0, 10) || date} name="date" required type="date" /></Field><Field label="시작 시간"><input className={input} defaultValue={defaultStart} name="startTime" required type="time" /></Field><Field label="종료 시간"><input className={input} defaultValue={defaultEnd} name="endTime" required type="time" /></Field><Field label="상태"><select className={input} defaultValue={string("status", "confirmed")} name="status"><option value="confirmed">예약</option><option value="waiting">대기</option><option value="completed">완료</option></select></Field>
    <label className="flex items-center gap-2 text-sm"><input defaultChecked={bool(booking ?? { id: "", kind: "", value: {}, createdAt: "", updatedAt: "", archivedAt: null }, "reminderDayBefore")} name="reminderDayBefore" type="checkbox" /> 전일 알림</label><label className="flex items-center gap-2 text-sm"><input defaultChecked={bool(booking ?? { id: "", kind: "", value: {}, createdAt: "", updatedAt: "", archivedAt: null }, "reminderDayOf")} name="reminderDayOf" type="checkbox" /> 당일 알림</label><Field label="방문일 추가 문구"><input className={input} defaultValue={string("reminderText")} maxLength={150} name="reminderText" /></Field><Field label="예약 메모"><input className={input} defaultValue={string("memo")} maxLength={150} name="memo" /></Field>
    <button className={button("lg", "primary", "col-span-4 w-full")} type="submit">{booking ? "예약 저장" : "예약 등록"}</button>
  </form>;
}

export function BookingsPage({ bookings, customers, settings, syncHistory, date, view = "day", period = "7", showNew, newCustomerId, newStartTime, newWaitingId, error, notice, edit, searchParams, now = new Date() }: Props) {
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? date! : todayInSeoul();
  const activeView = ["day", "month", "period"].includes(view) ? view : "day";
  const days = Math.min(31, Math.max(1, Number(period) || 7));
  const policy = bookingSettings({ bookingOpen: setting(settings, "bookingOpen") || undefined, bookingClose: setting(settings, "bookingClose") || undefined, bookingSlotMinutes: typeof settings.bookingSlotMinutes === "number" ? settings.bookingSlotMinutes : undefined });
  const names = new Map(customers.map((customer) => [customer.id, text(customer, "name", customer.id)]));
  const visible = bookings.filter((booking) => activeView === "month" ? text(booking, "startsAt").startsWith(selectedDate.slice(0, 7)) : activeView === "period" ? text(booking, "startsAt").slice(0, 10) >= selectedDate && text(booking, "startsAt").slice(0, 10) < addDays(selectedDate, days) : text(booking, "startsAt").slice(0, 10) === selectedDate).sort((a, b) => text(a, "startsAt").localeCompare(text(b, "startsAt")));
  const previousDate = activeView === "month" ? addCalendarMonths(selectedDate, -1) : addDays(selectedDate, activeView === "period" ? -days : -1);
  const nextDate = activeView === "month" ? addCalendarMonths(selectedDate, 1) : addDays(selectedDate, activeView === "period" ? days : 1);
  // 닫기·복귀 경로는 현재 URL 에서 파생한다. `link()` 로 손 조립하면 `edit` 같은 파라미터가 사라진다.
  // `error`/`notice` 는 서버 액션이 실패할 때 다시 붙이는 일회성 값이라 복귀 경로에서는 뺀다.
  const current = toSearchParams(searchParams ?? { date: selectedDate, view: activeView, ...(period ? { period } : {}) });
  const returnTo = closeHref("/bookings", current, "new", "error", "notice");
  const editReturnTo = (bookingId: string) => { const params = withoutParams(current, "new", "error", "notice"); params.set("edit", bookingId); return `/bookings?${params}`; };
  const openHref = (() => { const params = withoutParams(current, "error", "notice"); params.set("new", "1"); return `/bookings?${params}`; })();

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
    return displayStatus(text(booking, "status"), start, end, text(booking, "startsAt").slice(0, 10) === todayInSeoul(now) ? nowMinutes : null);
  };
  const railBookings = activeView !== "day" ? [] : visible.flatMap((booking) => {
    const start = minutesOfDay(text(booking, "startsAt"));
    if (start === null) return [];
    const end = minutesOfDay(text(booking, "endsAt")) ?? start + policy.bookingSlotMinutes;
    const status = statusOf(booking);
    return [{ end, id: booking.id, name: names.get(text(booking, "customerId")) ?? "고객 확인 필요", service: text(booking, "service"), start, startsAt: text(booking, "startsAt"), status, style: statusStyles[status] }];
  });
  const overlay = showNew ? <section aria-label="새 예약 등록" aria-modal="true" data-dialog-panel role="dialog" className="p-5"><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">새 예약 등록</h2><Link data-dialog-close href={returnTo} className={button("md")}>닫기</Link></div><div className="mt-4"><BookingForm customerId={newCustomerId} customers={customers} date={selectedDate} returnTo={returnTo} slotMinutes={policy.bookingSlotMinutes} startTime={newStartTime} waitingId={newWaitingId} /></div></section> : undefined;
  return <main className="min-w-[1032px] px-7 pb-6 pt-5">
    {overlay && <ModalHost label="새 예약 등록">{overlay}</ModalHost>}
    {error && <p className="mb-5 rounded-[var(--radius-card)] border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]" role="alert">입력 내용을 수정하세요: {error}</p>}
    {notice && <p className="mb-5 rounded-[var(--radius-card)] border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]" role="status">{notice}</p>}
    <PageToolbar description={<>단일 원장 일정입니다. 디자이너·직원 배정은 사용하지 않습니다. {selectedDate} · {visible.length}건 · {policy.bookingOpen}–{policy.bookingClose}</>}><Link className={button("lg", "primary")} href={openHref}>예약 등록</Link></PageToolbar>
    <section aria-label="예약 보기와 날짜 이동" className={`${card} mt-5 flex items-center justify-between gap-4 p-4`}><nav aria-label="예약 보기" className="flex gap-2">{[["day", "일"], ["month", "월"], ["period", "기간"]].map(([key, label]) => <Link className={button("md", activeView === key ? "primary" : "secondary")} href={link(selectedDate, key, period)} key={key}>{label} 보기</Link>)}</nav><div className="flex items-center gap-2"><Link className={button("md")} href={link(previousDate, activeView, period)}>이전</Link><Link className={button("md")} href={link(todayInSeoul(), activeView, period)}>오늘</Link><Link className={button("md")} href={link(nextDate, activeView, period)}>다음</Link>{activeView === "period" && <form method="get"><input name="date" type="hidden" value={selectedDate} /><input name="view" type="hidden" value="period" /><select aria-label="기간 일수" className={input} defaultValue={String(days)} name="period"><option value="7">7일</option><option value="14">14일</option><option value="31">31일</option></select><button className={button("md", "secondary", "ml-2")} type="submit">적용</button></form>}</div></section>
    <div className="mt-5 grid grid-cols-[minmax(0,1.4fr)_360px] gap-5"><section className={`${card} p-5`}><div className="flex items-baseline justify-between"><h2 className="text-lg font-bold">{activeView === "month" ? `${selectedDate.slice(0, 7)} 월간` : activeView === "period" ? `${selectedDate}부터 ${days}일` : selectedDate}</h2><span className="text-sm text-[var(--muted)]">{visible.length}건</span></div>
      {activeView === "day" && railBookings.length > 0 && <div className="relative mt-4 overflow-hidden border-b border-[var(--border)] pb-4" data-booking-rail style={{ height: `${railHeightPx + 16}px` }}>
        {hourMarks.map(({ label, top }) => <div className="absolute inset-x-0" key={label} style={{ top: `${top}px` }}><span className="absolute left-0 -translate-y-1/2 font-mono text-[10.5px] text-[var(--muted)]">{label}</span><span className="absolute left-[50px] right-0 h-px bg-[rgba(224,222,215,0.85)]" /></div>)}
        <ol>{railBookings.map((booking) => <li className={`absolute left-[50px] right-0 overflow-hidden rounded-[var(--radius-control)] border ${booking.style.card}`} data-booking-block={booking.id} data-booking-status={booking.status} key={booking.id} style={{ height: `${railHeight(booking.end - booking.start)}px`, top: `${railOffset(booking.start, openMinutes)}px` }}>
          <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[2.5px] ${booking.style.stripe}`} />
          <div className="flex h-full items-center gap-2.5 py-1 pl-3 pr-2.5"><time className="shrink-0 font-mono text-[10.5px] text-[var(--muted)]" dateTime={booking.startsAt}>{booking.startsAt.slice(11, 16)}</time><strong className="min-w-0 flex-1 truncate text-[11.5px]">{booking.name}</strong><span className="min-w-0 truncate text-[10.5px] text-[var(--muted)]">{booking.service}</span><span aria-label={booking.style.label} className={`size-[8px] shrink-0 rounded-[var(--radius-chip)] ${booking.style.dot}`} /></div>
        </li>)}</ol>
        {nowVisible && <div aria-label={`현재 시각 ${seoulClock.format(now)}`} className="pointer-events-none absolute inset-x-0" data-now-line role="separator" style={{ top: `${railOffset(nowMinutes!, openMinutes)}px` }}><span className="absolute left-0 -translate-y-1/2 rounded-[var(--radius-chip)] bg-[var(--accent)] px-1 py-px font-mono text-[9.5px] leading-none text-white">{seoulClock.format(now)}</span><span className="absolute left-[38px] right-0 h-px bg-[var(--accent)]" /></div>}
      </div>}
      {visible.length ? <ol className="mt-4 divide-y divide-[var(--border)]">{visible.map((booking) => { const style = statusStyles[statusOf(booking)]; return <li className="py-4" data-booking-row={booking.id} key={booking.id}><div className="grid grid-cols-[92px_1fr_auto] items-start gap-3"><time className="font-bold tabular-nums text-[var(--brand)]" dateTime={text(booking, "startsAt")}>{text(booking, "startsAt").slice(0, 10)} {text(booking, "startsAt").slice(11, 16)}</time><div><Link className="font-bold hover:text-[var(--brand)]" href={`/customers?customer=${text(booking, "customerId")}`}>{names.get(text(booking, "customerId")) ?? "고객 확인 필요"}</Link><span className="ml-2 text-sm text-[var(--muted)]">{text(booking, "service")}</span><p className="mt-1 text-xs text-[var(--muted)]">종료 {text(booking, "endsAt", "시간 미입력").slice(11, 16)} · 알림: {bool(booking, "reminderDayBefore") ? "전일" : "전일 없음"} / {bool(booking, "reminderDayOf") ? "당일" : "당일 없음"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${style.badge}`}><span aria-hidden="true" className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${style.dot}`} />상태: {style.label}</span></div><div className="mt-3 flex gap-3 text-xs"><Link className="font-medium text-[var(--brand)]" href={`/customers?customer=${text(booking, "customerId")}`}>고객 상세</Link><details open={edit === booking.id}><summary className="cursor-pointer font-medium text-[var(--brand)]">수정·상태 변경</summary><div className="mt-3 rounded-[var(--radius-card)] bg-[var(--background)] p-4"><BookingForm booking={booking} customers={customers} date={selectedDate} returnTo={editReturnTo(booking.id)} slotMinutes={policy.bookingSlotMinutes} /><div className="mt-3 flex gap-2"><form action={changeBookingStatus}><input name="bookingId" type="hidden" value={booking.id} /><input name="returnTo" type="hidden" value={editReturnTo(booking.id)} /><button className={button("sm")} name="status" value="completed">완료 처리</button></form><form action={cancelBooking}><input name="bookingId" type="hidden" value={booking.id} /><input name="returnTo" type="hidden" value={editReturnTo(booking.id)} /><input aria-label="취소 사유" className={`${input} h-8`} maxLength={150} name="cancelReason" placeholder="취소 사유" /><button className={button("sm", "warning", "ml-2")} type="submit">취소</button></form></div></div></details></div></li>; })}</ol> : <p className="mt-6 rounded-[var(--radius-card)] bg-[var(--background)] p-8 text-center text-sm text-[var(--muted)]">선택한 날짜에 예약이 없습니다. 예약 등록으로 새 일정을 추가하세요.</p>}</section>
      <aside className={`${card} h-fit p-5`}><h2 className="text-lg font-bold">영업 시간</h2><p className="mt-2 text-sm text-[var(--muted)]">{policy.bookingOpen}–{policy.bookingClose} · {policy.bookingSlotMinutes}분 단위</p><p className="mt-3 rounded-[var(--radius-card)] bg-[var(--background)] p-3 text-xs text-[var(--muted)]">중복 예약: {settings.bookingAllowOverlap === true ? "허용" : "차단"}. 모든 변경은 원장 감사 이력에 남습니다.</p></aside></div>
    <details data-booking-settings className={`${card} mt-5`}><summary className="cursor-pointer list-none p-5"><strong className="text-lg">예약 설정 · 네이버 예약 메일 연동</strong><span className="ml-3 text-sm text-[var(--muted)]">영업 시간, 알림, 외부 연동</span></summary><div className="border-t border-[var(--border)] p-5"><div><h2 className="text-lg font-bold">예약 설정</h2><p className="mt-1 text-sm text-[var(--muted)]">영업 시간, 예약 간격, 알림 문구를 관리합니다.</p></div><form action={saveBookingSettings} className="mt-5 grid grid-cols-4 gap-4"><input name="returnTo" type="hidden" value={returnTo} /><Field label="영업 시작"><input className={input} defaultValue={policy.bookingOpen} name="bookingOpen" required type="time" /></Field><Field label="영업 종료"><input className={input} defaultValue={policy.bookingClose} name="bookingClose" required type="time" /></Field><Field label="시간 단위"><select className={input} defaultValue={String(policy.bookingSlotMinutes)} name="bookingSlotMinutes"><option value="15">15분</option><option value="30">30분</option><option value="60">60분</option></select></Field><label className="mt-6 flex items-center gap-2 text-sm"><input defaultChecked={settings.bookingAllowOverlap === true} name="bookingAllowOverlap" type="checkbox" /> 중복 예약 허용</label><label className="flex items-center gap-2 text-sm"><input defaultChecked={settings.reminderDayBefore === true} name="reminderDayBefore" type="checkbox" /> 예약 전일 알림</label><label className="flex items-center gap-2 text-sm"><input defaultChecked={settings.reminderDayOf === true} name="reminderDayOf" type="checkbox" /> 예약 당일 알림</label><Field label="방문일 추가 문구"><input className={input} defaultValue={setting(settings, "reminderText")} maxLength={150} name="reminderText" /></Field><div className="col-span-4 flex justify-end"><button className={button("lg", "primary")} type="submit">예약 설정 저장</button></div></form><NaverMailConnection history={syncHistory} settings={settings} /></div></details>
  </main>;
}
