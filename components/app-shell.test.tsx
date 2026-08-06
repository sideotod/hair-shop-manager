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
});
