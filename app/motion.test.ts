import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * 모션 잠금.
 *
 * 구현 뒤에 붙인 회귀 잠금이다(버그를 먼저 재현한 테스트가 아니다).
 * `CLAUDE.md` 가 정한 대역(마이크로 120–180ms, 컴포넌트 180–280ms, 패널 220–360ms,
 * 페이지 300–500ms)을 벗어난 값이 조용히 들어오는 것을 막는다.
 *
 * 곡선은 늘려도 되지만 시간은 늘리면 안 된다. 운영 화면에서 지속시간은 곧 대기 시간이다.
 */
const css = readFileSync("app/globals.css", "utf8");

describe("motion", () => {
  it("모든 지속시간이 CLAUDE.md 대역 안에 있다", () => {
    const tooLong = [...css.matchAll(/(\d+)ms/g)]
      .map((match) => Number(match[1]))
      .filter((ms) => ms > 500);

    expect(tooLong).toEqual([]);
  });

  it("`ease` / `linear` / `ease-in-out` 대신 단일 곡선을 쓴다", () => {
    const generic = [...css.matchAll(/\b(\d+ms) (ease|linear|ease-in-out)\b/g)].map((match) => match[0]);

    expect(generic).toEqual([]);
  });

  it("모션 축소 요청 시 눌림 변형까지 끈다", () => {
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

    expect(reduced).toContain("transform: none");
  });

  /** 장식용 무한 반복은 운영 화면에 두지 않는다. */
  it("무한 반복 애니메이션이 없다", () => {
    expect(css).not.toMatch(/animation[^;]*\binfinite\b/);
  });
});
