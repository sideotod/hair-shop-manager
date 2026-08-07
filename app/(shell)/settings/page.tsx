import { connection } from "next/server";

import { SettingsPage } from "../../../components/settings/settings-page";
import { naverMailMetadata } from "../../../lib/naver-mail";
import { createSalonStore } from "../../../lib/salon-store";

function value(input: string | string[] | undefined) { return typeof input === "string" ? input : ""; }

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const params = await searchParams;
  const store = createSalonStore();
  try {
    const snapshot = store.snapshot();
    const settings = { ...snapshot.settings, naverMail: naverMailMetadata(snapshot.settings) };
    return <SettingsPage
      auditEvents={snapshot.auditEvents.filter(({ kind }) => kind === "settings" || kind === "notices")}
      error={value(params.error)}
      notice={value(params.notice)}
      notices={snapshot.records.notices ?? []}
      section={value(params.section)}
      settings={settings}
    />;
  } finally {
    store.close();
  }
}
