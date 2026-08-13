import { randomUUID } from "node:crypto";

import type { CustomerValue, JsonObject, JsonValue, SalonRecord, SalonStore } from "./salon-domain";
import { PAYMENT_METHODS } from "./settlement";

const actor = "사용자" as const;

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

/**
 * 폼은 포인트를 만들지 않는다.
 *
 * 포인트 잔액은 원장(`salon-store.ts:319-343`)이 적립·사용 행마다 계산하는 파생값이다.
 * 고객 정보 폼이 `points` 를 같이 실어 보내면 이름 한 글자만 고쳐 저장해도 그 사이 쌓인
 * 적립이 폼이 렌더될 때의 숫자로 되돌아간다. 그래서 여기서 아예 빼고,
 * 저장 직전 `saveCustomerRecord()` 가 기존 레코드의 값을 그대로 이어붙인다.
 * 잔액을 바꾸는 유일한 경로는 `adjustCustomerPointsRecord()` — **사유 필수**다.
 *
 * 칸은 6개다(성명·성별·휴대전화·첫 방문일·선결제·메모). 등급·그룹·방문동기·생일·
 * 집전화·주소·이메일 따위는 화면 어디에서도 읽지 않아 영구히 삭제했다.
 */
// 반환 타입은 추론에 맡긴다. `CustomerValue` 는 `JsonObject &` 교차형이라
// `Omit<>` 을 씌우면 index signature 만 남고 이름 붙은 필드가 전부 날아간다.
function customerFrom(formData: FormData) {
  const name = text(formData, "name");
  if (!name) throw new Error("고객명은 필수입니다.");
  const phone = text(formData, "phone").replace(/\D/g, "");
  if (!/^01\d{8,9}$/.test(phone)) throw new Error("휴대전화 번호를 확인하세요.");
  const memo = text(formData, "memo");
  if (memo.length > 150) throw new Error("메모는 150자 이하로 입력하세요.");

  return {
    name,
    phone,
    gender: text(formData, "gender") || "unspecified",
    smsOptIn: text(formData, "smsOptIn") !== "off",
    visitType: text(formData, "visitType") || "first",
    memo,
    // 첫 방문일 = 가입일. 두 이름으로 같은 날짜를 두 번 묻지 않는다.
    joinedAt: text(formData, "joinedAt"),
    operator: actor,
  };
}

/** 0 이상 정수만 받는다. 빈 칸은 0 — 대부분의 손님은 선결제를 하지 않는다. */
function prepaidAmount(formData: FormData, name: string) {
  const raw = text(formData, name);
  if (!raw) return 0;
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("선결제 금액을 확인하세요.");
  return amount;
}

export function saveCustomerRecord(store: SalonStore, formData: FormData) {
  const draft = customerFrom(formData);
  if (draft.joinedAt && !validDate(draft.joinedAt)) throw new Error("첫 방문날짜를 확인하세요.");
  const id = recordId(formData, "customerId", "customer");
  // 포인트 잔액과 선결제 잔액은 원장이 만든 값이다. 폼에서 오지 않으므로 기존 레코드에서 이어받는다.
  const existing = store.get("customers", id);
  const previous = existing ? objectValue(existing) : {};
  const previousPrepaid = typeof previous.prepaidWon === "number" && Number.isSafeInteger(previous.prepaidWon) ? previous.prepaidWon : 0;
  // 신규 등록에서만 선결제 칸을 읽는다. 기존 고객의 잔액은 [선결제 충전]으로만 움직인다 —
  // 정보 수정 폼이 잔액을 덮어쓰면 원장에 없는 돈이 생긴다.
  const charge = existing ? 0 : prepaidAmount(formData, "prepaidWon");
  const customer: CustomerValue = {
    ...previous,
    ...draft,
    points: typeof previous.points === "number" && Number.isSafeInteger(previous.points) ? previous.points : 0,
    prepaidWon: previousPrepaid + charge,
  };
  const duplicate = store.list("customers").some((record) => {
    if (record.id === id) return false;
    const value = objectValue(record);
    return value.name === customer.name || value.phone === customer.phone;
  });
  if (duplicate && !checked(formData, "allowDuplicate")) throw new Error("중복 고객입니다. 중복 등록을 확인하세요.");

  const saved = store.save("customers", id, customer, actor);
  // 등록하며 받은 선결제도 돈이 들어온 사실이다. 고객 필드만 바꾸면 그 돈이 매출에서 사라진다.
  if (charge > 0) appendPrepaidLedger(store, id, charge, "cash", text(formData, "prepaidRequestKey"));
  return saved;
}

/**
 * 선결제 충전 1행. **잔액은 고객 필드가, 돈이 움직인 사실은 원장이 맡는다.**
 *
 * 매출 화면이 이 행을 시술 매출과 섞지 않도록 `serviceMajor` 를 "선결제"로 남긴다.
 */
function appendPrepaidLedger(store: SalonStore, customerId: string, amount: number, method: string, requestKey: string) {
  return store.appendLedger({
    requestKey: requestKey || `prepaid-${randomUUID()}`,
    kind: "payment",
    customerId,
    grossWon: amount,
    amountWon: amount,
    details: { operator: actor, serviceMajor: "선결제", prepaidChargeWon: amount, paymentMethods: { [method]: amount } },
  }, actor);
}

export function chargePrepaidRecord(store: SalonStore, formData: FormData) {
  const customerId = text(formData, "customerId");
  const existing = customerId ? store.get("customers", customerId) : null;
  if (!existing) throw new Error("선결제를 충전할 고객을 확인하세요.");
  const amount = prepaidAmount(formData, "amountWon");
  if (amount <= 0) throw new Error("선결제 금액을 확인하세요.");
  const method = text(formData, "method") || "cash";
  if (!PAYMENT_METHODS.some((entry) => entry.key === method) || method === "prepaid" || method === "points") {
    throw new Error("선결제 결제수단을 확인하세요.");
  }

  const previous = objectValue(existing);
  const balance = typeof previous.prepaidWon === "number" && Number.isSafeInteger(previous.prepaidWon) ? previous.prepaidWon : 0;
  appendPrepaidLedger(store, customerId, amount, method, text(formData, "requestKey"));
  return store.save("customers", customerId, { ...previous, prepaidWon: balance + amount, operator: actor }, actor);
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
