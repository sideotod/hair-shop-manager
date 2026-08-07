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
    // `snapshot()` 은 원장 5,576행 + 감사 로그 6,435행(2.2MB)을 통째로 읽고 1행만 남긴다.
    // 이 화면에 필요한 건 설정 · 공지 · settings/notices 감사 로그뿐이다.
    const stored = store.getSettings();
    const settings = { ...stored, naverMail: naverMailMetadata(stored) };
    return <SettingsPage
      auditEvents={store.listAuditEvents(["settings", "notices"])}
      error={value(params.error)}
      notice={value(params.notice)}
      notices={store.list("notices")}
      section={value(params.section)}
      settings={settings}
    />;
  } finally {
    store.close();
  }
}
