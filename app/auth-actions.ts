"use server";

import { redirect } from "next/navigation";

import {
  clearOwnerSession,
  createOwnerSession,
  verifyOwnerPassword,
} from "../lib/auth";
import { ownerPasswordHash } from "../lib/settings";
import { createSalonStore } from "../lib/salon-store";

export async function loginOwner(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const store = createSalonStore();
  let storedHash: string;
  try { storedHash = ownerPasswordHash(store.getSettings()); } finally { store.close(); }
  if (!verifyOwnerPassword(password, storedHash)) redirect("/login?error=1");
  await createOwnerSession();
  redirect("/");
}

export async function logoutOwner() {
  await clearOwnerSession();
  redirect("/login");
}
