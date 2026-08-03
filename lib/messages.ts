import { randomUUID } from "node:crypto";

import type { JsonObject, JsonValue, SalonRecord, SalonStore } from "./salon-domain";

export type MessageSegment = "all" | "women" | "men" | "power";
const messageSegments = new Set<MessageSegment>(["all", "women", "men", "power"]);

export function messageBytes(text: string) { return new TextEncoder().encode(text).length; }
export function messageType(text: string): "SMS" | "LMS" { return messageBytes(text) <= 90 ? "SMS" : "LMS"; }

function value(record: SalonRecord<JsonValue>) { return typeof record.value === "object" && record.value !== null && !Array.isArray(record.value) ? record.value as JsonObject : {}; }
function segment(value: JsonObject, name: MessageSegment, powerMinimum: number) {
  if (name === "women") return value.gender === "female";
  if (name === "men") return value.gender === "male";
  return name !== "power" || (typeof value.points === "number" && value.points >= powerMinimum);
}

export function eligibleRecipients(customers: readonly SalonRecord<JsonValue>[], name: MessageSegment, powerMinimum = 100) {
  return customers.filter((customer) => {
    const customerValue = value(customer);
    return customerValue.smsOptIn !== false && segment(customerValue, name, powerMinimum);
  });
}

type QueueMessageInput = { requestKey: string; text: string; recipientIds?: readonly string[]; segment?: MessageSegment; scheduledAt?: string; now?: Date };

export function queueMessage(store: SalonStore, input: QueueMessageInput) {
  if (!input.requestKey.trim()) throw new Error("요청 키가 필요합니다.");
  if (!input.text.trim()) throw new Error("문자 내용을 입력하세요.");
  if (input.segment && !messageSegments.has(input.segment)) throw new Error("알 수 없는 발송 대상입니다.");
  if (input.recipientIds && input.recipientIds.length > 3) throw new Error("개별 수신자는 최대 3명입니다.");
  if (store.list<JsonObject>("messages").some(({ value }) => value.requestKey === input.requestKey)) throw new Error("이미 처리한 요청입니다.");
  const now = input.now ?? new Date();
  if (input.scheduledAt) {
    const scheduled = new Date(input.scheduledAt);
    if (Number.isNaN(scheduled.getTime()) || scheduled <= now) throw new Error("예약 시간은 현재 이후여야 합니다.");
  }

  const customers = store.list<JsonValue>("customers");
  const settings = store.getSettings();
  const powerMinimum = typeof settings.powerCustomerMinPoints === "number" && settings.powerCustomerMinPoints >= 0 ? settings.powerCustomerMinPoints : 100;
  const requested = input.recipientIds?.length
    ? input.recipientIds.map((id) => customers.find((customer) => customer.id === id) ?? (() => { throw new Error("알 수 없는 고객입니다."); })())
    : eligibleRecipients(customers, input.segment ?? "all", powerMinimum);
  const recipients = requested.filter((customer) => value(customer).smsOptIn !== false);
  if (!recipients.length) throw new Error("SMS 수신 동의 고객이 없습니다.");
  const remaining = typeof settings.smsRemaining === "number" && Number.isSafeInteger(settings.smsRemaining) && settings.smsRemaining >= 0 ? settings.smsRemaining : 0;
  if (remaining < recipients.length) throw new Error("SMS 잔여 건수가 부족합니다.");

  const message = store.save("messages", randomUUID(), {
    requestKey: input.requestKey, recipientIds: recipients.map(({ id }) => id), recipientCount: recipients.length, text: input.text.trim(), bytes: messageBytes(input.text), channel: messageType(input.text), status: "dry-run", scheduledAt: input.scheduledAt ?? null, operator: "원장",
  }, "원장");
  store.saveSettings({ ...settings, smsRemaining: remaining - recipients.length }, "원장");
  return message;
}

export function saveAutomationRule(store: SalonStore, input: { id?: string; label: string; enabled: boolean; text: string; schedule: string }) {
  if (!input.label.trim() || !input.text.trim() || !input.schedule.trim()) throw new Error("자동 문자 정보를 입력하세요.");
  return store.save("automations", input.id || randomUUID(), { label: input.label.trim(), status: input.enabled ? "사용" : "중지", text: input.text.trim(), schedule: input.schedule.trim(), channel: messageType(input.text), bytes: messageBytes(input.text), statusLabel: "dry-run", operator: "원장" }, "원장");
}
