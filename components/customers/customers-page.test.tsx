import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { customerCode } from "../../lib/customer-code";
import type { JsonValue } from "../../lib/salon-domain";
import { createSalonStore } from "../../lib/salon-store";
import { CustomersPage } from "./customers-page";

function page(store = createSalonStore(":memory:"), props: Partial<React.ComponentProps<typeof CustomersPage>> = {}) {
  const snapshot = store.snapshot();
  return renderToStaticMarkup(<CustomersPage
    bookings={snapshot.records.bookings ?? []}
    customers={snapshot.records.customers ?? []}
    ledger={snapshot.ledger}
    messages={snapshot.records.messages ?? []}
    requestKey="test-request-key"
    settings={snapshot.settings}
    defaultDate="2026-08-13"
    defaultTime="14:37"
    {...props}
  />);
}

function listRows(html: string) {
  return [...html.matchAll(/data-customer-row="([^"]+)"/g)].map((match) => match[1]);
}

function many(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `bulk-${index}`, kind: "customers" as const, value: { name: `고객${String(index).padStart(3, "0")}`, phone: `010-0000-${String(index).padStart(4, "0")}` },
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", archivedAt: null,
  }));
}

describe("CustomersPage", () => {
  it("keeps the customer workspace scrollable only inside its two panes", () => {
    const html = page();
    const styles = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(html).toContain("data-customer-list");
    expect(html).toContain('aria-label="고객 상세"');
    // 두 칸이 같은 높이로 서려면 `main` 이 먼저 확정된 높이를 가져야 한다.
    expect(styles).toContain("main:has([data-customer-list])");
    expect(styles).toContain("height: calc(100dvh - 72px)");
  });

  it("drops the deleted waiting, segment, and bulk surfaces", () => {
    const html = page(undefined, { selectedCustomerId: "customer-seed-1" });

    for (const gone of ["대기 고객", "대기 등록", "고객 정책", "파워 고객", "방문동기", "고객 보관", 'name="customerIds"', 'name="bulkGrade"']) {
      expect(html).not.toContain(gone);
    }
  });

  it("shows the display-only customer code, hyphenated phone, and one action row", () => {
    const store = createSalonStore(":memory:");
    const seed = store.get("customers", "customer-seed-1")!;
    store.save("customers", seed.id, { ...(seed.value as Record<string, JsonValue>), phone: "01012345678" }, "사용자");
    const html = page(store, { selectedCustomerId: "customer-seed-1" });

    expect(html).toContain(customerCode("customer-seed-1"));
    // 저장은 숫자만, 표시는 하이픈이다. 사용자가 그대로 읽어 전화를 건다.
    expect(html).toContain("010-1234-5678");
    expect(html).toContain('data-selected-customer-payment="customer-seed-1"');
    expect(html).toContain("선결제 충전");
    expect(html).toContain("고객 정보 변경");
  });

  // 다섯 구역을 전부 펼치면 상세 칸이 목록보다 세 배 길어져 두 칸 높이가 어긋난다.
  // 고객을 고르면 먼저 나오는 것은 그 사람이 누구인가(기본 정보)다 — 돈 이야기는 그다음이다.
  it("renders only the selected detail tab, starting at the profile", () => {
    const profile = page(undefined, { selectedCustomerId: "customer-seed-1" });
    const ledger = page(undefined, { selectedCustomerId: "customer-seed-1", tab: "ledger" });
    const bookings = page(undefined, { selectedCustomerId: "customer-seed-1", tab: "bookings" });

    expect(profile).toContain("기본 정보");
    expect(profile).not.toContain("시술·결제 이력");
    expect(ledger).toContain("2026-07-24 · 컬러 · ₩10,480,000");
    expect(ledger).not.toContain("예약 이력이");
    expect(bookings).toContain("2026-07-31 10:00 · 커트 · confirmed");
    expect(bookings).not.toContain("시술·결제 이력이");
    expect(page(undefined, { selectedCustomerId: "customer-seed-1", tab: "points" })).toContain("2026-07-24 · 1,000P");
    expect(page(undefined, { selectedCustomerId: "customer-seed-1", tab: "messages" })).toContain("SMS · dry-run");
  });

  /**
   * 옮겨온 고객은 `2020-02-18T12:00:00.000Z` 처럼 시각까지 들고 있다. 그 정오는 가져오기가
   * 만든 자리표시자라 아무 뜻이 없다 — 화면에 두면 사용자가 방문 시각으로 읽는다.
   */
  it("shows the first visit as a date only and names an empty memo", () => {
    const store = createSalonStore(":memory:");
    const seed = store.get("customers", "customer-seed-1")!;
    store.save("customers", seed.id, { ...(seed.value as Record<string, JsonValue>), joinedAt: "2020-02-18T12:00:00.000Z", memo: "  " }, "사용자");
    const html = page(store, { selectedCustomerId: "customer-seed-1" });

    expect(html).toContain("2020-02-18");
    expect(html).not.toContain("12:00:00");
    expect(html).toContain(">없음<");
  });

  // 식별자는 이름보다 작고 늦게 읽힌다. 제목 줄에 끼면 이름과 같은 무게로 보인다.
  it("puts the customer code on the eyebrow line", () => {
    expect(page(undefined, { selectedCustomerId: "customer-seed-1" })).toContain(`선택 고객 · ${customerCode("customer-seed-1")}`);
  });

  /** 사용자가 실제로 치는 건 둘뿐이다 — "김하늘" 아니면 "5678". 모드 선택칸을 두지 않는다. */
  it("searches by name for text and by trailing phone digits for numbers", () => {
    const store = createSalonStore(":memory:");
    const seed = store.get("customers", "customer-seed-1")!;
    store.save("customers", seed.id, { ...(seed.value as Record<string, JsonValue>), phone: "01012345678" }, "사용자");

    expect(listRows(page(store, { query: "김하늘" }))).toEqual(["customer-seed-1"]);
    expect(listRows(page(store, { query: "5678" }))).toEqual(["customer-seed-1"]);
    // 앞자리는 맞지 않는다. 뒷자리 검색이어야 "010" 이 전부를 부르지 않는다.
    expect(listRows(page(store, { query: "010" }))).toEqual([]);
    expect(listRows(page(store, { query: "없는이름" }))).toEqual([]);
  });

  it("sorts by name, join date, and last visit", () => {
    const store = createSalonStore(":memory:");
    const customers = [
      { id: "sort-b", kind: "customers" as const, value: { name: "나고객", phone: "01000000002", joinedAt: "2026-01-05" }, createdAt: "", updatedAt: "", archivedAt: null },
      { id: "sort-a", kind: "customers" as const, value: { name: "가고객", phone: "01000000001", joinedAt: "2026-03-09" }, createdAt: "", updatedAt: "", archivedAt: null },
    ];

    expect(listRows(page(store, { customers }))).toEqual(["sort-a", "sort-b"]);
    expect(listRows(page(store, { customers, sort: "joined" }))).toEqual(["sort-a", "sort-b"]);
    expect(listRows(page(store, { customers, sort: "visit", lastVisits: new Map([["sort-b", "2026-08-01"], ["sort-a", "2026-02-01"]]) }))).toEqual(["sort-b", "sort-a"]);
  });

  // 목록 칸은 화면 높이에 고정된다. 페이지 크기도 그 안에 들어가는 만큼(실측 9행)이어야 또 스크롤하지 않는다.
  it("pages the list to what fits the pane and clamps out-of-range pages", () => {
    const store = createSalonStore(":memory:");
    const customers = many(30);

    const first = page(store, { customers });
    const fourth = page(store, { customers, page: "4" });

    expect(listRows(first)).toHaveLength(9);
    expect(listRows(first)[0]).toBe("bulk-0");
    expect(listRows(fourth)).toHaveLength(3);
    expect(listRows(page(store, { customers, page: "999" }))).toEqual(listRows(fourth));
    expect(listRows(page(store, { customers, page: "abc" }))).toEqual(listRows(first));
    expect(first).toContain('aria-label="고객 목록 페이지"');
    // 첫 페이지의 "이전"은 링크가 아니라 비활성 표시여야 한다.
    expect(first).toContain('aria-disabled="true"');
    expect(first).toContain("page=2");
  });

  it("carries the active search and sort across pages and drops the open modal", () => {
    const store = createSalonStore(":memory:");
    const html = page(store, { customers: many(30), query: "고객", sort: "joined", searchParams: { query: "고객", sort: "joined", new: "1" }, showNew: true });
    const next = html.match(/href="([^"]*page=2[^"]*)"/)?.[1] ?? "";

    expect(next).toContain("query=%EA%B3%A0%EA%B0%9D");
    expect(next).toContain("sort=joined");
    expect(next).not.toContain("new=1");
  });

  it("closes every popup back onto the selected customer without losing filters", () => {
    for (const open of [{ showNew: true }, { editCustomerId: "customer-seed-1" }, { payCustomerId: "customer-seed-1" }, { showPrepaid: true }]) {
      const html = page(undefined, { query: "김", selectedCustomerId: "customer-seed-1", ...open });
      const close = html.match(/<a\b[^>]*data-dialog-close="true"[^>]*>/)?.[0].match(/href="([^"]+)"/)?.[1] ?? "";

      expect(html).toContain('data-dialog-panel="true"');
      expect(close).toContain("customer=customer-seed-1");
      expect(close).toContain("query=");
      for (const key of ["new=", "edit=", "pay=", "prepaid="]) expect(close).not.toContain(key);
    }
  });

  // 전역 패널 폭은 `min(1120px,100%)` 다. 세로로 선 폼을 그 폭에 두면 라벨과 입력칸이 한 뼘씩 벌어진다.
  // 고객 등록만 `!w-auto` 다 — 중복 확인 패널이 옆으로 펴질 때 패널이 안쪽 폭을 따라가야 하기 때문이다.
  it("narrows both popups, giving the payment form a little more room", () => {
    expect(page(undefined, { showNew: true })).toContain("!w-auto");
    expect(page(undefined, { payCustomerId: "customer-seed-1" })).toContain("!w-[560px]");
  });

  it("registers with six fields and never offers prepaid on the edit form", () => {
    const create = page(undefined, { showNew: true });
    const edit = page(undefined, { editCustomerId: "customer-seed-1" });

    for (const field of ["name", "gender", "phone", "joinedAt", "prepaidWon", "memo"]) expect(create).toContain(`name="${field}"`);
    for (const gone of ["telephone", "birthday", "address", "email", "nickname", "grade", "group", "motive", "pointCard", "familyNumber", "initialBookingDate", "registerWaiting"]) {
      expect(create).not.toContain(`name="${gone}"`);
    }
    // 잔액을 덮어쓰면 원장에 없는 돈이 생긴다. 수정 화면에는 칸 자체가 없다.
    expect(edit).not.toContain('name="prepaidWon"');
  });

  it("applies the default gender only to new customers", () => {
    const store = createSalonStore(":memory:");
    store.saveSettings({ defaultGender: "male" }, "사용자");

    expect(page(store, { showNew: true })).toContain('<option value="male" selected="">남성</option>');
    expect(page(store, { editCustomerId: "customer-seed-1" })).toContain('<option value="female" selected="">여성</option>');
  });

  /** 결제 팝업은 고객이 이미 정해져 있다. 물을 필요가 없는 칸은 숨은 값으로 보낸다. */
  it("prefills the payment popup and omits the fields the customer record already answers", () => {
    const html = page(undefined, { payCustomerId: "customer-seed-1" });

    expect(html).toContain('name="memberType" value="member"');
    expect(html).toContain('name="customerId" value="customer-seed-1"');
    expect(html).toContain('name="requestKey" value="test-request-key"');
    expect(html).toContain('name="occurredDate" value="2026-08-13"');
    for (const gone of ["nonMemberName", "generalNote", "medicineNote", "scalpNote", "hairNote", "smsRequested"]) {
      expect(html).not.toContain(`name="${gone}"`);
    }
    // 결제수단 8칸은 그대로 남는다 — `finance.ts` 가 전부를 읽는다.
    expect(html).toContain('name="payment_cash"');
    expect(html).toContain('name="payment_prepaid"');
  });
});
