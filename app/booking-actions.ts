"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { cancelBookingRecord, changeBookingStatusRecord, saveBookingRecord, saveBookingSettingsRecord } from "../lib/booking";
import { createSalonStore } from "../lib/salon-store";

function withStore<T>(operation: (store: ReturnType<typeof createSalonStore>) => T) { const store = createSalonStore(); try { return operation(store); } finally { store.close(); } }
function revalidateBookings() { revalidatePath("/"); revalidatePath("/bookings"); revalidatePath("/customers"); }
function returnTo(formData: FormData) { const value = formData.get("returnTo"); return typeof value === "string" && /^\/bookings(?:\?|$)/.test(value) ? value : "/bookings"; }
function reportError(formData: FormData, error: unknown): never { const url = new URL(returnTo(formData), "http://localhost"); url.searchParams.set("error", error instanceof Error ? error.message : "예약 요청을 처리하지 못했습니다."); redirect(`${url.pathname}${url.search}`); }
function mutate(formData: FormData, operation: (store: ReturnType<typeof createSalonStore>) => unknown) { try { withStore(operation); } catch (error) { reportError(formData, error); } revalidateBookings(); }

export async function saveBooking(formData: FormData) { mutate(formData, (store) => saveBookingRecord(store, formData)); }
export async function changeBookingStatus(formData: FormData) { mutate(formData, (store) => changeBookingStatusRecord(store, formData)); }
export async function cancelBooking(formData: FormData) { mutate(formData, (store) => cancelBookingRecord(store, formData)); }
export async function saveBookingSettings(formData: FormData) { mutate(formData, (store) => saveBookingSettingsRecord(store, formData)); }
