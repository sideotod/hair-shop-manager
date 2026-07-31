import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createSalonStore } from "../../lib/salon-store";
import type { JsonValue } from "../../lib/salon-domain";
import { CustomersPage } from "./customers-page";

function page(store = createSalonStore(":memory:"), props: Partial<React.ComponentProps<typeof CustomersPage>> = {}) {
  const snapshot = store.snapshot();
  return renderToStaticMarkup(<CustomersPage
    bookings={snapshot.records.bookings ?? []}
    coupons={snapshot.records["customer-coupons"] ?? []}
    customers={snapshot.records.customers ?? []}
    ledger={snapshot.ledger}
    messages={snapshot.records.messages ?? []}
    products={snapshot.records["product-sales"] ?? []}
    settings={snapshot.settings}
    waitingCustomers={snapshot.records["waiting-customers"] ?? []}
    {...props}
  />);
}

function listRows(html: string) {
  return [...html.matchAll(/data-customer-row="([^"]+)"/g)].map((match) => match[1]);
}

describe("CustomersPage", () => {
  it("renders linked booking, ledger, product, point, coupon, and message histories", () => {
    const html = page(undefined, { selectedCustomerId: "customer-seed-1" });

    expect(html).toContain('data-selected-customer-payment="customer-seed-1"');
    expect(html).toContain('/sales?tab=payment&amp;customer=customer-seed-1');

    expect(html).toContain("2026-07-31T10:00:00.000Z · 커트 · confirmed");
    expect(html).toContain("2026-07-24 · 결제 · ₩10,480,000");
    expect(html).toContain("헤어 오일 · ₩28,000");
    expect(html).toContain("2026-07-24 · 1,000P");
    expect(html).toContain("클리닉 5회 · 잔액 ₩250,000");
    expect(html).toContain("SMS · dry-run");
  });

  it("filters selected grade, group, gender, motive, ledger-sales, and activity criteria", () => {
    const store = createSalonStore(":memory:");
    const first = store.get("customers", "customer-seed-1")!;
    const second = store.get("customers", "customer-seed-2")!;
    store.save("customers", first.id, { ...(first.value as Record<string, JsonValue>), grade: "VIP2", group: "충성", motive: "소개" }, "원장");
    store.save("customers", second.id, { ...(second.value as Record<string, JsonValue>), grade: "일반", group: "신규", motive: "검색" }, "원장");
    store.save("customers", "customer-idle", { name: "미방문", phone: "01011112222", telephone: "", phoneAbsent: false, smsOptIn: true, points: 0, gender: "female", operator: "원장" }, "원장");

    for (const [segment, segmentValue, expected] of [["grade", "VIP2", ["customer-seed-1"]], ["group", "신규", ["customer-seed-2"]], ["gender", "female", ["customer-seed-1", "customer-idle"]], ["motive", "소개", ["customer-seed-1"]]] as const) {
      expect(listRows(page(store, { segment, segmentValue }))).toEqual(expected);
    }
    expect(listRows(page(store, { segment: "sales", salesThreshold: "15000000" }))).toEqual(["customer-seed-1"]);
    expect(listRows(page(store, { segment: "recent", today: new Date("2026-08-05T00:00:00.000Z") }))).toEqual(["customer-seed-1", "customer-seed-2"]);
    expect(listRows(page(store, { segment: "nonvisit", today: new Date("2026-08-05T00:00:00.000Z") }))).toEqual(["customer-idle"]);
  });

  it("renders distinct server-selected printable layouts and a native print control", () => {
    const contact = page(undefined, { printLayout: "1" });
    const membership = page(undefined, { printLayout: "2" });
    const loyalty = page(undefined, { printLayout: "4" });

    expect(contact).toContain('data-print-layout="1"');
    expect(contact).toContain("<th>휴대전화</th>");
    expect(membership).toContain('data-print-layout="2"');
    expect(membership).toContain("<th>등급</th>");
    expect(membership).not.toContain("<th>휴대전화</th>");
    expect(loyalty).toContain("<th>패밀리 번호</th>");
    expect(loyalty).toContain("현재 양식 인쇄");
  });

  it("renders usable customer policy choices and selected-customer bulk controls", () => {
    const store = createSalonStore(":memory:");
    store.saveSettings({ customerGroups: "충성, 신규", customerGrades: "일반, VIP2", visitMotives: "소개, 검색" }, "원장");
    const html = page(store, { showNew: true });

    expect(html).toContain('name="customerIds"');
    expect(html).toContain('name="bulkGroup"');
    expect(html).toContain('name="bulkGrade"');
    expect(html).toContain('value="충성"');
    expect(html).toContain(">VIP2<");
    expect(html).toContain('list="visit-motives"');
  });

  it("uses persisted power policy and KST current-month birthday scope", () => {
    const store = createSalonStore(":memory:");
    store.saveSettings({ powerCustomerMinPoints: 500 }, "원장");
    store.save("customers", "birthday-august", { name: "팔월 생일", phone: "01022223333", telephone: "", phoneAbsent: false, smsOptIn: true, points: 200, birthday: "2000-08-10", operator: "원장" }, "원장");
    store.save("customers", "birthday-september", { name: "구월 생일", phone: "01044445555", telephone: "", phoneAbsent: false, smsOptIn: true, points: 700, birthday: "2000-09-10", operator: "원장" }, "원장");

    expect(listRows(page(store, { segment: "power" }))).toEqual(["birthday-september"]);
    expect(listRows(page(store, { segment: "birthday", today: new Date("2026-08-05T00:00:00.000Z") }))).toEqual(["birthday-august"]);
  });

  it("applies registration SMS and calendar policies only to new customers", () => {
    const store = createSalonStore(":memory:");
    store.saveSettings({ defaultSmsOptIn: false, birthdayCalendar: "lunar" }, "원장");
    const newHtml = page(store, { showNew: true });
    const existingHtml = page(store, { selectedCustomerId: "customer-seed-1" });

    expect(newHtml).toContain('<option value="off" selected="">수신 거부</option>');
    expect(newHtml).toContain('type="radio" name="birthdayCalendar" checked="" value="lunar"');
    expect(existingHtml).toContain('<option value="on" selected="">수신 동의</option>');
    expect(existingHtml).toContain('type="radio" name="birthdayCalendar" checked="" value="solar"');
  });
});
