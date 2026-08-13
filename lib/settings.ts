import { randomUUID } from "node:crypto";

import { hashOwnerPassword, verifyOwnerPassword } from "./auth";
import { bookingSettings } from "./booking";
import type { JsonObject, SalonStore } from "./salon-domain";
import { resolveVisualTokens, validateVisualTokenContrast } from "./visual-tokens";

const actor = "사용자" as const;
const color = /^#[0-9a-f]{6}$/i;
const passwordHash = /^scrypt\$[^$]+\$[0-9a-f]+$/i;
const knownErrors = new Set([
  "비율은 0~100 사이로 입력하세요.",
  "매장명과 사용자 표시 이름을 입력하세요.",
  "설정 값을 확인하세요.",
  "색상은 #RRGGBB 형식으로 입력하세요.",
  "색상 대비는 배경·글자와 흰색 기준 4.5:1 이상이어야 합니다.",
  "포인트 기준을 확인하세요.",
  "예약 시간 단위를 확인하세요.",
  "영업 시간을 확인하세요.",
  "숨김 메뉴를 확인하세요.",
  "현재 비밀번호를 확인하세요.",
  "비밀번호가 이미 설정되어 있습니다.",
  "새 비밀번호를 입력하세요.",
  "새 비밀번호 확인이 일치하지 않습니다.",
  "공지 제목과 내용을 입력하세요.",
  "공지 길이를 확인하세요.",
  "예약 추가 문구는 150자 이하로 입력하세요.",
]);

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function rawText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function currentText(settings: JsonObject, key: string, fallback = "") {
  return typeof settings[key] === "string" ? settings[key] : fallback;
}

function rate(formData: FormData, name: string) {
  const value = text(formData, name);
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) < 0 || Number(value) > 100) throw new Error("비율은 0~100 사이로 입력하세요.");
  return Number(value);
}

export function parseShopSettings(formData: FormData, current: JsonObject): JsonObject {
  const values: JsonObject = {};
  for (const name of [
    "shopName", "shopPhone", "ownerName", "customerOpenMode", "customerDisplayMode", "defaultGender",
    "reminderText", "helpPhone", "helpEmail", "vatMode",
  ]) if (formData.has(name)) values[name] = text(formData, name);
  if (formData.has("reminderText") && text(formData, "reminderText").length > 150) throw new Error("예약 추가 문구는 150자 이하로 입력하세요.");
  for (const name of ["shopName", "ownerName"]) if (formData.has(name) && !values[name]) throw new Error("매장명과 사용자 표시 이름을 입력하세요.");
  for (const [name, allowed] of [
    ["customerOpenMode", new Set(["same-window", "new-window"])],
    ["customerDisplayMode", new Set(["comfortable", "compact"])],
    ["defaultGender", new Set(["unspecified", "female", "male"])],
    ["vatMode", new Set(["included", "separate"])],
  ] as const) if (formData.has(name) && !allowed.has(text(formData, name))) throw new Error("설정 값을 확인하세요.");

  for (const name of ["backgroundColor", "foregroundColor", "brandColor", "sidebarColor"]) {
    if (!formData.has(name)) continue;
    const value = text(formData, name);
    if (!color.test(value)) throw new Error("색상은 #RRGGBB 형식으로 입력하세요.");
    values[name] = value.toLowerCase();
  }
  if (["backgroundColor", "foregroundColor", "brandColor", "sidebarColor"].some((name) => formData.has(name))) {
    validateVisualTokenContrast(resolveVisualTokens({ ...current, ...values }));
  }

  if (formData.has("cardFeeRate")) values.cardFeeRate = rate(formData, "cardFeeRate");
  // 포인트는 결제할 때마다 실결제액의 이 비율만큼 자동으로 쌓인다. 적립 **결과**는 여전히
  // 원장 `details.pointsEarnedWon` 한 곳에만 남는다 — 여기서 정하는 것은 비율뿐이다.
  if (formData.has("pointEarnRate")) values.pointEarnRate = rate(formData, "pointEarnRate");
  // 파워 고객 기준은 고객 세그먼트가 사라진 뒤에도 남는다 — 문자 대상 선별(`lib/messages.ts:61`)이 읽는다.
  if (formData.has("powerCustomerMinPoints")) {
    const points = Number(text(formData, "powerCustomerMinPoints"));
    if (!Number.isSafeInteger(points) || points < 0) throw new Error("포인트 기준을 확인하세요.");
    values.powerCustomerMinPoints = points;
  }

  if (formData.has("bookingOpen") || formData.has("bookingClose") || formData.has("bookingSlotMinutes")) {
    Object.assign(values, bookingSettings({
      bookingOpen: text(formData, "bookingOpen") || currentText(current, "bookingOpen", "09:30"),
      bookingClose: text(formData, "bookingClose") || currentText(current, "bookingClose", "21:00"),
      bookingSlotMinutes: Number(text(formData, "bookingSlotMinutes") || current.bookingSlotMinutes || 30),
    }));
  }

  const section = text(formData, "section");
  if (section === "customer") {
    values.smsEnabled = text(formData, "smsEnabled") === "on";
    values.defaultSmsOptIn = text(formData, "defaultSmsOptIn") === "on";
    const hiddenMenus = formData.getAll("hiddenMenus").filter((value): value is string => typeof value === "string");
    // `/operations` 는 사라졌지만 이미 저장된 설정 행에는 남아 있다. 던지면 그 사용자는 고객 정책을
    // 영영 저장하지 못한다 — 폼이 못 보내는 값이라 체크를 풀 수도 없다. 걸러서 다음 저장에 자연히 빠지게 한다 (설계 §5.2).
    const allowed = new Set(["/customers", "/bookings", "/sales", "/messages"]);
    if (hiddenMenus.some((value) => !allowed.has(value) && value !== "/operations")) throw new Error("숨김 메뉴를 확인하세요.");
    values.hiddenMenus = hiddenMenus.filter((value) => allowed.has(value));
  }
  // 알림 두 칸은 `saveBookingSettingsRecord` 가 유일한 writer 였다. 그 액션을 지우면서 여기로 옮기지 않으면
  // 예약 전일·당일 알림이 저장할 곳을 잃는다 (설계 §5.3). 체크박스는 `bookingAllowOverlap` 과 같은 규약이다.
  if (section === "booking") for (const name of ["bookingAllowOverlap", "reminderDayBefore", "reminderDayOf"]) values[name] = text(formData, name) === "on";
  return values;
}

