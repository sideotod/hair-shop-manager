"use server";

import { redirect } from "next/navigation";

import {
  clearOwnerSession,
  createOwnerSession,
  verifyOwnerPassword,
} from "../lib/auth";
import { ownerPasswordHash, setInitialOwnerPasswordRecord, settingsErrorMessage } from "../lib/settings";
import { createSalonStore } from "../lib/salon-store";

export async function loginOwner(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const store = createSalonStore();
  let storedHash: string | null;
  try { storedHash = ownerPasswordHash(store.getSettings()); } finally { store.close(); }
  // 초기 비밀번호가 없으므로, 아직 설정 전이면 로그인이 아니라 최초 설정 화면으로 보낸다.
  if (!storedHash) redirect("/login");
  if (!verifyOwnerPassword(password, storedHash)) redirect("/login?error=1");
  await createOwnerSession();
  redirect("/");
}

export async function setInitialOwnerPassword(formData: FormData) {
  const store = createSalonStore();
  try { setInitialOwnerPasswordRecord(store, formData); }
  catch (error) { redirect(`/login?error=${encodeURIComponent(settingsErrorMessage(error))}`); }
  finally { store.close(); }
  await createOwnerSession();
  redirect("/");
}

export async function logoutOwner() {
  await clearOwnerSession();
  redirect("/login");
}
