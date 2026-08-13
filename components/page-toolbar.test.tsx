import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageToolbar } from "./page-toolbar";

describe("PageToolbar", () => {
  it("renders a heading only when a title is given", () => {
    expect(renderToStaticMarkup(<PageToolbar description="설명" title="결제 등록" />)).toContain("<h2");
    expect(renderToStaticMarkup(<PageToolbar description="설명" />)).not.toContain("<h2");
  });
});
