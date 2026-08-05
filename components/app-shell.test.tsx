import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("uses the Figma navigation groups instead of a flat menu", () => {
    const html = renderToStaticMarkup(<AppShell activeHref="/sales"><main>content</main></AppShell>);

    expect(html).toContain("운영");
    expect(html).toContain("정산");
    expect(html).toContain("관리");
    expect(html).not.toContain('href="/sales">매출 분석</a>');
  });
});
