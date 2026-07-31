import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { createSalonStore } from "@/lib/salon-store";
import { connection } from "next/server";

export default async function Page() {
  await connection();
  const store = createSalonStore();
  try {
    return <DashboardPage snapshot={store.snapshot()} />;
  } finally {
    store.close();
  }
}
