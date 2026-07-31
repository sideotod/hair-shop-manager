"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import type { CustomerValue, JsonObject, JsonValue, SalonRecord, SalonStore } from "../lib/salon-domain";
import { createSalonStore } from "../lib/salon-store";

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

function revalidateCustomers() {
  revalidatePath("/");
  revalidatePath("/customers");
}

function customerFrom(formData: FormData): CustomerValue {
  const name = text(formData, "name");
  if (!name) throw new Error("고객명은 필수입니다.");
  const phoneAbsent = checked(formData, "phoneAbsent");
  const phone = text(formData, "phone").replace(/\D/g, "");
  if (!phoneAbsent && !/^01\d{8,9}$/.test(phone)) throw new Error("휴대전화 번호를 확인하세요.");
  const memo = text(formData, "memo");
  if (memo.length > 150) throw new Error("메모는 150자 이하로 입력하세요.");
  const pointText = text(formData, "points");
  const points = pointText ? Number(pointText) : 0;
  if (!Number.isSafeInteger(points)) throw new Error("포인트는 정수로 입력하세요.");

  return {
    name,
    phone: phoneAbsent ? "" : phone,
    phoneAbsent,
    gender: text(formData, "gender") || "unspecified",
    smsOptIn: text(formData, "smsOptIn") !== "off",
    birthday: text(formData, "birthday"),
    birthdayCalendar: text(formData, "birthdayCalendar") || "solar",
    grade: text(formData, "grade") || "일반",
    group: text(formData, "group"),
    motive: text(formData, "motive"),
    points,
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
  const customer = customerFrom(formData);
  const id = recordId(formData, "customerId", "customer");
  const duplicate = store.list("customers").some((record) => {
    if (record.id === id) return false;
    const value = objectValue(record);
    return value.name === customer.name || (!customer.phoneAbsent && value.phone === customer.phone);
  });
  if (duplicate && !checked(formData, "allowDuplicate")) throw new Error("중복 고객입니다. 중복 등록을 확인하세요.");
  const bookingDate = text(formData, "initialBookingDate");
  const bookingTime = text(formData, "initialBookingTime");
  if ((bookingDate || bookingTime) && (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || !/^\d{2}:\d{2}$/.test(bookingTime))) {
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
  return store.saveSettings({
    customerGroups: text(formData, "customerGroups"),
    customerGrades: text(formData, "customerGrades"),
    visitMotives: text(formData, "visitMotives"),
    defaultSmsOptIn: text(formData, "defaultSmsOptIn") !== "off",
    birthdayCalendar: text(formData, "birthdayCalendar") || "solar",
  }, actor);
}

function withStore<T>(operation: (store: SalonStore) => T) {
  const store = createSalonStore();
  try {
    return operation(store);
  } finally {
    store.close();
  }
}

export async function saveCustomer(formData: FormData) { withStore((store) => saveCustomerRecord(store, formData)); revalidateCustomers(); }
export async function archiveCustomer(formData: FormData) { withStore((store) => archiveCustomerRecord(store, formData)); revalidateCustomers(); }
export async function saveWaitingCustomer(formData: FormData) { withStore((store) => saveWaitingCustomerRecord(store, formData)); revalidateCustomers(); }
export async function completeWaitingCustomer(formData: FormData) { withStore((store) => completeWaitingCustomerRecord(store, formData)); revalidateCustomers(); }
export async function saveCustomerPolicy(formData: FormData) { withStore((store) => saveCustomerPolicyRecord(store, formData)); revalidateCustomers(); }
