import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

function activeLabels(html: string) {
  return [...html.matchAll(/<a[^>]*aria-current="page"[^>]*>(?:<span[^>]*><\/span>)?([^<]*)</g)].map((match) => match[1]);
}

describe("AppShell", () => {
  it("renders the five primary destinations in a flat sidebar", () => {
    const html = renderToStaticMarkup(<AppShell pathname="/sales"><main>content</main></AppShell>);

    for (const label of ["운영 현황", "고객", "예약", "매출", "설정"]) expect(html).toContain(`>${label}<`);
    expect(html).not.toContain('href="/sales">매출 분석</a>');
  });

  it("keeps the sidebar as a flat five-item navigation", () => {
    const settings = renderToStaticMarkup(<AppShell pathname="/settings"><main /></AppShell>);
    const transactions = renderToStaticMarkup(<AppShell pathname="/sales/transactions"><main /></AppShell>);

    for (const label of ["운영", "정산", "관리", "SALON LEDGER", "영업중"]) expect(settings).not.toContain(`>${label}<`);
    expect(settings).not.toContain('aria-label="설정 구역"');
    expect(transactions).not.toContain('aria-label="매출 하위 메뉴"');
    expect(transactions).not.toContain('href="/sales/transactions"');
    expect(activeLabels(settings)).toEqual(["설정"]);
    expect(activeLabels(transactions)).toEqual(["매출"]);
  });

  it("derives the active menu and header title from the pathname alone", () => {
    const sales = renderToStaticMarkup(<AppShell pathname="/sales"><main /></AppShell>);
    const transactions = renderToStaticMarkup(<AppShell pathname="/sales/transactions"><main /></AppShell>);
    const customers = renderToStaticMarkup(<AppShell pathname="/customers"><main /></AppShell>);

    expect(activeLabels(sales)).toEqual(["매출"]);
    // 거래 기록은 매출의 맥락 작업이므로, 단순 사이드바에서는 매출만 현재 위치로 읽는다.
    expect(activeLabels(transactions)).toEqual(["매출"]);
    expect(transactions).toContain("거래 기록");
    expect(activeLabels(customers)).toEqual(["고객"]);
    expect(customers).toContain("고객 관리");
  });

  it("does not expand settings sections inside the flat sidebar", () => {
    const html = renderToStaticMarkup(<AppShell pathname="/settings"><main /></AppShell>);

    expect(activeLabels(html)).toEqual(["설정"]);
    expect(html).not.toContain('aria-label="설정 구역"');
    expect(html).not.toContain('href="/settings?section=booking"');
    expect(html).toContain('href="/settings?section=owner"');
  });

  /** 설정 밖에서는 하위 목록을 접는다. 늘 펼쳐 두면 7줄이 매장 카드를 화면 밖으로 민다. */
  it("hides the settings sections on every other route", () => {
    const html = renderToStaticMarkup(<AppShell pathname="/sales"><main /></AppShell>);

    expect(html).not.toContain('aria-label="설정 구역"');
    expect(html).not.toContain("계정 설정");
    expect(activeLabels(html)).toEqual(["매출"]);
  });

  it("keeps transaction history out of the sidebar", () => {
    const sales = renderToStaticMarkup(<AppShell pathname="/sales"><main /></AppShell>);
    const transactions = renderToStaticMarkup(<AppShell pathname="/sales/transactions"><main /></AppShell>);
    const customers = renderToStaticMarkup(<AppShell pathname="/customers"><main /></AppShell>);

    for (const html of [sales, transactions, customers]) expect(html).not.toContain('href="/sales/transactions"');
  });

  /** 셸 크롬 검증은 원래 대시보드 테스트에 있었다. 셸이 레이아웃으로 올라갔으니 여기가 제자리다. */
  it("renders the shell chrome once for every route", () => {
    const html = renderToStaticMarkup(<AppShell ownerName="사용자" pathname="/"><main /></AppShell>);

    expect(html).toContain("HAIRHAEYO");
    expect(html).not.toContain("SALON LEDGER");
    expect(html).not.toContain("헤어해요");
    expect(html).toContain("사용자님");
    expect(html).not.toContain("사용자 사용자님");
    // `/messages` 는 코드만 보존하고 메뉴에서는 제거했다. `/operations` 도 저장소 기준으로 갈라져 사라졌다 (설계 §5.2).
    for (const label of ["운영 현황", "고객", "예약", "매출", "설정"]) expect(html).toContain(`>${label}<`);
    expect(html).not.toContain('href="/messages"');
    expect(html).not.toContain(">문자<");
    expect(html).not.toContain(">운영 설정<");
    expect(html).not.toContain(">상품·쿠폰<");
    // 검색 기준 드롭다운은 없다. 남은 것은 검색어 한 칸뿐 — `/customers` 가 입력만 보고 이름/번호를 가른다.
    expect(html).toContain('placeholder="고객명 또는 휴대전화 뒷자리"');
    expect(html).not.toContain('name="mode"');
    expect(html.match(/<option value=/g)).toBeNull();
    // 헤더는 제목·검색·계정 셋뿐이다. 날짜·최근 고객·도움말·SMS 잔량은 각각 본문·검색칸·사이드바 설정·문자 화면에 이미 있었다.
    expect(html).not.toContain("SMS 500");
    expect(html).not.toContain("도움말");
    expect(html).not.toContain("최근 고객");
    // 로그아웃은 계정 설정에 있고, 사이드바에는 메뉴 이외의 카드가 없다.
    expect(html).not.toContain("로그아웃");
    expect(html).not.toContain("영업중");
    expect(html).toContain("min-h-screen w-full");
    expect(html).not.toContain("min-w-[1280px]");
  });

  it("draws the customer-search focus ring on the same 40px boundary as its click target", () => {
    const html = renderToStaticMarkup(<AppShell pathname="/"><main /></AppShell>);
    const search = html.match(/<form[^>]*role="search"[^>]*>/)?.[0] ?? "";
    const input = html.match(/<input[^>]*aria-label="고객 검색어"[^>]*>/)?.[0] ?? "";

    expect(search).toContain("h-10");
    expect(search).toContain('data-header-search="true"');
    expect(search).not.toContain("focus-within:ring");
    expect(input).toContain("h-full");
    expect(input).toContain('data-header-search-input="true"');
    expect(input).not.toContain("focus-visible:outline-2");
  });
});
