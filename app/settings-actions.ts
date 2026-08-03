"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { changeOwnerPasswordRecord, parseShopSettings, saveNoticeRecord } from "../lib/settings";
import { createSalonStore } from "../lib/salon-store";

function returnTo(formData: FormData) {
  const value = formData.get("returnTo");
  return typeof value === "string" && /^\/settings(?:\?|$)/.test(value) ? value : "/settings";
}

function mutate(formData: FormData, notice: string, operation: (store: ReturnType<typeof createSalonStore>) => unknown): never {
  const url = new URL(returnTo(formData), "http://localhost");
  try {
    const store = createSalonStore();
    try { operation(store); } finally { store.close(); }
  } catch (error) {
    url.searchParams.set("error", error instanceof Error ? error.message : "설정을 저장하지 못했습니다.");
    redirect(`${url.pathname}${url.search}`);
  }
  for (const path of ["/", "/customers", "/bookings", "/sales", "/messages", "/operations", "/settings"]) revalidatePath(path);
  url.searchParams.delete("error");
  url.searchParams.set("notice", notice);
  redirect(`${url.pathname}${url.search}`);
}

export async function saveShopSettings(formData: FormData) {
  mutate(formData, "설정을 저장했습니다.", (store) => store.saveSettings(parseShopSettings(formData, store.getSettings()), "원장"));
}

export async function changeOwnerPassword(formData: FormData) {
  mutate(formData, "비밀번호를 변경했습니다.", (store) => changeOwnerPasswordRecord(store, formData));
}

export async function saveNotice(formData: FormData) {
  mutate(formData, "공지사항을 등록했습니다.", (store) => saveNoticeRecord(store, formData));
}
