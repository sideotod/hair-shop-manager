"use server";

import { revalidatePath } from "next/cache";

import { archiveCustomerRecord, completeWaitingCustomerRecord, saveCustomerPolicyRecord, saveCustomerRecord, saveWaitingCustomerRecord } from "../lib/customer-operations";
import type { SalonStore } from "../lib/salon-domain";
import { createSalonStore } from "../lib/salon-store";

function revalidateCustomers() {
  revalidatePath("/");
  revalidatePath("/customers");
}

function withStore<T>(operation: (store: SalonStore) => T) {
  const store = createSalonStore();
  try {
    return operation(store);
  } finally {
    store.close();
  }
}

export async function saveCustomer(formData: FormData) { withStore((store) => saveCustomerRecord(store, formData)); revalidateCustomers(); }
export async function archiveCustomer(formData: FormData) { withStore((store) => archiveCustomerRecord(store, formData)); revalidateCustomers(); }
export async function saveWaitingCustomer(formData: FormData) { withStore((store) => saveWaitingCustomerRecord(store, formData)); revalidateCustomers(); }
export async function completeWaitingCustomer(formData: FormData) { withStore((store) => completeWaitingCustomerRecord(store, formData)); revalidateCustomers(); }
export async function saveCustomerPolicy(formData: FormData) { withStore((store) => saveCustomerPolicyRecord(store, formData)); revalidateCustomers(); }
