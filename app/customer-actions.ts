"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adjustCustomerPointsRecord, chargePrepaidRecord, saveCustomerRecord } from "../lib/customer-operations";
import type { SalonStore } from "../lib/salon-domain";
import { createSalonStore } from "../lib/salon-store";

function revalidateCustomers() {
  revalidatePath("/");
  revalidatePath("/customers");
}

function returnTo(formData: FormData) {
  const value = formData.get("returnTo");
  return typeof value === "string" && /^\/customers(?:\?|$)/.test(value) ? value : "/customers";
}

// 지금까지 `saveCustomerRecord` 등이 던지면 Next 에러 화면으로 튀어 입력이 통째로 사라졌다.
// `payment-actions.ts` 와 같은 모양으로 되돌려 보내 화면에서 읽히게 한다.
function back(formData: FormData, key: "error" | "notice", message: string): never {
  const url = new URL(returnTo(formData), "http://localhost");
  url.searchParams.delete(key === "notice" ? "error" : "notice");
  url.searchParams.delete("new");
  url.searchParams.set(key, message);
  redirect(`${url.pathname}${url.search}`);
}

function withStore<T>(operation: (store: SalonStore) => T) {
  const store = createSalonStore();
  try {
    return operation(store);
  } finally {
    store.close();
  }
}

function mutate(formData: FormData, notice: string, operation: (store: SalonStore) => unknown): never {
  try { withStore(operation); } catch (error) { back(formData, "error", error instanceof Error ? error.message : "고객 요청을 처리하지 못했습니다."); }
  revalidateCustomers();
  back(formData, "notice", notice);
}

export async function saveCustomer(formData: FormData) { mutate(formData, "고객 정보를 저장했습니다.", (store) => saveCustomerRecord(store, formData)); }
export async function chargePrepaid(formData: FormData) { mutate(formData, "선결제를 충전했습니다.", (store) => chargePrepaidRecord(store, formData)); }
export async function adjustCustomerPoints(formData: FormData) { mutate(formData, "포인트를 조정했습니다.", (store) => adjustCustomerPointsRecord(store, formData)); }
