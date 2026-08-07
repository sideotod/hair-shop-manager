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
