import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { createSalonStore } from "@/lib/salon-store";
import { seoulDate } from "@/lib/seoul-date";
import { connection } from "next/server";
import { runStartupNaverSync } from "../naver-mail-actions";

/** 대시보드가 그리는 카드 5종. `snapshot()` 처럼 모든 kind 를 훑지 않는다 (A4-4). */
const dashboardKinds = ["customers", "bookings", "waiting-customers", "automations", "notices"] as const;

export default async function Page() {
  await connection();
  void runStartupNaverSync();
  const store = createSalonStore();
  try {
    const now = new Date();
    // 화면은 "서울 달력 날짜" 기준으로 오늘 매출을 낸다(`dateKey()`). 그 하루를 UTC 구간으로 바꿔 조회한다.
    const dayStart = new Date(`${seoulDate(now)}T00:00:00+09:00`);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    return (
      <DashboardPage
        data={{
          malformedLedgerDates: store.countMalformedDates(),
          recentAudit: store.recentAuditEvents(5),
          records: Object.fromEntries(dashboardKinds.map((kind) => [kind, store.list(kind)])),
          settings: store.getSettings(),
          todayLedger: store.listLedgerRange(dayStart.toISOString(), dayEnd.toISOString()),
        }}
        today={now}
      />
    );
  } finally {
    store.close();
  }
}
