"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { correctExpenseRecord, recordExpense, saveCatalogItemRecord, savePresetRecord } from "../lib/operations";
import { createSalonStore } from "../lib/salon-store";

// 지출은 `/sales`, 시술·메모는 `/settings` 로 갈라졌다 (설계 §5.2). `/operations` 는 없는 경로다.
function returnTo(data: FormData) { const value = data.get("returnTo"); return typeof value === "string" && /^\/(?:settings|sales)(?:\?|$)/.test(value) ? value : "/sales?tab=expenses"; }
function mutate(data: FormData, operation: (store: ReturnType<typeof createSalonStore>) => unknown) {
  try { const store = createSalonStore(); try { operation(store); } finally { store.close(); } }
  catch (error) { const url = new URL(returnTo(data), "http://localhost"); url.searchParams.set("error", error instanceof Error ? error.message : "처리하지 못했습니다."); redirect(`${url.pathname}${url.search}`); }
  for (const path of ["/", "/settings", "/sales", "/sales/transactions"]) revalidatePath(path);
}

export async function saveCatalogItem(data: FormData) { mutate(data, (store) => saveCatalogItemRecord(store, data)); }
export async function saveExpense(data: FormData) { mutate(data, (store) => recordExpense(store, data)); }
export async function correctExpense(data: FormData) { mutate(data, (store) => correctExpenseRecord(store, data)); }
export async function savePreset(data: FormData) { mutate(data, (store) => savePresetRecord(store, data)); }
