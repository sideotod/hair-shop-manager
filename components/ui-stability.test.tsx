import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

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

  /**
   * 잘림 방지 가드.
   *
   * 셸(`app-shell.tsx:119`)이 이미 `min-h-0 flex-1 overflow-auto` 단일 스크롤 컨테이너를 갖는다.
   * 본문 `<main>` 이 다시 `h-full ... overflow-hidden` 세로 flex 가 되면 자식은 `flex-shrink:1` 기본값이라
   * 내용이 뷰포트보다 크면 **눌리고**, `overflow-hidden` 때문에 스크롤도 안 된다.
   *
   * 브라우저 실측(1440×900, prod):
   *   /          main h=637 scrollH=754  · 오른쪽 aside bottom=826 vs 스크롤러 bottom=709 → "자동 문자" 117px 소실
   *   /customers 고객 정책 form h=112 scrollH=512 → 400px 소실
   *   /bookings /sales /messages /operations /settings 는 이 조합이 없어 clipped=0
   */
  it("본문 main 이 셸 스크롤러와 경쟁하지 않는다", () => {
    const offenders: string[] = [];
    for (const file of tsxFiles("components")) {
      const source = readFileSync(file, "utf8");
      const pattern = /<main\b([\s\S]{0,400}?)>/g;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source))) {
        if (!/\bh-full\b/.test(match[1]) || !/\boverflow-hidden\b/.test(match[1])) continue;
        const line = source.slice(0, match.index).split("\n").length;
        offenders.push(`${relative(process.cwd(), file).replaceAll("\\", "/")}:${line}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

function tsxFiles(dir: string, found: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) tsxFiles(full, found);
    else if (entry.name.endsWith(".tsx") && !entry.name.includes(".test.")) found.push(full);
  }
  return found;
}

describe("Sales workspace period row", () => {
  /**
   * 탭 줄(매출 분석 · 결제 등록 · 지출/정산)은 없앴다 — 성격이 다른 셋을 한 줄에 두면
   * 한 묶음으로 배우게 된다. 그 자리를 물려받은 `매출 조회` 기간 줄도 이제 없다:
   * 지출·정산의 칩은 `view/cursor` 를 쓰고 기간 정산 폼은 `start/end` 를 써서 서로 덮어썼다.
   * 기간은 시작일/종료일 폼 하나만 정한다.
   */
  it("keeps the expenses screen free of dead period controls", async () => {
    const { OperationsPage } = await import("./operations/operations-page");
    const expenses = renderToStaticMarkup(<OperationsPage expenses={[]} ledger={[]} requestKey="k" />);

    expect(expenses).not.toContain('aria-label="매출 조회"');
    // 기간은 이 폼 하나가 정한다.
    expect(expenses).toContain('aria-label="기간 정산"');
    // 성격이 다른 세 화면을 한 줄에 묶던 탭 줄은 돌아오지 않는다.
    expect(expenses).not.toContain('aria-label="매출 기능"');
  });
});
