import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

import type { JsonObject, JsonValue, SalonRecord, SalonStore } from "./salon-domain";
import { seoulInstant } from "./seoul-date";

export type NaverBookingStatus = "requested" | "confirmed" | "changed" | "cancelled";
export type NaverMailMessage = {
  uid: number;
  receivedAt: string;
  from: string;
  subject: string;
  authenticationResults?: unknown;
  text?: string;
  html?: string;
};
export type ParsedNaverBookingMail = {
  uid: number;
  receivedAt: string;
  reservationNumber: string;
  customerName: string;
  customerPhone: string;
  service: string;
  startsAt: string;
  endsAt: string;
  status: NaverBookingStatus;
};
export type NaverMailConnectionInput = { email: string; password: string };
export type NaverMailMetadata = { email: string; provider: "naver"; connected: boolean; lastSyncUid: number; lastSyncAt: string };

const actor = "원장" as const;

function plain(message: NaverMailMessage) {
  if (message.text) return message.text;
  return (message.html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

function field(body: string, labels: string) {
  return new RegExp(`(?:${labels})\\s*[:：]\\s*([^\\r\\n]+)`, "i").exec(body)?.[1]?.trim() ?? "";
}

function hasAuthenticatedNaverDkim(value: unknown) {
  const headers = typeof value === "string" ? [value] : Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return headers.some((header) => header.split(";").some((result) => /^\s*dkim\s*=\s*pass\b/i.test(result) && /\bheader\.d\s*=\s*naver\.com(?![\w.-])/i.test(result)));
}

export function classifyNaverBookingMail(message: NaverMailMessage): NaverBookingStatus | null {
  const sender = (/<\s*([^<>]+)\s*>/.exec(message.from)?.[1] ?? message.from).trim().toLowerCase();
  if (sender !== "booking_noreply@naver.com" || !hasAuthenticatedNaverDkim(message.authenticationResults)) return null;
  const event = /^(?:\[네이버 예약\]|네이버 예약)\s*(?:예약\s*)?(신청|접수|확정|변경|취소)/.exec(message.subject.trim())?.[1];
  if (event === "취소") return "cancelled";
  if (event === "변경") return "changed";
  if (event === "확정") return "confirmed";
  if (event === "신청" || event === "접수") return "requested";
  return null;
}

export function parseNaverBookingMail(message: NaverMailMessage): ParsedNaverBookingMail | null {
  const status = classifyNaverBookingMail(message);
  if (!status || !Number.isSafeInteger(message.uid) || message.uid < 1) return null;
  const body = plain(message);
  const reservationNumber = field(body, "예약\\s*번호|예약번호|reservation\\s*(?:number|no)").match(/[A-Z0-9-]{5,}/i)?.[0] ?? "";
  const visit = /(?:방문|예약|이용)(?:\s*일시|\s*시간)\s*[:：]\s*(\d{4})[-./]\s*(\d{1,2})[-./]\s*(\d{1,2})\s+(\d{1,2}):(\d{2})\s*[~-]\s*(\d{1,2}):(\d{2})/.exec(body);
  if (!reservationNumber || !visit) return null;
  const [, year, month, day, startHour, startMinute, endHour, endMinute] = visit;
  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  // 메일 본문의 시각은 서울 벽시계다. 저장은 참 시각 ISO 한 규약으로만 한다.
  const at = (hour: string, minute: string) => seoulInstant(date, `${hour.padStart(2, "0")}:${minute}`);
  let startsAt: string; let endsAt: string;
  try { startsAt = at(startHour, startMinute); endsAt = at(endHour, endMinute); } catch { return null; }
  return {
    uid: message.uid,
    receivedAt: message.receivedAt,
    reservationNumber,
    customerName: field(body, "예약자(?:명)?|고객명"),
    customerPhone: field(body, "연락처|휴대(?:전화|폰)|전화번호").replace(/\D/g, ""),
    service: field(body, "예약\\s*상품|예약상품|상품명|시술|서비스"),
    startsAt,
    endsAt,
    status,
  };
}

export function mergeNaverBookingMail(existing: JsonObject | undefined, message: ParsedNaverBookingMail) {
  const current = existing ?? {};
  const currentUid = typeof current.naverUid === "number" ? current.naverUid : 0;
  if (message.uid <= currentUid) return { changed: false, archived: false, value: current } as const;
  const status = message.status === "requested" ? "waiting" : message.status === "cancelled" ? "cancelled" : "confirmed";
  const history = Array.isArray(current.statusHistory) ? current.statusHistory : [];
  const value: JsonObject = {
    ...current,
    customerId: typeof current.customerId === "string" ? current.customerId : "",
    customerName: message.customerName,
    customerPhone: message.customerPhone,
    service: message.service,
    startsAt: message.startsAt,
    endsAt: message.endsAt,
    status,
    naverStatus: message.status,
    naverReservationNumber: message.reservationNumber,
    naverUid: message.uid,
    source: "naver-mail",
    operator: actor,
    statusHistory: [...history, { status: message.status, at: message.receivedAt, actor, source: "naver-mail", uid: message.uid }],
  };
  return { changed: true, archived: message.status === "cancelled", value } as const;
}

function recordValue(record: SalonRecord<JsonValue> | null | undefined): JsonObject {
  return record?.value && typeof record.value === "object" && !Array.isArray(record.value) ? record.value as JsonObject : {};
}

export function applyNaverBookingMails(store: SalonStore, messages: readonly ParsedNaverBookingMail[]) {
  const unique = [...new Map(messages.map((message) => [message.uid, message])).values()].sort((a, b) => a.uid - b.uid);
  let changed = 0;
  let cancelled = 0;
  for (const message of unique) {
    const bookingId = `naver-booking:${message.reservationNumber}`;
    const existing = store.get("bookings", bookingId);
    const merged = mergeNaverBookingMail(recordValue(existing), message);
    if (!merged.changed) {
      if (message.status === "cancelled" && existing?.archivedAt === null && recordValue(existing).naverUid === message.uid) {
        store.archive("bookings", bookingId, actor);
        changed += 1;
        cancelled += 1;
      }
      continue;
    }
    const customers = store.list("customers");
    const nameMatches = message.customerName ? customers.filter((record) => recordValue(record).name === message.customerName) : [];
    const matchingCustomer = message.customerPhone
      ? customers.find((record) => String(recordValue(record).phone ?? "").replace(/\D/g, "") === message.customerPhone)
      : nameMatches.length === 1 ? nameMatches[0] : undefined;
    const customerId = matchingCustomer?.id ?? `naver-customer:${message.customerPhone || message.reservationNumber}`;
    if (!matchingCustomer) store.save("customers", customerId, { name: message.customerName || "네이버 예약 고객", phone: message.customerPhone, smsOptIn: false, points: 0, visitType: "first", operator: actor }, actor);
    store.save("bookings", bookingId, { ...merged.value, customerId }, actor);
    if (merged.archived) {
      store.archive("bookings", bookingId, actor);
      cancelled += 1;
    }
    changed += 1;
  }
  return { changed, cancelled, highestUid: unique.at(-1)?.uid ?? 0 };
}

async function withInbox<T>(input: NaverMailConnectionInput, operation: (client: ImapFlow) => Promise<T>) {
  const client = new ImapFlow({ host: "imap.naver.com", port: 993, secure: true, auth: { user: input.email, pass: input.password }, logger: false, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 30_000 });
  await client.connect();
  try {
    return await operation(client);
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function testNaverMailConnection(input: NaverMailConnectionInput) {
  return withInbox(input, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    lock.release();
    return { connected: true } as const;
  });
}

export async function discoverNaverBookingMails(input: NaverMailConnectionInput & { afterUid?: number }) {
  return withInbox(input, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      // ponytail: initial import scans INBOX once; add server-side provider filters if mailbox size becomes measurable.
      const uids = await client.search(input.afterUid ? { uid: `${input.afterUid + 1}:*` } : { all: true }, { uid: true });
      if (!uids || !uids.length) return [];
      const messages: ParsedNaverBookingMail[] = [];
      for await (const item of client.fetch(uids, { uid: true, source: true, internalDate: true }, { uid: true })) {
        if (!item.uid || !item.source) continue;
        const parsed = await simpleParser(item.source);
        const source: NaverMailMessage = {
          uid: item.uid,
          receivedAt: new Date(parsed.date ?? item.internalDate ?? Date.now()).toISOString(),
          from: parsed.from?.text ?? "",
          subject: parsed.subject ?? "",
          authenticationResults: parsed.headers.get("authentication-results"),
          text: parsed.text,
          html: typeof parsed.html === "string" ? parsed.html : undefined,
        };
        const status = classifyNaverBookingMail(source);
        if (!status) continue;
        const booking = parseNaverBookingMail(source);
        if (!booking) throw new Error("예약번호 또는 방문일시를 확인할 수 없는 네이버 예약 메일이 있습니다.");
        messages.push(booking);
      }
      return messages.sort((a, b) => a.uid - b.uid);
    } finally {
      lock.release();
    }
  });
}

export function seoulTimestamp(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now).replace(" ", "T");
}

export function naverMailMetadata(settings: JsonObject): NaverMailMetadata {
  const value = settings.naverMail;
  const metadata = value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
  return {
    email: typeof metadata.email === "string" ? metadata.email : "",
    provider: "naver",
    connected: metadata.connected === true,
    lastSyncUid: typeof metadata.lastSyncUid === "number" && Number.isSafeInteger(metadata.lastSyncUid) ? metadata.lastSyncUid : 0,
    lastSyncAt: typeof metadata.lastSyncAt === "string" ? metadata.lastSyncAt : "",
  };
}

export function naverMailConnectionMetadata(email: string): NaverMailMetadata {
  return { email, provider: "naver", connected: true, lastSyncUid: 0, lastSyncAt: "" };
}

export function createStartupNaverSync(sync: () => Promise<void>) {
  let done = false;
  let pending: Promise<void> | undefined;
  return async () => {
    if (done) return;
    if (!pending) {
      // ponytail: single-process startup sync; use a DB lease if multi-process desktop instances are introduced.
      pending = sync().then(() => { done = true; }).catch(() => undefined).finally(() => { pending = undefined; });
    }
    await pending;
  };
}
