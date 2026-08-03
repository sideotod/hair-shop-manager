"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { correctExpenseRecord, recordExpense, saveCatalogItemRecord, savePresetRecord } from "../lib/operations";
import { createSalonStore } from "../lib/salon-store";

function returnTo(data: FormData) { const value = data.get("returnTo"); return typeof value === "string" && /^\/(?:operations|sales)(?:\?|$)/.test(value) ? value : "/operations"; }
function mutate(data: FormData, operation: (store: ReturnType<typeof createSalonStore>) => unknown) {
  try { const store = createSalonStore(); try { operation(store); } finally { store.close(); } }
  catch (error) { const url = new URL(returnTo(data), "http://localhost"); url.searchParams.set("error", error instanceof Error ? error.message : "처리하지 못했습니다."); redirect(`${url.pathname}${url.search}`); }
  for (const path of ["/", "/operations", "/sales", "/sales/transactions"]) revalidatePath(path);
}

export async function saveCatalogItem(data: FormData) { mutate(data, (store) => saveCatalogItemRecord(store, data)); }
export async function saveExpense(data: FormData) { mutate(data, (store) => recordExpense(store, data)); }
export async function correctExpense(data: FormData) { mutate(data, (store) => correctExpenseRecord(store, data)); }
export async function savePreset(data: FormData) { mutate(data, (store) => savePresetRecord(store, data)); }
