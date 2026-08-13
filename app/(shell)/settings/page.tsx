import { connection } from "next/server";
import { randomUUID } from "node:crypto";

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
    // 시술 가격 구역만 `catalog-items` 를 읽는다. 다른 구역을 볼 때까지 끌고 오지 않는다.
    const section = value(params.section);
    return <SettingsPage
      auditEvents={store.listAuditEvents(["settings", "notices"])}
      catalog={section === "services" ? store.list("catalog-items") : []}
      editCatalogId={value(params.edit)}
      error={value(params.error)}
      notice={value(params.notice)}
      notices={store.list("notices")}
      requestKey={randomUUID()}
      section={section}
      settings={settings}
    />;
  } finally {
    store.close();
  }
}
