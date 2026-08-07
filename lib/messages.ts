import { randomUUID } from "node:crypto";

import type { JsonObject, JsonValue, SalonRecord, SalonStore } from "./salon-domain";

export type MessageSegment = "all" | "women" | "men" | "power";
const messageSegments = new Set<MessageSegment>(["all", "women", "men", "power"]);

export function messageBytes(text: string) { return new TextEncoder().encode(text).length; }
export function messageType(text: string): "SMS" | "LMS" { return messageBytes(text) <= 90 ? "SMS" : "LMS"; }

function value(record: Recipient) { return typeof record.value === "object" && record.value !== null && !Array.isArray(record.value) ? record.value as JsonObject : {}; }
function segment(value: JsonObject, name: MessageSegment, powerMinimum: number) {
  if (name === "women") return value.gender === "female";
  if (name === "men") return value.gender === "male";
  return name !== "power" || (typeof value.points === "number" && value.points >= powerMinimum);
}

/** 대상 선별과 화면이 고객에게서 읽는 전부. 레코드 껍데기(kind·타임스탬프)는 여기 들어오지 않는다. */
export type Recipient = Pick<SalonRecord<JsonValue>, "id" | "value">;

export function eligibleRecipients(customers: readonly Recipient[], name: MessageSegment, powerMinimum = 100, recipientIds: readonly string[] = []) {
  const selected = new Set(recipientIds);
  return customers.filter((customer) => {
    const customerValue = value(customer);
    return customerValue.smsOptIn !== false && (selected.size ? selected.has(customer.id) : segment(customerValue, name, powerMinimum));
  });
}

/**
 * 문자 화면이 고객에게서 실제로 읽는 값은 `id` 와 네 개 필드(name·smsOptIn·gender·points)뿐이다.
 * 고객 한 명은 24개 필드(주소·메모·생일·시술이력…)에 레코드 껍데기(kind·타임스탬프)까지 달고 있어서,
 * 858명을 통째로 클라이언트 컴포넌트에 넘기면 경계를 579KB가 건너간다. 쓰지 않는 값을 서버에서 잘라낸다.
 * 발송 자격은 `queueMessage`가 저장소 원본으로 다시 검증하므로, 잘라 보내도 권한 판단은 바뀌지 않는다.
 */
export function forRecipientPicker(customers: readonly SalonRecord<JsonValue>[]): Recipient[] {
  return customers.map((customer) => {
    const { name, smsOptIn, gender, points } = value(customer);
    return { id: customer.id, value: { name, smsOptIn, gender, points } };
  });
}

type QueueMessageInput = { requestKey: string; text: string; recipientIds?: readonly string[]; segment?: MessageSegment; scheduledAt?: string; now?: Date };

export function queueMessage(store: SalonStore, input: QueueMessageInput) {
  const text = input.text.trim();
  const recipientIds = [...new Set(input.recipientIds ?? [])];
  if (!input.requestKey.trim()) throw new Error("요청 키가 필요합니다.");
  if (!text) throw new Error("문자 내용을 입력하세요.");
  if (input.segment && !messageSegments.has(input.segment)) throw new Error("알 수 없는 발송 대상입니다.");
  if (recipientIds.length > 3) throw new Error("개별 수신자는 최대 3명입니다.");
  const settings = store.getSettings();
  if (settings.smsEnabled === false) throw new Error("SMS 기능이 비활성화되어 있습니다.");
  if (store.list<JsonObject>("messages").some(({ value }) => value.requestKey === input.requestKey)) throw new Error("이미 처리한 요청입니다.");
  const now = input.now ?? new Date();
  if (input.scheduledAt) {
    const scheduled = new Date(input.scheduledAt);
    if (Number.isNaN(scheduled.getTime()) || scheduled <= now) throw new Error("예약 시간은 현재 이후여야 합니다.");
  }

  const customers = store.list<JsonValue>("customers");
  const powerMinimum = typeof settings.powerCustomerMinPoints === "number" && settings.powerCustomerMinPoints >= 0 ? settings.powerCustomerMinPoints : 0;
  if (recipientIds.some((id) => !customers.some((customer) => customer.id === id))) throw new Error("알 수 없는 고객입니다.");
  const recipients = eligibleRecipients(customers, input.segment ?? "all", powerMinimum, recipientIds);
  if (!recipients.length) throw new Error("SMS 수신 동의 고객이 없습니다.");
  const remaining = typeof settings.smsRemaining === "number" && Number.isSafeInteger(settings.smsRemaining) && settings.smsRemaining >= 0 ? settings.smsRemaining : 0;
  if (remaining < recipients.length) throw new Error("SMS 잔여 건수가 부족합니다.");

  const message = store.save("messages", randomUUID(), {
    requestKey: input.requestKey, recipientIds: recipients.map(({ id }) => id), recipientCount: recipients.length, text, bytes: messageBytes(text), channel: messageType(text), status: "dry-run", scheduledAt: input.scheduledAt ?? null, operator: "원장",
  }, "원장");
  store.saveSettings({ ...settings, smsRemaining: remaining - recipients.length }, "원장");
  return message;
}

export function saveAutomationRule(store: SalonStore, input: { id?: string; label: string; enabled: boolean; text: string; schedule: string }) {
  const text = input.text.trim();
  const label = input.label.trim();
  const schedule = input.schedule.trim();
  if (!label || !text || !schedule) throw new Error("자동 문자 정보를 입력하세요.");
  return store.save("automations", input.id || randomUUID(), { label, status: input.enabled ? "사용" : "중지", text, schedule, channel: messageType(text), bytes: messageBytes(text), statusLabel: "dry-run", operator: "원장" }, "원장");
}
