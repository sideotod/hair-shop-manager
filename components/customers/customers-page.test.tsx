import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createSalonStore } from "../../lib/salon-store";
import type { JsonValue } from "../../lib/salon-domain";
import { CustomersPage } from "./customers-page";

function page(store = createSalonStore(":memory:"), props: Partial<React.ComponentProps<typeof CustomersPage>> = {}) {
  const snapshot = store.snapshot();
  return renderToStaticMarkup(<CustomersPage
    bookings={snapshot.records.bookings ?? []}
    customers={snapshot.records.customers ?? []}
    ledger={snapshot.ledger}
    messages={snapshot.records.messages ?? []}
    settings={snapshot.settings}
    waitingCustomers={snapshot.records["waiting-customers"] ?? []}
    {...props}
  />);
}

function listRows(html: string) {
  return [...html.matchAll(/data-customer-row="([^"]+)"/g)].map((match) => match[1]);
}

describe("CustomersPage", () => {
  it("keeps the customer workspace scrollable only inside its two panes", () => {
    const html = page();
    const styles = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(html).toContain('data-customer-list');
    expect(html).toContain('aria-label="고객 상세"');
    expect(styles).toContain('main:has([data-customer-list]) [data-customer-list]');
    expect(styles).not.toContain('main:has([data-customer-list]) { overflow: auto; }');
  });

  it("omits product and coupon customer-history surfaces", () => {
    const html = page(undefined, { selectedCustomerId: "customer-seed-1" });

    expect(html).not.toContain("상품");
    expect(html).not.toContain("쿠폰");
  });

  it("renders linked booking, ledger, point, and message histories", () => {
    const html = page(undefined, { selectedCustomerId: "customer-seed-1" });

    expect(html).toContain('data-selected-customer-payment="customer-seed-1"');
    expect(html).toContain('/sales?tab=payment&amp;customer=customer-seed-1');

    expect(html).toContain("2026-07-31T10:00:00.000Z · 커트 · confirmed");
    expect(html).toContain("2026-07-24 · 결제 · ₩10,480,000");
    expect(html).toContain("2026-07-24 · 1,000P");
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

  it("applies default gender only to new customers", () => {
    const store = createSalonStore(":memory:");
    store.saveSettings({ defaultGender: "male" }, "원장");

    const newHtml = page(store, { showNew: true });
    const existingHtml = page(store, { selectedCustomerId: "customer-seed-1" });

    expect(newHtml).toContain('<option value="male" selected="">남성</option>');
    expect(existingHtml).toContain('<option value="female" selected="">여성</option>');
  });
  it("closes registration without losing the current customer filters", () => {
    const html = page(undefined, { mode: "phone", query: "010", segment: "sales", salesThreshold: "500000", showNew: true });

    expect(html).toContain('data-dialog-close="true"');
    expect(html).toContain('/customers?mode=phone&amp;query=010&amp;segment=sales&amp;salesThreshold=500000');
  });

  it("closes registration back onto the selected customer", () => {
    const html = page(undefined, { mode: "phone", query: "010", selectedCustomerId: "customer-seed-1", showNew: true });
    const close = html.match(/<a\b[^>]*data-dialog-close="true"[^>]*>/)?.[0].match(/href="([^"]+)"/)?.[1] ?? "";

    expect(close).toContain("customer=customer-seed-1");
    expect(close).not.toContain("new=1");
  });

  // 858명을 한 화면에 흘리던 목록을 서버에서 자른다. 인쇄 양식만 전량을 유지한다.
  it("pages the list, clamps out-of-range pages, and still prints every customer", () => {
    const store = createSalonStore(":memory:");
    const many = Array.from({ length: 120 }, (_, index) => ({
      id: `bulk-${index}`, kind: "customers" as const, value: { name: `고객${index}`, phone: `010-0000-${String(index).padStart(4, "0")}` },
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", archivedAt: null,
    }));

    const first = page(store, { customers: many });
    const third = page(store, { customers: many, page: "3" });
    const beyond = page(store, { customers: many, page: "999" });
    const garbage = page(store, { customers: many, page: "abc" });

    expect(listRows(first)).toHaveLength(50);
    expect(listRows(first)[0]).toBe("bulk-0");
    expect(listRows(third)).toHaveLength(20);
    // 범위를 벗어난 페이지는 빈 목록이 아니라 마지막 페이지로 접힌다.
    expect(listRows(beyond)).toEqual(listRows(third));
    expect(listRows(garbage)).toEqual(listRows(first));
    expect(first).toContain('aria-label="고객 목록 페이지"');
    // 첫 페이지의 "이전"은 링크가 아니라 비활성 표시여야 한다.
    expect(first).toContain('aria-disabled="true"');
    expect(first).toContain("page=2");
    // 인쇄 표는 페이지와 무관하게 전량이다. 1페이지 HTML 에도 마지막 고객이 들어 있어야 한다.
    expect(listRows(first)).not.toContain("bulk-119");
    expect(first).toContain("고객119");
  });

  it("carries the active filters across pages and drops the open modal", () => {
    const store = createSalonStore(":memory:");
    const many = Array.from({ length: 120 }, (_, index) => ({
      id: `bulk-${index}`, kind: "customers" as const, value: { name: `고객${index}`, phone: `010-0000-${String(index).padStart(4, "0")}` },
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", archivedAt: null,
    }));
    const html = page(store, { customers: many, mode: "name", query: "고객", searchParams: { mode: "name", query: "고객", new: "1" }, showNew: true });
    const next = html.match(/href="([^"]*page=2[^"]*)"/)?.[1] ?? "";

    expect(next).toContain("mode=name");
    expect(next).not.toContain("new=1");
  });

  // 일괄 수정 체크박스와 페이지 링크가 같은 폼 안에 있다. 페이지를 넘기면 체크가 조용히 풀리므로 미리 알린다.
  it("warns that checked customers are cleared when paging", () => {
    const store = createSalonStore(":memory:");
    const many = Array.from({ length: 120 }, (_, index) => ({
      id: `bulk-${index}`, kind: "customers" as const, value: { name: `고객${index}`, phone: `010-0000-${String(index).padStart(4, "0")}` },
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", archivedAt: null,
    }));

    expect(page(store, { customers: many })).toContain("체크한 고객은 페이지를 넘기면 해제됩니다.");
    // 페이지가 하나뿐이면 넘길 곳이 없으니 경고도 없다.
    expect(page(store)).not.toContain("체크한 고객은 페이지를 넘기면 해제됩니다.");
  });
});
