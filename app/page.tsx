import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { createSalonStore } from "@/lib/salon-store";
import { connection } from "next/server";

export default async function Page() {
  await connection();
  return <DashboardPage snapshot={createSalonStore().snapshot()} />;
}
