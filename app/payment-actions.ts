"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { correctPaymentRecord, recordPayment, refundPaymentRecord } from "../lib/finance";
import { createSalonStore } from "../lib/salon-store";

function returnTo(formData: FormData) { const value = formData.get("returnTo"); return typeof value === "string" && /^\/sales(?:\?|$)/.test(value) ? value : "/sales"; }
function mutate(formData: FormData, operation: (store: ReturnType<typeof createSalonStore>) => unknown) {
  try { const store = createSalonStore(); try { operation(store); } finally { store.close(); } }
  catch (error) { const url = new URL(returnTo(formData), "http://localhost"); url.searchParams.set("error", error instanceof Error ? error.message : "결제를 처리하지 못했습니다."); redirect(`${url.pathname}${url.search}`); }
  revalidatePath("/"); revalidatePath("/sales"); revalidatePath("/sales/transactions"); revalidatePath("/customers");
}
export async function savePayment(formData: FormData) { mutate(formData, (store) => recordPayment(store, formData)); }
export async function refundPayment(formData: FormData) { mutate(formData, (store) => refundPaymentRecord(store, formData)); }
export async function correctPayment(formData: FormData) { mutate(formData, (store) => correctPaymentRecord(store, formData)); }
