"use server";

import { revalidatePath } from "next/cache";

import { cancelBookingRecord, changeBookingStatusRecord, requestNaverSyncRecord, saveBookingRecord, saveBookingSettingsRecord } from "../lib/booking";
import { createSalonStore } from "../lib/salon-store";

function withStore<T>(operation: (store: ReturnType<typeof createSalonStore>) => T) { const store = createSalonStore(); try { return operation(store); } finally { store.close(); } }
function revalidateBookings() { revalidatePath("/"); revalidatePath("/bookings"); revalidatePath("/customers"); }

export async function saveBooking(formData: FormData) { withStore((store) => saveBookingRecord(store, formData)); revalidateBookings(); }
export async function changeBookingStatus(formData: FormData) { withStore((store) => changeBookingStatusRecord(store, formData)); revalidateBookings(); }
export async function cancelBooking(formData: FormData) { withStore((store) => cancelBookingRecord(store, formData)); revalidateBookings(); }
export async function saveBookingSettings(formData: FormData) { withStore((store) => saveBookingSettingsRecord(store, formData)); revalidateBookings(); }
export async function requestNaverSync() { withStore(requestNaverSyncRecord); revalidateBookings(); }
