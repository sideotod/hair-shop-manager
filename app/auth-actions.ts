"use server";

import { redirect } from "next/navigation";

import {
  clearOwnerSession,
  createOwnerSession,
  SEEDED_OWNER_PASSWORD_HASH,
  verifyOwnerPassword,
} from "../lib/auth";

export async function loginOwner(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyOwnerPassword(password, SEEDED_OWNER_PASSWORD_HASH)) redirect("/login?error=1");
  await createOwnerSession();
  redirect("/");
}

export async function logoutOwner() {
  await clearOwnerSession();
  redirect("/login");
}
