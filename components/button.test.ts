import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { button } from "./button";

/** 본문 버튼 크기가 다시 갈라지는 것을 막는 가드. 새 화면이 손으로 패딩을 적으면 여기서 걸린다. */
const allowlist = new Set([
  // 사이드바 내비게이션은 본문 버튼이 아니라 셸의 일부다. 스케일 밖.
  "components/app-shell.tsx",
]);

function tsxFiles(dir: string, found: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) tsxFiles(full, found);
    else if (entry.name.endsWith(".tsx") && !entry.name.includes(".test.")) found.push(full);
  }
  return found;
}

describe("button scale", () => {
  it("활성·비활성이 같은 박스 크기를 쓴다", () => {
    const active = button("md", "primary");
    const idle = button("md", "secondary");
    for (const size of ["h-10", "px-3.5", "text-sm"]) {
      expect(active).toContain(size);
      expect(idle).toContain(size);
    }
    // 테두리가 붙었다 사라지면 줄이 1px 흔들린다. 양쪽 모두 border 를 갖는다.
    expect(active).toContain("border-[var(--brand)]");
    expect(idle).toContain("border-[var(--border)]");
  });

  it("네 크기가 서로 다르다", () => {
    const rendered = (["lg", "md", "sm", "xs"] as const).map((size) => button(size));
    expect(new Set(rendered).size).toBe(4);
  });

  it("네 크기 모두 높이를 고정한다", () => {
    // `py-` 만 쓰면 flex·grid 줄에서 stretch 되어 같은 크기가 38px·40px 로 갈라진다. `h-` 로 못박는다.
    for (const size of ["lg", "md", "sm", "xs"] as const) {
      expect(button(size)).toMatch(/\bh-(?:[0-9.]+|\[[^\]]+\])/);
    }
  });

  it("본문 컴포넌트가 버튼 패딩을 손으로 적지 않는다", () => {
    const offenders: string[] = [];
    // 손으로 크기를 정하는 네 가지 형태를 모두 잡는다.
    //   1) `px-4 py-2`   2) `h-10 … px-4`(높이로 지정)
    //   3) `rounded-[var(--radius-card)] … px-4`   4) `rounded-[var(--radius-control)] … py-2`(px 없이 py 만)
    // 2·3·4 가 guard 를 빠져나가 revenue-dashboard·customers-page 가 스케일 밖에 남아 있었다.
    const shapes = [
      /px-[0-9.]+\s+py-(?:[0-9.]+|\[[^\]]+\])/,
      /h-(?:[0-9.]+|\[[^\]]+\])[\s\S]*?px-[0-9.]+/,
      /rounded-\[var\(--radius-card\)\][\s\S]*?px-[0-9.]+/,
      /rounded-\[var\(--radius-control\)\][\s\S]*?p[xy]-[0-9.]+/,
    ];
    for (const file of tsxFiles("components")) {
      const key = relative(process.cwd(), file).replaceAll("\\", "/");
      if (allowlist.has(key)) continue;
      const source = readFileSync(file, "utf8");
      const pattern = /<(button|Link|a|summary)\b([\s\S]{0,700}?)>/g;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source))) {
        const padding = shapes.map((shape) => match![2].match(shape)).find(Boolean);
        if (!padding) continue;
        offenders.push(`${key}:${source.slice(0, match.index).split("\n").length} ${padding[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
