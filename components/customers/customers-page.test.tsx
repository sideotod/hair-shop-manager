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
    const legacyMessagesTab = page(undefined, { selectedCustomerId: "customer-seed-1", tab: "messages" });
    expect(legacyMessagesTab).toContain("고객 정보");
    for (const hidden of [">문자<", "문자 수신", "SMS · dry-run", "/messages"]) expect(legacyMessagesTab).not.toContain(hidden);
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
    expect(html).toContain("메모가 없습니다");
  });

  /**
   * 두 칸은 같은 높이로 서는데 기본정보는 4행뿐이라 720px 칸 아래 385px 가 비어 있었다
   * (1440×900 실측) — 덜 그려진 화면처럼 읽혔다. 메모칸이 남은 높이를 가져가 그 자리를 채운다.
   *
   * 높이는 `flex-1` 사슬로 만들어진다. 한 고리라도 끊기면 메모칸이 내용 높이로 접히고
   * 빈 자리가 돌아온다 — `h-full`(백분율)로 썼을 때 실제로 195px 로 접혔다.
   */
  it("stretches the memo panel so the profile tab fills the fixed detail height", () => {
    const html = page(undefined, { selectedCustomerId: "customer-seed-1" });

    // 상세 칸 바깥 껍데기: 칸 높이를 물려받아야 안쪽이 나눠 가질 높이가 생긴다.
    expect(html).toContain("flex min-h-full flex-col");
    // 탭 본문과 기본정보 묶음, 메모칸까지 `flex-1` 이 이어져야 한다.
    expect(html).toContain("mt-5 flex min-h-0 flex-1 flex-col");
    expect(html).toContain("mt-2 min-h-0 flex-1 whitespace-pre-wrap");
    // 스크롤 상자는 `aside` 하나다. 메모칸에도 걸면 어느 쪽이 움직일지 알 수 없다.
    expect(html).not.toContain("dialog-scroll mt-2");
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

  /**
   * `?customer=` 없이 들어오면 목록 첫 줄이 펴진다. 예전에는 오른쪽 절반이 "선택하면 보입니다"
   * 한 줄로 비어 있어, 무엇을 볼 수 있는 화면인지 알려면 클릭이 한 번 필요했다.
   * 기준은 **지금 정렬** 이다 — `customers` 원본 순서가 아니라 `sorted[0]`. 이름순과 등록일순이
   * 서로 다른 고객을 펴는지 함께 확인한다. URL 은 그대로다(자동 선택은 화면에서만 일어난다).
   */
  it("opens the first row of the current sort when no customer is chosen", () => {
    const customers = many(3);
    const byName = page(createSalonStore(":memory:"), { customers });
    const byJoined = page(createSalonStore(":memory:"), {
      customers: customers.map((record, index) => ({ ...record, value: { ...record.value, joinedAt: `2026-0${index + 1}-01` } })),
      sort: "joined",
    });

    // 이름순: 고객000. 등록일순은 내림차순이라 마지막에 등록한 고객002 가 먼저다.
    expect(byName.slice(byName.indexOf('data-customer-row="bulk-0"'))).toContain('aria-current="true"');
    expect(byJoined.slice(byJoined.indexOf('data-customer-row="bulk-2"'))).toContain('aria-current="true"');
    // 빈 상태 문구는 사라졌다 — 자동 선택 뒤에는 나올 자리가 없다.
    expect(byName).not.toContain("목록에서 고객을 선택하면");
    // 고객이 하나도 없을 때만 빈 상태가 남는다.
    expect(page(createSalonStore(":memory:"), { customers: [] })).toContain("등록된 고객이 없습니다");
  });

  /**
   * 선택 행은 hover 와 **다른 언어**를 써야 한다. 예전에는 둘 다 `bg-[var(--background)]` 라
   * 선택한 고객과 마우스가 지나가는 고객이 화면상 같았다. 색 하나로만 가르지 않으려고
   * 좌측 바(사이드바 활성 항목과 같은 어법)와 `aria-current` 를 함께 둔다 — 색각 이상과 보조 기술 양쪽.
   * `aria-current` 는 `"page"` 가 아니다. 상세 탭 nav 가 이미 `"page"` 를 쓰므로 한 화면에 둘이 되면
   * 보조 기술이 현재 위치를 두 번 말한다(`app-shell.test.tsx` 와 같은 규칙).
   */
  it("marks the selected row with more than a background colour", () => {
    const store = createSalonStore(":memory:");
    const customers = many(30);
    const html = page(store, { customers, selectedCustomerId: "bulk-2", searchParams: { customer: "bulk-2" } });
    const row = html.slice(html.indexOf('data-customer-row="bulk-2"'));

    expect(row).toContain('aria-current="true"');
    expect(row).toContain("bg-[var(--brand-soft)]");
    expect(row).toContain("w-[2px] rounded-[1px] bg-[var(--brand)]");
    // 선택 배경은 한 행만 갖는다. hover 는 여전히 `--background` 라 둘이 겹치지 않는다.
    expect(html.match(/bg-\[var\(--brand-soft\)\]/g)).toHaveLength(1);
    expect(html).not.toContain('aria-current="page"><');
  });

  /**
   * 이름 위·번호 아래. 좌우로 갈라 두면 목록이 좁아질수록 둘 사이가 벌어져 어느 번호가
   * 어느 이름인지 눈이 한 번 더 움직였다. 오른쪽 상세 패널도 같은 순서다.
   * 56px 는 계산값이다 — 9행 × 56 = 504, 알약 여백 8 = 512 ≤ 519px(실측 스크롤 영역).
   * 이 값이 커지면 위 페이지 크기 검사(9행)와 함께 깨지므로 두 검사가 서로를 지킨다.
   */
  it("stacks the customer name over the phone number in a 56px row", () => {
    const html = page(createSalonStore(":memory:"), { customers: many(3) });

    expect(html).toContain('class="h-[56px]"');
    expect(html).toContain("flex h-full flex-col");
    expect(html).not.toContain("ml-auto shrink-0 text-xs tabular-nums");
  });

  /**
   * 구분선은 있되 **벽까지 가지 않는다**. 예전에는 선이 카드 테두리에 딱 붙어 벽에서 벽까지
   * 갔고, hover·선택 배경도 함께 붙어 행이 카드 **안**에 있는 게 아니라 카드를 덧칠한 것처럼
   * 보였다. 박스를 하나 더 두면 여백이 두 배(20+16)에 테두리가 3겹이 되므로, 대신 좌우 8px 을
   * 띄운다 — `divide-y` 는 `<li>` 에 걸리므로 선도 같이 물러난다.
   * 알약 어법은 사이드바 메뉴가 이미 쓴다(`app-shell.tsx`).
   *
   * 행 사이 gap 은 **없다**. 2px 씩만 줘도 8칸 16px 이 붙어 528 로 519px 를 넘긴다.
   * 여기서 `gap-` 이 들어오면 페이지 크기 검사(9행)가 함께 깨진다.
   */
  it("insets the row dividers instead of running them wall to wall", () => {
    const html = page(createSalonStore(":memory:"), { customers: many(3) });

    // 구분선과 좌우 여백이 같은 `<ul>` 에 있어야 선이 여백 안쪽에서 끝난다.
    expect(html).toContain("divide-y divide-[var(--border)] overflow-auto px-2 py-1");
    // 알약 모서리는 컨트롤 반경이다. 카드 반경(12px)을 쓰면 카드 안에 카드가 된다.
    expect(html).toContain("rounded-[var(--radius-control)] pl-4 pr-3");
    // 좌측 바는 알약 **안**으로 들어온다. `left-0` 이면 알약 모서리 밖에 떠 있다.
    expect(html).not.toContain("left-0 w-[2px]");
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
    for (const open of [{ showNew: true }, { editCustomerId: "customer-seed-1" }, { showPrepaid: true }]) {
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
  it("keeps customer management popups at their measured widths", () => {
    expect(page(undefined, { showNew: true })).toContain("!w-auto");
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

  it("opens the shared payment modal with a customer id while keeping this page as the background", () => {
    const html = page(undefined, { payCustomerId: "customer-seed-1" });
    expect(html).toContain("/customers?pay=1&amp;customer=customer-seed-1");
  });
});
