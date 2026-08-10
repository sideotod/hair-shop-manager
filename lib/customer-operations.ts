import { randomUUID } from "node:crypto";

import type { CustomerValue, JsonObject, JsonValue, SalonRecord, SalonStore } from "./salon-domain";

const actor = "원장" as const;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function checked(formData: FormData, name: string) {
  return text(formData, name) === "on";
}

function objectValue(record: SalonRecord<JsonValue>): JsonObject {
  return typeof record.value === "object" && record.value !== null && !Array.isArray(record.value) ? record.value as JsonObject : {};
}

function recordId(formData: FormData, name: string, prefix: string) {
  return text(formData, name) || `${prefix}-${randomUUID()}`;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validDateTime(date: string, time: string) {
  return validDate(date) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}

/**
 * 폼은 포인트를 만들지 않는다.
 *
 * 포인트 잔액은 원장(`salon-store.ts:319-343`)이 적립·사용 행마다 계산하는 파생값이다.
 * 고객 정보 폼이 `points` 를 같이 실어 보내면 이름 한 글자만 고쳐 저장해도 그 사이 쌓인
 * 적립이 폼이 렌더될 때의 숫자로 되돌아간다. 그래서 여기서 아예 빼고,
 * 저장 직전 `saveCustomerRecord()` 가 기존 레코드의 값을 그대로 이어붙인다.
 * 잔액을 바꾸는 유일한 경로는 `adjustCustomerPointsRecord()` — **사유 필수**다.
 */
// 반환 타입은 추론에 맡긴다. `CustomerValue` 는 `JsonObject &` 교차형이라
// `Omit<>` 을 씌우면 index signature 만 남고 이름 붙은 필드가 전부 날아간다.
function customerFrom(formData: FormData) {
  const name = text(formData, "name");
  if (!name) throw new Error("고객명은 필수입니다.");
  const phoneAbsent = checked(formData, "phoneAbsent");
  const phone = text(formData, "phone").replace(/\D/g, "");
  if (!phoneAbsent && !/^01\d{8,9}$/.test(phone)) throw new Error("휴대전화 번호를 확인하세요.");
  const memo = text(formData, "memo");
  if (memo.length > 150) throw new Error("메모는 150자 이하로 입력하세요.");

  return {
    name,
    phone: phoneAbsent ? "" : phone,
    telephone: text(formData, "telephone"),
    phoneAbsent,
    gender: text(formData, "gender") || "unspecified",
    smsOptIn: text(formData, "smsOptIn") !== "off",
    birthday: text(formData, "birthday"),
    birthdayCalendar: text(formData, "birthdayCalendar") || "solar",
    grade: text(formData, "grade") || "일반",
    group: text(formData, "group"),
    motive: text(formData, "motive"),
    pointCard: text(formData, "pointCard"),
    familyNumber: text(formData, "familyNumber"),
    nickname: text(formData, "nickname"),
    address: text(formData, "address"),
    email: text(formData, "email"),
    visitType: text(formData, "visitType") || "first",
    memo,
    firstMetAt: text(formData, "firstMetAt"),
    joinedAt: text(formData, "joinedAt"),
    operator: actor,
  };
}

export function saveCustomerRecord(store: SalonStore, formData: FormData) {
  const draft = customerFrom(formData);
  for (const [field, value] of [["생년월일", draft.birthday], ["첫 만남 날짜", draft.firstMetAt], ["가입일", draft.joinedAt]] as const) {
    if (typeof value !== "string" || (value && !validDate(value))) throw new Error(`${field}을 확인하세요.`);
  }
  const id = recordId(formData, "customerId", "customer");
  // 포인트 잔액과 포인트 빚은 원장이 계산한 값이다. 폼에서 오지 않으므로 기존 레코드에서 이어받는다.
  const existing = store.get("customers", id);
  const previous = existing ? objectValue(existing) : {};
  const customer: CustomerValue = {
    ...draft,
    points: typeof previous.points === "number" && Number.isSafeInteger(previous.points) ? previous.points : 0,
    ...(typeof previous.pointDebtWon === "number" ? { pointDebtWon: previous.pointDebtWon } : {}),
  };
  const duplicate = store.list("customers").some((record) => {
    if (record.id === id) return false;
    const value = objectValue(record);
    return value.name === customer.name || (!customer.phoneAbsent && value.phone === customer.phone);
  });
  if (duplicate && !checked(formData, "allowDuplicate")) throw new Error("중복 고객입니다. 중복 등록을 확인하세요.");
  const bookingDate = text(formData, "initialBookingDate");
  const bookingTime = text(formData, "initialBookingTime");
  if ((bookingDate || bookingTime) && !validDateTime(bookingDate, bookingTime)) {
    throw new Error("초기 예약 날짜와 시간을 확인하세요.");
  }
  const waitingMemo = text(formData, "waitingMemo");
  if (checked(formData, "registerWaiting") && waitingMemo.length > 150) throw new Error("대기 메모는 150자 이하로 입력하세요.");

  const saved = store.save("customers", id, customer, actor);
  if (checked(formData, "initialSms") && customer.smsOptIn) {
    store.save("messages", recordId(formData, "initialMessageId", "message"), { recipientId: id, channel: "SMS", status: "queued", operator: actor }, actor);
  }
  if (bookingDate || bookingTime) {
    store.save("bookings", recordId(formData, "initialBookingId", "booking"), { customerId: id, startsAt: `${bookingDate}T${bookingTime}:00.000Z`, service: text(formData, "initialBookingService") || "예약", status: "confirmed", operator: actor }, actor);
  }
  if (checked(formData, "registerWaiting")) {
    store.save("waiting-customers", recordId(formData, "waitingId", "waiting"), { customerId: id, name: customer.name, memo: waitingMemo, operator: actor }, actor);
  }
  return saved;
}

export function archiveCustomerRecord(store: SalonStore, formData: FormData) {
  return store.archive("customers", text(formData, "customerId"), actor);
}

/**
 * 포인트 잔액을 바꾸는 유일한 경로. **사유가 곧 확인 절차다** — 별도 confirm 다이얼로그를 두지 않는다.
 *
 * 산수는 여기서 하지 않는다. `details.pointsUsedWon`/`pointsEarnedWon` 만 실어 보내면
 * `salon-store.ts:299-343` 이 잔액·포인트 빚(상환·회수 포함)을 계산한다. 잔액보다 큰 차감은
 * 거기서 "Customer spendable points are insufficient" 로 막힌다.
 * 금액칸은 전부 0이라 매출 합계에 끼어들지 않는다.
 */
export function adjustCustomerPointsRecord(store: SalonStore, formData: FormData) {
  const customerId = text(formData, "customerId");
  if (!customerId || !store.get("customers", customerId)) throw new Error("포인트를 조정할 고객을 확인하세요.");
  const reason = text(formData, "reason");
  if (!reason) throw new Error("포인트 조정 사유는 필수입니다.");
  if (reason.length > 150) throw new Error("포인트 조정 사유는 150자 이하로 입력하세요.");
  const amount = Number(text(formData, "pointsWon"));
  if (!Number.isSafeInteger(amount) || amount === 0) throw new Error("포인트 조정 금액은 0이 아닌 정수로 입력하세요.");

  return store.appendLedger({
    requestKey: text(formData, "requestKey") || `point-adjust-${randomUUID()}`,
    kind: "point-adjust",
    customerId,
    amountWon: 0,
    pointsWon: amount,
    details: { operator: actor, reason, pointsUsedWon: amount < 0 ? -amount : 0, pointsEarnedWon: amount > 0 ? amount : 0 },
  }, actor);
}

export function saveWaitingCustomerRecord(store: SalonStore, formData: FormData) {
  const name = text(formData, "name");
  if (!name) throw new Error("대기 고객명은 필수입니다.");
  const memo = text(formData, "memo");
  if (memo.length > 150) throw new Error("대기 메모는 150자 이하로 입력하세요.");
  return store.save("waiting-customers", recordId(formData, "waitingId", "waiting"), { customerId: text(formData, "customerId"), name, memo, operator: actor }, actor);
}

export function completeWaitingCustomerRecord(store: SalonStore, formData: FormData) {
  return store.archive("waiting-customers", text(formData, "waitingId"), actor);
}

export function saveCustomerPolicyRecord(store: SalonStore, formData: FormData) {
  const policy: JsonObject = {};
  if (formData.has("customerGroups")) policy.customerGroups = text(formData, "customerGroups");
  if (formData.has("customerGrades")) policy.customerGrades = text(formData, "customerGrades");
  if (formData.has("visitMotives")) policy.visitMotives = text(formData, "visitMotives");
  if (formData.has("defaultSmsOptIn")) policy.defaultSmsOptIn = text(formData, "defaultSmsOptIn") !== "off";
  if (formData.has("birthdayCalendar")) policy.birthdayCalendar = text(formData, "birthdayCalendar") || "solar";
  if (formData.has("powerCustomerMinPoints")) {
    const points = Number(text(formData, "powerCustomerMinPoints"));
    if (!Number.isSafeInteger(points) || points < 0) throw new Error("파워 고객 포인트 기준을 확인하세요.");
    policy.powerCustomerMinPoints = points;
  }
  const settings = Object.keys(policy).length ? store.saveSettings(policy, actor) : store.getSettings();
  const group = text(formData, "bulkGroup") || text(formData, "customerGroups");
  const grade = text(formData, "bulkGrade") || text(formData, "customerGrades");
  for (const id of formData.getAll("customerIds")) {
    if (typeof id !== "string" || !id) continue;
    const customer = store.get("customers", id);
    if (customer) store.save("customers", id, { ...objectValue(customer), ...(group ? { group } : {}), ...(grade ? { grade } : {}), operator: actor }, actor);
  }
  return settings;
}
