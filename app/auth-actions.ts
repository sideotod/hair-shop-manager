"use server";

import { redirect } from "next/navigation";

import {
  clearOwnerSession,
  configuredOwnerPasswordHash,
  createOwnerSession,
  verifyOwnerPassword,
} from "../lib/auth";

export async function loginOwner(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyOwnerPassword(password, configuredOwnerPasswordHash())) redirect("/login?error=1");
  await createOwnerSession();
  redirect("/");
}

export async function logoutOwner() {
  await clearOwnerSession();
  redirect("/login");
}
