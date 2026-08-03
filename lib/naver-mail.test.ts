import { describe, expect, it } from "vitest";

import {
  applyNaverBookingMails,
  classifyNaverBookingMail,
  mergeNaverBookingMail,
  naverMailConnectionMetadata,
  parseNaverBookingMail,
  type NaverMailMessage,
} from "./naver-mail";
import type { SalonStore } from "./salon-domain";
import { createSalonStore } from "./salon-store";

const mail = (overrides: Partial<NaverMailMessage> = {}): NaverMailMessage => ({
  uid: 101,
  receivedAt: "2026-08-03T05:00:00.000Z",
  from: "네이버 예약 <booking_noreply@naver.com>",
  subject: "[네이버 예약] 예약 확정",
  text: [
    "예약번호: NVR-20260804-001",
    "예약자명: 김하나",
    "연락처: 010-1234-5678",
    "예약상품: 여성 커트",
    "방문일시: 2026-08-04 14:30~15:30",
  ].join("\n"),
  ...overrides,
});

describe("Naver booking mail", () => {
  it("starts every new mail connection at the initial checkpoint", () => {
    expect(naverMailConnectionMetadata("new-owner@naver.com")).toEqual({ email: "new-owner@naver.com", provider: "naver", connected: true, lastSyncUid: 0, lastSyncAt: "" });
  });

  it("classifies request, confirmation, change, and cancellation", () => {
    expect(classifyNaverBookingMail(mail({ subject: "네이버 예약 신청" }))).toBe("requested");
    expect(classifyNaverBookingMail(mail({ subject: "네이버 예약 확정" }))).toBe("confirmed");
    expect(classifyNaverBookingMail(mail({ subject: "네이버 예약 변경" }))).toBe("changed");
    expect(classifyNaverBookingMail(mail({ subject: "네이버 예약 취소" }))).toBe("cancelled");
    expect(classifyNaverBookingMail(mail({ from: "news@example.com", subject: "주간 소식", text: "안녕하세요" }))).toBeNull();
  });

  it("requires the trusted Naver reservation sender and subject marker", () => {
    expect(classifyNaverBookingMail(mail({
      from: "외부 발신자 <spoof@example.com>",
      subject: "[네이버 예약] 예약 확정",
    }))).toBeNull();
    expect(classifyNaverBookingMail(mail({
      subject: "[네이버 예약] 예약 확정",
      text: `${mail().text}\n예약 취소는 네이버 예약 화면에서 진행해 주세요.`,
    }))).toBe("confirmed");
  });

  it("parses reservation identity, customer, service, and visit time", () => {
    expect(parseNaverBookingMail(mail())).toEqual({
      uid: 101,
      receivedAt: "2026-08-03T05:00:00.000Z",
      reservationNumber: "NVR-20260804-001",
      customerName: "김하나",
      customerPhone: "01012345678",
      service: "여성 커트",
      startsAt: "2026-08-04T14:30:00.000Z",
      endsAt: "2026-08-04T15:30:00.000Z",
      status: "confirmed",
    });
  });

  it("parses HTML-only mail and returns null without a reservation number", () => {
    const html = mail({ text: undefined, html: "<p>예약번호: NVR-HTML-1<br>예약자명: 박봄<br>연락처: 010-9999-1111<br>예약상품: 펌<br>방문일시: 2026-08-05 10:00~11:00</p>" });
    expect(parseNaverBookingMail(html)?.reservationNumber).toBe("NVR-HTML-1");
    expect(parseNaverBookingMail(mail({ text: "예약자명: 번호없음" }))).toBeNull();
  });

  it("ignores same or lower UID and applies higher UID in order", () => {
    const first = parseNaverBookingMail(mail())!;
    const created = mergeNaverBookingMail(undefined, first);
    const stale = mergeNaverBookingMail(created.value, { ...first, uid: 100, status: "changed" });
    const changed = mergeNaverBookingMail(created.value, { ...first, uid: 102, status: "changed", service: "여성 펌" });

    expect(created.changed).toBe(true);
    expect(stale).toEqual({ changed: false, archived: false, value: created.value });
    expect(changed.changed).toBe(true);
    expect(changed.value.service).toBe("여성 펌");
    expect(changed.value.naverUid).toBe(102);
    expect(changed.value.statusHistory).toHaveLength(2);
  });

  it("archives cancellation while preserving prior status history", () => {
    const confirmed = mergeNaverBookingMail(undefined, parseNaverBookingMail(mail())!);
    const cancelled = mergeNaverBookingMail(confirmed.value, parseNaverBookingMail(mail({ uid: 103, subject: "네이버 예약 취소" }))!);

    expect(cancelled.archived).toBe(true);
    expect(cancelled.value.status).toBe("cancelled");
    expect(cancelled.value.statusHistory).toHaveLength(2);
  });

  it("deduplicates UIDs and integrates one booking per reservation number", () => {
    const store = createSalonStore(":memory:");
    try {
      const first = parseNaverBookingMail(mail())!;
      const result = applyNaverBookingMails(store, [first, first, { ...first, uid: 102, status: "changed", service: "여성 펌" }]);
      const bookings = store.list("bookings").filter((record) => record.id.startsWith("naver-booking:"));

      expect(result).toEqual({ changed: 2, cancelled: 0, highestUid: 102 });
      expect(bookings).toHaveLength(1);
      expect((bookings[0].value as { service: string }).service).toBe("여성 펌");
    } finally {
      store.close();
    }
  });

  it("retries archival for the same cancellation UID after save already succeeded", () => {
    const realStore = createSalonStore(":memory:");
    let archiveCalls = 0;
    const store = {
      ...realStore,
      archive(kind, id, actor) {
        archiveCalls += 1;
        if (archiveCalls === 1) throw new Error("archive unavailable");
        return realStore.archive(kind, id, actor);
      },
    } satisfies SalonStore;
    const cancellation = parseNaverBookingMail(mail({ uid: 104, subject: "네이버 예약 취소" }))!;

    try {
      expect(() => applyNaverBookingMails(store, [cancellation])).toThrow("archive unavailable");
      expect(realStore.get("bookings", "naver-booking:NVR-20260804-001")?.archivedAt).toBeNull();

      expect(applyNaverBookingMails(store, [cancellation])).toEqual({ changed: 1, cancelled: 1, highestUid: 104 });
      expect(archiveCalls).toBe(2);
      expect(realStore.get("bookings", "naver-booking:NVR-20260804-001")?.archivedAt).not.toBeNull();
    } finally {
      realStore.close();
    }
  });

  it("matches an incoming phone only by normalized phone", () => {
    const store = createSalonStore(":memory:");
    try {
      store.save("customers", "customer-phone", { name: "다른 이름", phone: "010-1234-5678" }, "원장");
      applyNaverBookingMails(store, [parseNaverBookingMail(mail())!]);

      expect((store.get("bookings", "naver-booking:NVR-20260804-001")?.value as { customerId: string }).customerId).toBe("customer-phone");
    } finally {
      store.close();
    }
  });

  it("never name-matches a conflicting incoming phone", () => {
    const store = createSalonStore(":memory:");
    try {
      store.save("customers", "customer-a", { name: "김하나", phone: "010-1111-1111" }, "원장");
      store.save("customers", "customer-b", { name: "김하나", phone: "010-2222-2222" }, "원장");
      applyNaverBookingMails(store, [parseNaverBookingMail(mail())!]);

      expect((store.get("bookings", "naver-booking:NVR-20260804-001")?.value as { customerId: string }).customerId).toBe("naver-customer:01012345678");
    } finally {
      store.close();
    }
  });

  it("reuses a no-phone customer only for one unambiguous active name", () => {
    const store = createSalonStore(":memory:");
    try {
      store.save("customers", "customer-active", { name: "김하나", phone: "" }, "원장");
      store.save("customers", "customer-archived", { name: "김하나", phone: "" }, "원장");
      store.archive("customers", "customer-archived", "원장");
      applyNaverBookingMails(store, [parseNaverBookingMail(mail({ text: mail().text?.replace("연락처: 010-1234-5678\n", "") }))!]);

      expect((store.get("bookings", "naver-booking:NVR-20260804-001")?.value as { customerId: string }).customerId).toBe("customer-active");
    } finally {
      store.close();
    }
  });

  it("does not guess between duplicate active names when the mail has no phone", () => {
    const store = createSalonStore(":memory:");
    try {
      store.save("customers", "customer-a", { name: "김하나", phone: "" }, "원장");
      store.save("customers", "customer-b", { name: "김하나", phone: "" }, "원장");
      applyNaverBookingMails(store, [parseNaverBookingMail(mail({ text: mail().text?.replace("연락처: 010-1234-5678\n", "") }))!]);

      expect((store.get("bookings", "naver-booking:NVR-20260804-001")?.value as { customerId: string }).customerId).toBe("naver-customer:NVR-20260804-001");
    } finally {
      store.close();
    }
  });
});
