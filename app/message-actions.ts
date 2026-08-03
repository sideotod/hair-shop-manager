"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { queueMessage as queueMessageRecord, saveAutomationRule as saveAutomationRuleRecord } from "../lib/messages";
import { createSalonStore } from "../lib/salon-store";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? ""); }
function finish(error?: unknown) { revalidatePath("/"); revalidatePath("/messages"); redirect(`/messages?${error ? `error=${encodeURIComponent(error instanceof Error ? error.message : "문자를 저장하지 못했습니다.")}` : `notice=${encodeURIComponent("dry-run 저장됨")}`}`); }

export async function queueMessage(formData: FormData) {
  const store = createSalonStore();
  let error: unknown;
  try {
    queueMessageRecord(store, { requestKey: text(formData, "requestKey"), text: text(formData, "text"), recipientIds: formData.getAll("recipientIds").map(String), segment: text(formData, "segment") as "all" | "women" | "men" | "power", scheduledAt: text(formData, "scheduledAt") || undefined });
  } catch (cause) { error = cause; } finally { store.close(); }
  finish(error);
}

export async function saveAutomationRule(formData: FormData) {
  const store = createSalonStore();
  let error: unknown;
  try {
    saveAutomationRuleRecord(store, { id: text(formData, "id") || undefined, label: text(formData, "label"), enabled: formData.get("enabled") === "on", text: text(formData, "text"), schedule: text(formData, "schedule") });
  } catch (cause) { error = cause; } finally { store.close(); }
  finish(error);
}
