import { connection } from "next/server";

import { SettingsPage } from "../../components/settings/settings-page";
import { createSalonStore } from "../../lib/salon-store";

function value(input: string | string[] | undefined) { return typeof input === "string" ? input : ""; }

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const params = await searchParams;
  const store = createSalonStore();
  try {
    const snapshot = store.snapshot();
    return <SettingsPage
      auditEvents={snapshot.auditEvents.filter(({ kind }) => kind === "settings" || kind === "notices")}
      error={value(params.error)}
      naverConfigured={Boolean(process.env.NAVER_RESERVATION_CLIENT_ID && process.env.NAVER_RESERVATION_CLIENT_SECRET)}
      notice={value(params.notice)}
      notices={snapshot.records.notices ?? []}
      section={value(params.section)}
      settings={snapshot.settings}
    />;
  } finally {
    store.close();
  }
}
