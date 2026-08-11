import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SubmitButton } from "./submit-button";

// `useFormStatus` 는 서버 렌더에서 `pending: false` 를 준다. 즉 첫 페인트는 항상 누를 수 있어야 한다 —
// 여기서 `disabled` 가 새어 나오면 자바스크립트가 붙기 전에는 폼을 아예 못 낸다.
describe("SubmitButton", () => {
  const html = renderToStaticMarkup(<form><SubmitButton>저장</SubmitButton></form>);

  it("첫 페인트에서는 누를 수 있고 바쁨 표시도 없다", () => {
    // `disabled:` 는 Tailwind 변형 클래스라 문자열에 늘 들어 있다. 속성만 본다.
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
    expect(html).not.toContain("aria-busy");
    expect(html).toContain("저장");
  });

  it("제출 버튼이고 공통 버튼 크기를 그대로 쓴다", () => {
    expect(html).toContain('type="submit"');
    expect(html).toContain("h-11");
  });
});
