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

    expect(activeLabels(sales)).toEqual(["매출·결제"]);
    // 하위 경로는 사이드바에서 부모를 활성으로 두되 제목은 자기 것을 쓴다.
    expect(activeLabels(transactions)).toEqual(["매출·결제"]);
    expect(transactions).toContain("거래 기록");
    expect(activeLabels(customers)).toEqual(["고객"]);
    expect(customers).toContain("고객 관리");
  });

  /** 셸 크롬 검증은 원래 대시보드 테스트에 있었다. 셸이 레이아웃으로 올라갔으니 여기가 제자리다. */
  it("renders the shell chrome once for every route", () => {
    const html = renderToStaticMarkup(<AppShell ownerName="원장" pathname="/" settings={{ smsRemaining: 500 }}><main /></AppShell>);

    expect(html).toContain("HAIRHAEYO");
    expect(html).toContain("SALON LEDGER");
    expect(html).toContain("헤어해요");
    expect(html).toContain("원장님");
    expect(html).not.toContain("원장 원장님");
    for (const label of ["운영 현황", "고객", "예약", "매출·결제", "문자", "운영 설정", "설정"]) expect(html).toContain(`>${label}<`);
    expect(html).not.toContain(">상품·쿠폰<");
    for (const mode of ["핸드폰 뒷번호/고객명", "닉네임", "전화번호 뒷번호", "그룹명", "메모", "주소", "방문동기", "이메일", "포인트 카드", "패밀리번호"]) expect(html).toContain(`>${mode}<`);
    expect(html.match(/<option value=/g)).toHaveLength(10);
    expect(html).toContain("SMS 500");
    expect(html).toContain("도움말");
    expect(html).toContain("로그아웃");
    expect(html).toContain("min-h-screen w-full");
    expect(html).not.toContain("min-w-[1280px]");
  });
});
