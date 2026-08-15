import { MessagesPage } from "../../../components/messages/messages-page";
import { createSalonStore } from "../../../lib/salon-store";
import { forRecipientPicker } from "../../../lib/messages";
import { messagingUiEnabled } from "../../../lib/feature-flags";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; segment?: string }> }) {
  if (!messagingUiEnabled) redirect("/");
  await connection();
  const store = createSalonStore();
  try {
    const params = await searchParams;
    // 최근 발송 5건만 화면에 나온다. 원장·감사 이력은 쓰지 않는다 (A4-3).
    // listRecent는 최신순이고 화면은 `slice(-5).reverse()`로 최신순을 만든다 — 오래된 순으로 돌려 넘긴다.
    const messages = [...store.listRecent("messages", 5)].reverse();
    return <MessagesPage automations={store.list("automations")} customers={forRecipientPicker(store.list("customers"))} messages={messages} settings={store.getSettings()} requestKey={randomUUID()} error={params.error} notice={params.notice} segment={params.segment} />;
  } finally { store.close(); }
}
