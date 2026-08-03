import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { createSalonStore } from "@/lib/salon-store";
import { connection } from "next/server";
import { runStartupNaverSync } from "./naver-mail-actions";

export default async function Page() {
  await connection();
  void runStartupNaverSync();
  const store = createSalonStore();
  try {
    return <DashboardPage snapshot={store.snapshot()} />;
  } finally {
    store.close();
  }
}
