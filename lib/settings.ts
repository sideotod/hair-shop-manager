import { randomUUID } from "node:crypto";

import { configuredOwnerPasswordHash, hashOwnerPassword, verifyOwnerPassword, type AuthEnvironment } from "./auth";
import { bookingSettings } from "./booking";
import type { JsonObject, SalonStore } from "./salon-domain";

const actor = "원장" as const;
const color = /^#[0-9a-f]{6}$/i;
const passwordHash = /^scrypt\$[^$]+\$[0-9a-f]+$/i;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
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
    "customerGrades", "customerGroups", "visitMotives", "bookingNoticeText", "messageAutomationSchedule",
    "messageAutomationText", "helpPhone", "helpEmail", "vatMode",
  ]) if (formData.has(name)) values[name] = text(formData, name);
  for (const name of ["shopName", "ownerName"]) if (formData.has(name) && !values[name]) throw new Error("매장명과 원장 표시 이름을 입력하세요.");
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

  if (formData.has("cardFeeRate")) values.cardFeeRate = rate(formData, "cardFeeRate");
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
    if (hiddenMenus.some((value) => !new Set(["/customers", "/bookings", "/sales", "/messages", "/operations"]).has(value))) throw new Error("숨김 메뉴를 확인하세요.");
    values.hiddenMenus = hiddenMenus;
  }
  if (section === "booking") values.bookingAllowOverlap = text(formData, "bookingAllowOverlap") === "on";
  if (section === "messages") values.messageAutomationEnabled = text(formData, "messageAutomationEnabled") === "on";
  return values;
}

export function ownerPasswordHash(settings: JsonObject, env: AuthEnvironment = process.env) {
  const stored = settings.ownerPasswordHash;
  return typeof stored === "string" && passwordHash.test(stored) ? stored : configuredOwnerPasswordHash(env);
}

export function changeOwnerPasswordRecord(store: SalonStore, formData: FormData, env: AuthEnvironment = process.env) {
  const currentPassword = text(formData, "currentPassword");
  const newPassword = text(formData, "newPassword");
  if (!verifyOwnerPassword(currentPassword, ownerPasswordHash(store.getSettings(), env))) throw new Error("현재 비밀번호를 확인하세요.");
  if (newPassword.length < 8) throw new Error("새 비밀번호는 8자 이상이어야 합니다.");
  if (newPassword !== text(formData, "confirmPassword")) throw new Error("새 비밀번호 확인이 일치하지 않습니다.");
  return store.saveSettings({ ownerPasswordHash: hashOwnerPassword(newPassword) }, actor);
}

export function saveNoticeRecord(store: SalonStore, formData: FormData) {
  const title = text(formData, "title");
  const body = text(formData, "body");
  if (!title || !body) throw new Error("공지 제목과 내용을 입력하세요.");
  if (title.length > 80 || body.length > 500) throw new Error("공지 길이를 확인하세요.");
  return store.save("notices", `notice-${randomUUID()}`, { title, body, operator: actor }, actor);
}
