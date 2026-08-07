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
    const snapshot = store.snapshot();
    return <BookingsPage
      bookings={snapshot.records.bookings ?? []}
      customers={snapshot.records.customers ?? []}
      date={value(params.date)}
      edit={value(params.edit)}
      error={value(params.error)}
      notice={value(params.notice)}
      period={value(params.period)}
      searchParams={params}
      settings={snapshot.settings}
      showNew={value(params.new) === "1"}
      syncHistory={snapshot.records["naver-syncs"] ?? []}
      view={value(params.view)}
    />;
  } finally {
    store.close();
  }
}
