import Link from "next/link";

import { button } from "@/components/button";
import { CustomerForm, type DuplicateEntry } from "@/components/customers/customer-form";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ModalHost } from "@/components/modal-host";
import { typeScale } from "@/components/type";
import type { JsonObject, JsonValue, SalonRecord } from "@/lib/salon-domain";
import { createSalonStore } from "@/lib/salon-store";
import { seoulClock, seoulDate } from "@/lib/seoul-date";
import { connection } from "next/server";
import { runStartupNaverSync } from "../naver-mail-actions";

/** 대시보드가 그리는 카드 4종. `snapshot()` 처럼 모든 kind 를 훑지 않는다 (A4-4). */
const dashboardKinds = ["customers", "bookings", "automations", "notices"] as const;

/** `customers-page.tsx:37-38` 과 같은 규약 — 값이 문자열이 아니면 빈 칸이다. */
function text(record: SalonRecord<JsonValue>, key: string) {
  const source = record.value && typeof record.value === "object" && !Array.isArray(record.value) ? record.value as JsonObject : {};
  return typeof source[key] === "string" ? source[key] : "";
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  void runStartupNaverSync();
  const params = await searchParams;
  const store = createSalonStore();
  try {
    const now = new Date();
    // 화면은 "서울 달력 날짜" 기준으로 오늘 매출을 낸다(`dateKey()`). 그 하루를 UTC 구간으로 바꿔 조회한다.
    const dayStart = new Date(`${seoulDate(now)}T00:00:00+09:00`);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    const records = Object.fromEntries(dashboardKinds.map((kind) => [kind, store.list(kind)]));
    const settings = store.getSettings();
    // 고객 등록은 화면을 갈아치우지 않는다. 대시보드는 뒤에 그대로 남고 팝업만 뜬다.
    const showNew = params.new === "1";
    // 중복 확인은 팝업이 열렸을 때만 만든다 (`customers-page.tsx:120-123` 과 같은 이유).
    const duplicateIndex: readonly DuplicateEntry[] = showNew
      ? (records.customers ?? []).map((record) => [record.id, text(record, "name"), text(record, "gender"), text(record, "phone"), text(record, "joinedAt"), text(record, "memo")] as const)
      : [];
    return (
      <>
        {showNew && <ModalHost label="고객 등록">
          <section aria-label="고객 등록" aria-modal="true" className="dialog-scroll p-5 !w-auto !max-w-full" data-dialog-panel role="dialog">
            <div className="flex items-center justify-between gap-4">
              <h2 className={typeScale.title}>고객 등록</h2>
              <Link className={button("md")} data-dialog-close href="/">닫기</Link>
            </div>
            <CustomerForm duplicateIndex={duplicateIndex} returnTo="/" settings={settings} today={seoulClock(now).date} />
          </section>
        </ModalHost>}
        {typeof params.error === "string" && params.error && <p className="mx-7 mt-5 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">{params.error}</p>}
        <DashboardPage
          data={{
            malformedLedgerDates: store.countMalformedDates(),
            recentAudit: store.recentAuditEvents(5),
            records,
            settings,
            todayLedger: store.listLedgerRange(dayStart.toISOString(), dayEnd.toISOString()),
          }}
          today={now}
        />
      </>
    );
  } finally {
    store.close();
  }
}
