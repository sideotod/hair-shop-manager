import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const printBlock = css.slice(css.indexOf("@media print"));

/**
 * 인쇄 회귀 방지. 셸(`[data-app-shell-background]`)을 통째로 숨기면
 * 본문도 그 안에 있으므로 종이가 백지로 나온다 — 고객 목록·지출 원장에서 실제로 그랬다.
 * 화면 전용 크롬(사이드바·헤더)만 걷어내야 한다.
 */
describe("print stylesheet", () => {
  it("never hides the whole shell, only the screen-only chrome", () => {
    expect(printBlock).not.toMatch(/\[data-app-shell-background\][^{:]*,\s*\n?\s*\.no-print\s*\{[^}]*display:\s*none/);
    expect(printBlock).toMatch(/\[data-app-shell-background\]\s*\{[^}]*display:\s*block/);
    expect(printBlock).toContain("[data-app-shell-background] > aside");
    expect(printBlock).toContain("[data-app-shell-background] header");
  });

  it("keeps the per-screen print bodies visible", () => {
    expect(printBlock).toMatch(/\.customer-print\s*\{[^}]*display:\s*block/);
    expect(printBlock).toMatch(/\.print-only\s*\{[^}]*display:\s*block/);
  });
});
