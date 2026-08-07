import { connection } from "next/server";

import { runStartupNaverSync } from "../../naver-mail-actions";
import { BookingsPage } from "../../../components/bookings/bookings-page";
import { createSalonStore } from "../../../lib/salon-store";

function value(input: string | string[] | undefined) { return typeof input === "string" ? input : ""; }

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  void runStartupNaverSync();
  const params = await searchParams;
  const store = createSalonStore();
  try {
    // 예약 화면은 원장·감사 이력을 한 줄도 쓰지 않는다. snapshot()은 그 둘을 전량 읽는다 (A4-3).
    return <BookingsPage
      bookings={store.list("bookings")}
      customers={store.list("customers")}
      date={value(params.date)}
      edit={value(params.edit)}
      error={value(params.error)}
      notice={value(params.notice)}
      period={value(params.period)}
      searchParams={params}
      settings={store.getSettings()}
      showNew={value(params.new) === "1"}
      syncHistory={store.list("naver-syncs")}
      view={value(params.view)}
    />;
  } finally {
    store.close();
  }
}
