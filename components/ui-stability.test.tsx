import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";
import { ModalHost } from "./modal-host";

describe("UI stability", () => {
  it("keeps the shell chrome inside one token scope", () => {
    const html = renderToStaticMarkup(<AppShell pathname="/"><main>content</main></AppShell>);

    expect(html).toContain("data-app-shell-token-scope");
    expect(html).toContain('data-app-shell-background="true"');
    expect(html).toContain('data-app-content="true"');
  });

  it("renders overlays through the modal host so the background can be made inert", () => {
    // inert 는 useEffect 에서 붙는다. 서버 마크업에서는 오버레이 표식만 확인한다.
    const html = renderToStaticMarkup(<ModalHost label="고객 등록"><section role="dialog">overlay</section></ModalHost>);

    expect(html).toContain('data-app-overlay="true"');
    expect(html).toContain('aria-label="고객 등록"');
    expect(html).toContain('role="dialog"');
  });
});

describe("Sales workspace tab row", () => {
  /**
   * 문제 2 의 마지막 잔재. 탭 줄은 세 탭에서 **같은 세로 위치**에 있어야 한다.
   * 설명문 툴바가 탭 줄 앞뒤로 왔다갔다 하면 탭을 누를 때마다 줄이 위아래로 튄다.
   * 브라우저 실측: /sales y=156, ?tab=payment y=116, ?tab=expenses y=162.
   */
  it("puts the tab row first in the main content on every sales tab", async () => {
    const before = (html: string) => html.slice(0, html.indexOf('aria-label="매출 기능"'));

    const { OperationsPage } = await import("./operations/operations-page");
    const expenses = renderToStaticMarkup(
      <OperationsPage activeTab="expenses" catalog={[]} expenses={[]} ledger={[]} requestKey="k" salesContext salesQuery={{ view: "month", cursor: "2026-07-31" }} settings={{}} />,
    );

    expect(before(expenses)).not.toContain("justify-between gap-6");
  });
});
