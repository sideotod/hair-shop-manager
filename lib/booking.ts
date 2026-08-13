import { randomUUID } from "node:crypto";

import type { JsonObject, JsonValue, SalonRecord, SalonStore } from "./salon-domain";
import { seoulClock, seoulClockOrEmpty, seoulInstant } from "./seoul-date";

const actor = "사용자" as const;
const statuses = new Set(["confirmed", "waiting", "completed"]);

export type BookingInterval = {
  startsAt: string;
  endsAt: string;
  status: string;
};

export type BookingInput = BookingInterval & {
  customerId: string;
  service: string;
  reminderDayBefore: boolean;
  reminderDayOf: boolean;
};

export type BookingSettings = {
  bookingOpen: string;
  bookingClose: string;
  bookingSlotMinutes: number;
};

const time = /^([01]\d|2[0-3]):[0-5]\d$/;

function date(value: string, field: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field}을 확인하세요.`);
  return parsed;
}

function minutes(value: string) {
  const match = time.exec(value);
  if (!match) throw new Error("영업 시간을 확인하세요.");
  return Number(match[1]) * 60 + Number(value.slice(3));
}

// 저장 값은 참 시각 ISO 다. 영업 시간·같은 날 판정은 전부 서울 벽시계로 되돌려서 본다.
function minuteOfDay(value: Date) {
  const { time } = seoulClock(value);
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}

function seoulDayOf(value: Date) {
  return seoulClock(value).date;
}

export function bookingSettings(settings: Partial<BookingSettings>): BookingSettings {
  const bookingOpen = typeof settings.bookingOpen === "string" ? settings.bookingOpen : "09:30";
  const bookingClose = typeof settings.bookingClose === "string" ? settings.bookingClose : "21:00";
  const bookingSlotMinutes = typeof settings.bookingSlotMinutes === "number" ? settings.bookingSlotMinutes : 30;
  const open = minutes(bookingOpen);
  const close = minutes(bookingClose);
  if (!Number.isSafeInteger(bookingSlotMinutes) || bookingSlotMinutes < 5 || bookingSlotMinutes > 120 || 60 % bookingSlotMinutes !== 0) throw new Error("예약 시간 단위를 확인하세요.");
  if (open >= close || open % bookingSlotMinutes !== 0 || close % bookingSlotMinutes !== 0) throw new Error("영업 시간을 확인하세요.");
  return { bookingOpen, bookingClose, bookingSlotMinutes };
}

export function bookingOverlaps(candidate: BookingInterval, existing: BookingInterval, slotMinutes: number) {
  if (candidate.status === "cancelled" || existing.status === "cancelled") return false;
  const start = date(candidate.startsAt, "예약 시작").getTime();
  const end = date(candidate.endsAt, "예약 종료").getTime();
  const otherStart = date(existing.startsAt, "예약 시작").getTime();
  const otherEnd = date(existing.endsAt, "예약 종료").getTime();
  if ((end - start) % (slotMinutes * 60_000) || (otherEnd - otherStart) % (slotMinutes * 60_000)) return true;
  return start < otherEnd && otherStart < end;
}

export function validateBooking(input: BookingInput, settings: Partial<BookingSettings>) {
  const policy = bookingSettings(settings);
  if (!input.customerId.trim()) throw new Error("고객을 선택하세요.");
  if (!input.service.trim()) throw new Error("시술 메뉴를 입력하세요.");
  if (typeof input.reminderDayBefore !== "boolean" || typeof input.reminderDayOf !== "boolean") throw new Error("예약 알림 설정을 확인하세요.");
  const start = date(input.startsAt, "예약 시작");
  const end = date(input.endsAt, "예약 종료");
  const duration = end.getTime() - start.getTime();
  const open = minutes(policy.bookingOpen);
  const close = minutes(policy.bookingClose);
  if (end <= start || duration % (policy.bookingSlotMinutes * 60_000) || minuteOfDay(start) % policy.bookingSlotMinutes !== 0) throw new Error("예약 시간 단위를 확인하세요.");
  if (minuteOfDay(start) < open || minuteOfDay(end) > close || seoulDayOf(start) !== seoulDayOf(end)) throw new Error("영업 시간을 확인하세요.");
  return policy;
}

function text(formData: FormData, name: string) { const value = formData.get(name); return typeof value === "string" ? value.trim() : ""; }
function checked(formData: FormData, name: string) { const value = text(formData, name); if (formData.has(name) && value !== "on") throw new Error("예약 알림 설정을 확인하세요."); return value === "on"; }
function value(record: SalonRecord<JsonValue>) { return typeof record.value === "object" && record.value !== null && !Array.isArray(record.value) ? record.value as JsonObject : {}; }
function string(input: JsonObject, key: string) { return typeof input[key] === "string" ? input[key] : ""; }
function recordId(formData: FormData, name: string, prefix: string) { return text(formData, name) || `${prefix}-${randomUUID()}`; }
function when(date: string, time: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("예약 날짜와 시간을 확인하세요."); return seoulInstant(date, time); }
function interval(record: SalonRecord<JsonValue>, slotMinutes: number): BookingInterval | null { const booking = value(record); const startsAt = string(booking, "startsAt"); if (!startsAt) return null; const start = new Date(startsAt); if (Number.isNaN(start.getTime())) return null; return { startsAt, endsAt: string(booking, "endsAt") || new Date(start.getTime() + slotMinutes * 60_000).toISOString(), status: string(booking, "status") || "confirmed" }; }
function customerId(store: SalonStore, formData: FormData) { const id = text(formData, "customerId"); if (id) { if (!store.get("customers", id)) throw new Error("고객을 확인하세요."); return { id }; } const name = text(formData, "newCustomerName"); const phone = text(formData, "newCustomerPhone").replace(/\D/g, ""); if (!name || (phone && !/^01\d{8,9}$/.test(phone))) throw new Error("신규 고객 정보를 확인하세요."); return { id: `customer-${randomUUID()}`, value: { name, phone, smsOptIn: false, points: 0, operator: actor } satisfies JsonObject }; }

function bookingFrom(store: SalonStore, formData: FormData, existing?: SalonRecord<JsonValue>) {
  const settings = bookingSettings(store.getSettings()); const id = existing?.id ?? recordId(formData, "bookingId", "booking"); const current = existing ? value(existing) : {}; const storedStart = seoulClockOrEmpty(string(current, "startsAt")); const storedEnd = seoulClockOrEmpty(string(current, "endsAt")); const date = text(formData, "date") || storedStart.date; const startTime = text(formData, "startTime") || storedStart.time; const endTime = text(formData, "endTime") || storedEnd.time || seoulClock(new Date(new Date(when(date, startTime)).getTime() + settings.bookingSlotMinutes * 60_000)).time; const startsAt = when(date, startTime); const endsAt = when(date, endTime); const status = text(formData, "status") || string(current, "status") || "confirmed";
  if (!statuses.has(status)) throw new Error("예약 상태를 확인하세요.");
  const memo = text(formData, "memo"); const reminderText = text(formData, "reminderText"); if (memo.length > 150 || reminderText.length > 150) throw new Error("예약 메모는 150자 이하로 입력하세요.");
  const customer = customerId(store, formData); const booking = { customerId: customer.id, service: text(formData, "service") || string(current, "service"), startsAt, endsAt, status, memo, reminderDayBefore: checked(formData, "reminderDayBefore"), reminderDayOf: checked(formData, "reminderDayOf"), reminderText, operator: actor };
  validateBooking(booking, settings);
  if (store.list("bookings").some((record) => record.id !== id && (() => { const currentInterval = interval(record, settings.bookingSlotMinutes); return currentInterval && bookingOverlaps(booking, currentInterval, settings.bookingSlotMinutes); })()) && store.getSettings().bookingAllowOverlap !== true) throw new Error("예약 시간이 기존 예약과 겹칩니다.");
  const previousHistory = current.statusHistory; const history: JsonValue[] = Array.isArray(previousHistory) ? [...previousHistory] : [];
  return { id, customer, booking: { ...booking, statusHistory: [...history, { status, at: new Date().toISOString(), actor }] } };
}

function activeBooking(store: SalonStore, id: string) { const booking = store.get("bookings", id); if (!booking) throw new Error("예약을 확인하세요."); if (booking.archivedAt || string(value(booking), "status") === "cancelled") throw new Error("취소된 예약은 수정할 수 없습니다."); return booking; }
export function saveBookingRecord(store: SalonStore, formData: FormData) { const bookingId = text(formData, "bookingId"); const existing = bookingId ? store.get("bookings", bookingId) : null; if (existing?.archivedAt || (existing && string(value(existing), "status") === "cancelled")) throw new Error("취소된 예약은 수정할 수 없습니다."); const { id, customer, booking } = bookingFrom(store, formData, existing ?? undefined); if (customer.value !== undefined) store.save("customers", customer.id, customer.value, actor); const saved = store.save("bookings", id, booking, actor); return saved; }
export function changeBookingStatusRecord(store: SalonStore, formData: FormData) { const id = text(formData, "bookingId"); const existing = activeBooking(store, id); const values = value(existing); const start = seoulClockOrEmpty(string(values, "startsAt")); const end = seoulClockOrEmpty(string(values, "endsAt")); const data = new FormData(); for (const [key, item] of [["bookingId", id], ["customerId", string(values, "customerId")], ["service", string(values, "service")], ["date", start.date], ["startTime", start.time], ["endTime", end.time], ["status", text(formData, "status")], ["memo", string(values, "memo")], ["reminderText", string(values, "reminderText")]] as const) data.set(key, item); if (values.reminderDayBefore === true) data.set("reminderDayBefore", "on"); if (values.reminderDayOf === true) data.set("reminderDayOf", "on"); return saveBookingRecord(store, data); }
export function cancelBookingRecord(store: SalonStore, formData: FormData) { const id = text(formData, "bookingId"); const existing = activeBooking(store, id); const reason = text(formData, "cancelReason"); if (reason.length > 150) throw new Error("취소 사유는 150자 이하로 입력하세요."); const booking = value(existing); const history = Array.isArray(booking.statusHistory) ? booking.statusHistory : []; store.save("bookings", id, { ...booking, status: "cancelled", cancelReason: reason, statusHistory: [...history, { status: "cancelled", at: new Date().toISOString(), actor }], operator: actor }, actor); return store.archive("bookings", id, actor); }
// 결제 저장 뒤 예약을 완료로 넘긴다. `changeBookingStatusRecord`(:110) 를 타면 `saveBookingRecord` 가 `validateBooking` + 중복 검사를 다시 돌려, 지금 영업시간 정책과 안 맞는 과거 예약이 "영업 시간을 확인하세요" 로 던지고 결제까지 실패시킨다. 여기서 바꾸는 값은 상태 하나뿐이라 검증할 것이 없다.
export function markBookingCompleted(store: SalonStore, id: string) {
  const existing = store.get("bookings", id); if (!existing || existing.archivedAt) return null;
  const current = value(existing); if (string(current, "status") !== "confirmed") return null; // 취소·완료는 건드리지 않는다
  const history = Array.isArray(current.statusHistory) ? current.statusHistory : [];
  return store.save("bookings", id, { ...current, status: "completed", statusHistory: [...history, { status: "completed", at: new Date().toISOString(), actor }] }, actor);
}