export function settingsErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return knownErrors.has(message) ? message : "설정을 저장하지 못했습니다.";
}

/** 초기 비밀번호는 없다. 해시가 없으면 로그인 화면이 최초 설정 폼으로 바뀐다. */
export function ownerPasswordHash(settings: JsonObject): string | null {
  const stored = settings.ownerPasswordHash;
  return typeof stored === "string" && passwordHash.test(stored) ? stored : null;
}

function newPassword(formData: FormData) {
  const password = rawText(formData, "newPassword");
  // 길이·문자 종류 제한은 두지 않는다. 보안은 저장 방식(scrypt 해시)이 맡는다.
  if (!password) throw new Error("새 비밀번호를 입력하세요.");
  if (password !== rawText(formData, "confirmPassword")) throw new Error("새 비밀번호 확인이 일치하지 않습니다.");
  return password;
}

export function setInitialOwnerPasswordRecord(store: SalonStore, formData: FormData) {
  if (ownerPasswordHash(store.getSettings())) throw new Error("비밀번호가 이미 설정되어 있습니다.");
  return store.saveSettings({ ownerPasswordHash: hashOwnerPassword(newPassword(formData)) }, actor);
}

export function changeOwnerPasswordRecord(store: SalonStore, formData: FormData) {
  const stored = ownerPasswordHash(store.getSettings());
  if (!stored || !verifyOwnerPassword(rawText(formData, "currentPassword"), stored)) throw new Error("현재 비밀번호를 확인하세요.");
  return store.saveSettings({ ownerPasswordHash: hashOwnerPassword(newPassword(formData)) }, actor);
}

export function saveNoticeRecord(store: SalonStore, formData: FormData) {
  const title = text(formData, "title");
  const body = text(formData, "body");
  if (!title || !body) throw new Error("공지 제목과 내용을 입력하세요.");
  if (title.length > 80 || body.length > 500) throw new Error("공지 길이를 확인하세요.");
  return store.save("notices", `notice-${randomUUID()}`, { title, body, operator: actor }, actor);
}
