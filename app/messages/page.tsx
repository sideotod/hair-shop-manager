import { MessagesPage } from "../../components/messages/messages-page";
import { createSalonStore } from "../../lib/salon-store";
import { connection } from "next/server";
import { randomUUID } from "node:crypto";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; segment?: string }> }) {
  await connection();
  const store = createSalonStore();
  try {
    const snapshot = store.snapshot();
    const params = await searchParams;
    return <MessagesPage automations={snapshot.records.automations ?? []} customers={snapshot.records.customers ?? []} messages={snapshot.records.messages ?? []} settings={snapshot.settings} requestKey={randomUUID()} error={params.error} notice={params.notice} segment={params.segment} />;
  } finally { store.close(); }
}
