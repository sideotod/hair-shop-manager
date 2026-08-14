import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

function activeLabels(html: string) {
  return [...html.matchAll(/<a[^>]*aria-current="page"[^>]*>(?:<span[^>]*><\/span>)?([^<]*)</g)].map((match) => match[1]);
}

describe("AppShell", () => {
  it("uses the Figma navigation groups instead of a flat menu", () => {
    const html = renderToStaticMarkup(<AppShell pathname="/sales"><main>content</main></AppShell>);

    expect(html).toContain("운영");
    expect(html).toContain("정산");
    expect(html).toContain("관리");
    expect(html).not.toContain('href="/sales">매출 분석</a>');
  });

  it("derives the active menu and header title from the pathname alone", () => {
    const sales = renderToStaticMarkup(<AppShell pathname="/sales"><main /></AppShell>);
    const transactions = renderToStaticMarkup(<AppShell pathname="/sales/transactions"><main /></AppShell>);
    const customers = renderToStaticMarkup(<AppShell pathname="/customers"><main /></AppShell>);

    expect(activeLabels(sales)).toEqual(["매출"]);
    // 하위 경로는 사이드바에서 부모를 강조하되 `aria-current` 는 하위 항목 하나만 가진다 —
    // 한 화면에 둘이면 보조 기술이 현재 위치를 두 번 말한다. 제목은 자기 것을 쓴다.
    expect(activeLabels(transactions)).toEqual(["거래 기록"]);
    expect(transactions).toContain("거래 기록");
    expect(activeLabels(customers)).toEqual(["고객"]);
    expect(customers).toContain("고객 관리");
  });

  /**
   * 설정 구역은 사이드바에서 편다. 예전에 이 자리를 비운 이유는 설정 화면 안 좌측 레일이
   * 같은 목록을 또 그렸기 때문인데, 그 레일을 없앴으므로 목록은 다시 한 벌이다.
   * 목록이 두 벌이 되면 이 테스트가 아니라 `settings-page.test.tsx` 의 레일 부재 검사가 잡는다.
   */
  it("expands the settings sections in the sidebar and marks the active one", () => {
    const html = renderToStaticMarkup(<AppShell pathname="/settings"><main /></AppShell>);

    for (const label of ["계정 설정", "고객 정책", "결제 정책", "시술 가격", "외부 연동", "도움말 · 공지"]) expect(html).toContain(`>${label}<`);
    // 지운 두 구역은 어디에도 없다.
    for (const label of ["메모·상태값", "문자 자동화"]) expect(html).not.toContain(label);
    // `?section=` 이 없으면 첫 구역이 활성이다. 설정 줄 자체는 활성 표시를 하위 항목에 넘긴다 —
    // 한 화면에 `aria-current="page"` 가 둘이면 보조 기술이 현재 위치를 두 번 말한다.
    expect(activeLabels(html)).toEqual(["계정 설정"]);
    expect(html).toContain('href="/settings?section=booking"');
    // 헤더 바로가기는 계속 섹션으로 깊게 들어간다.
    expect(html).toContain('href="/settings?section=help"');
    expect(html).toContain('href="/settings?section=owner"');
  });

  /** 설정 밖에서는 하위 목록을 접는다. 늘 펼쳐 두면 7줄이 매장 카드를 화면 밖으로 민다. */
  it("hides the settings sections on every other route", () => {
    const html = renderToStaticMarkup(<AppShell pathname="/sales"><main /></AppShell>);

    expect(html).not.toContain('aria-label="설정 구역"');
    expect(html).not.toContain("계정 설정");
    expect(activeLabels(html)).toEqual(["매출"]);
  });

  /**
   * 거래 기록은 매출과 목적이 다른 독립 화면이다 — 하나는 읽고(분석), 하나는 고친다(환불·정정).
   * 그래서 매출 안에 숨기지 않고 사이드바에 편다. 다만 **매출에 있을 때만** 편다:
   * 설정 구역과 같은 규칙이라 두 벌로 만들지 않았다(`childNavigationItems`).
   */
  it("expands the sales sub-menu only inside the sales area", () => {
    const sales = renderToStaticMarkup(<AppShell pathname="/sales"><main /></AppShell>);
    const transactions = renderToStaticMarkup(<AppShell pathname="/sales/transactions"><main /></AppShell>);
    const customers = renderToStaticMarkup(<AppShell pathname="/customers"><main /></AppShell>);

    expect(sales).toContain('href="/sales/transactions"');
    // 하위 경로에 있어도 부모가 활성이라 목록은 계속 보인다 — 들어가자마자 메뉴가 사라지면 길을 잃는다.
    expect(transactions).toContain('href="/sales/transactions"');
    expect(customers).not.toContain('href="/sales/transactions"');
    // 거래 기록은 자기 `group` 이 없다. 최상위 줄로 두 번 그려지면 안 된다.
    expect(sales.match(/href="\/sales\/transactions"/g)).toHaveLength(1);
  });

  /** 셸 크롬 검증은 원래 대시보드 테스트에 있었다. 셸이 레이아웃으로 올라갔으니 여기가 제자리다. */
  it("renders the shell chrome once for every route", () => {
    const html = renderToStaticMarkup(<AppShell ownerName="사용자" pathname="/"><main /></AppShell>);

    expect(html).toContain("HAIRHAEYO");
    expect(html).toContain("SALON LEDGER");
    expect(html).toContain("헤어해요");
    expect(html).toContain("사용자님");
    expect(html).not.toContain("사용자 사용자님");
    // 사이드바 6항목. `/operations` 는 저장소 기준으로 갈라져 사라졌다 (설계 §5.2).
    for (const label of ["운영 현황", "고객", "예약", "매출", "문자", "설정"]) expect(html).toContain(`>${label}<`);
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
    // 로그아웃은 계정 설정으로 갔다 (`components/settings/settings-page.tsx`). 매장 카드는 상호와 영업시간만 남는다.
    expect(html).not.toContain("로그아웃");
    expect(html).toContain("min-h-screen w-full");
    expect(html).not.toContain("min-w-[1280px]");
  });
});
