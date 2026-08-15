import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ShellLayout from "./layout";

describe("ShellLayout", () => {
  it("server-renders the shell instead of its fallback children", async () => {
    const html = renderToStaticMarkup(await ShellLayout({ children: <main>content</main> }));

    expect(html).toContain("HAIRHAEYO");
    expect(html).toContain("운영 현황");
  });
});
