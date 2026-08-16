import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * 스크롤바 잠금.
 *
 * 재현한 버그: `* { scrollbar-width: thin; scrollbar-color: … }` 가 조건 없이 걸려 있었다.
 * 크로미움 121+ 는 한 요소에 표준 두 속성 중 하나라도 지정되면 그 요소의
 * `::-webkit-scrollbar-*` 규칙을 **전부 무시**한다. 그래서 화살표를 지우는 규칙
 * (`::-webkit-scrollbar-button { display: none }`)이 파일에 있는데도 한 번도 적용되지 않았고,
 * 윈도우 11 크로미움(= Tauri WebView2)에서 위아래 화살표가 그대로 보였다.
 *
 * 규칙이 있는지가 아니라 **살아 있는지**를 잠근다 — 죽은 규칙은 눈으로 읽으면 통과처럼 보인다.
 */
const css = readFileSync("app/globals.css", "utf8");

describe("scrollbar", () => {
  it("표준 스크롤바 속성을 webkit 이 없는 브라우저로 가둔다", () => {
    // `scrollbar-width`/`scrollbar-color` 는 `@supports not selector(::-webkit-scrollbar)` 안에만 산다.
    const guard = css.indexOf("@supports not selector(::-webkit-scrollbar)");
    expect(guard).toBeGreaterThan(-1);

    for (const property of ["scrollbar-width:", "scrollbar-color:"]) {
      for (const match of css.matchAll(new RegExp(property, "g"))) {
        expect(match.index).toBeGreaterThan(guard);
        // 가드 블록은 하나뿐이고 그 안에서 닫힌다 — 뒤에 다른 규칙이 또 얹히면 잡는다.
        expect(css.slice(guard, match.index)).not.toContain("\n}\n}");
      }
    }
  });

  it("화살표 버튼과 구석을 지운다", () => {
    expect(css).toContain("::-webkit-scrollbar-button");
    expect(css).toMatch(/::-webkit-scrollbar-button\s*\{\s*display: none/);
    expect(css).toMatch(/::-webkit-scrollbar-corner\s*\{\s*background: transparent/);
  });

  /** 쉴 때는 투명, 상자에 손이 올라오면 보인다. 폭은 트랙이 계속 잡고 있어 흔들리지 않는다. */
  it("손잡이는 hover 에서만 보인다", () => {
    expect(css).toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*background: transparent/);
    expect(css).toContain("*:hover::-webkit-scrollbar-thumb");
  });
});
