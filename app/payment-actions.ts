"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { correctPaymentRecord, recordPayment, refundPaymentRecord } from "../lib/finance";
import { createSalonStore } from "../lib/salon-store";

// 환불은 `/sales/transactions` 에서 출발한다. 이 경로를 허용하지 않으면 실패 메시지가
// `/sales` 로 떨어져 원장이 "눌렀는데 아무 일도 안 났다" 를 본다.
function returnTo(formData: FormData) { const value = formData.get("returnTo"); return typeof value === "string" && /^\/sales(?:\/transactions)?(?:\?|$)/.test(value) ? value : "/sales?tab=payment"; }
function back(formData: FormData, key: "error" | "notice", message: string): never {
  const url = new URL(returnTo(formData), "http://localhost");
  url.searchParams.delete(key === "notice" ? "error" : "notice");
  url.searchParams.set(key, message);
  redirect(`${url.pathname}${url.search}`);
}
function mutate(formData: FormData, notice: string, operation: (store: ReturnType<typeof createSalonStore>) => unknown) {
  try { const store = createSalonStore(); try { operation(store); } finally { store.close(); } }
  catch (error) { back(formData, "error", error instanceof Error ? error.message : "결제를 처리하지 못했습니다."); }
  revalidatePath("/"); revalidatePath("/sales"); revalidatePath("/sales/transactions"); revalidatePath("/customers");
  back(formData, "notice", notice);
}
export async function savePayment(formData: FormData) { mutate(formData, "결제를 저장했습니다.", (store) => recordPayment(store, formData)); }
export async function refundPayment(formData: FormData) { mutate(formData, "환불을 처리했습니다.", (store) => refundPaymentRecord(store, formData)); }
export async function correctPayment(formData: FormData) { mutate(formData, "정정을 저장했습니다.", (store) => correctPaymentRecord(store, formData)); }
