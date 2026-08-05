import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

describe("UI stability", () => {
  it("keeps overlays outside the inert application background", () => {
    const html = renderToStaticMarkup(<AppShell overlay={<section>overlay</section>}><main>content</main></AppShell>);

    expect(html).toContain('data-app-shell-background="true"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-app-overlay="true"');
  });
});
