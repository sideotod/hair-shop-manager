import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const functionText = readFileSync(resolve("FUNCTION.md"), "utf8");
const matrixText = readFileSync(resolve("docs/function-coverage-matrix.md"), "utf8");
const bullets = [...functionText.matchAll(/^\s*-\s(.+)$/gm)].map((match) => match[1]);
const parseMarkdownRow = (line: string) => {
  const cells: string[] = [];
  let cell = "";
  for (let index = 1; index < line.length - 1; index += 1) {
    if (line[index] === "\\" && line[index + 1] === "|") {
      cell += "|";
      index += 1;
    } else if (line[index] === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += line[index];
    }
  }
  cells.push(cell.trim());
  return cells;
};
const rows = matrixText.split(/\r?\n/)
  .filter((line) => /^\|.+\|$/.test(line))
  .map(parseMarkdownRow)
  .filter(([feature]) => feature !== "기능" && !/^--+$/.test(feature ?? ""));

describe("FUNCTION.md coverage matrix", () => {
  it("parses escaped pipes without splitting the feature cell", () => {
    expect(parseMarkdownRow("| SMS \\| LMS | 구현 예정 | app/messages/page.tsx | lib/function-coverage.test.ts |"))
      .toEqual(["SMS | LMS", "구현 예정", "app/messages/page.tsx", "lib/function-coverage.test.ts"]);
  });

  it("tracks all 253 top-level and 10 nested bullets exactly", () => {
    expect([...functionText.matchAll(/^-\s(.+)$/gm)]).toHaveLength(253);
    expect([...functionText.matchAll(/^\s{2,}-\s(.+)$/gm)]).toHaveLength(10);
    expect(bullets).toHaveLength(263);
    expect(rows).toHaveLength(263);
    expect(rows.map(([feature]) => feature).sort()).toEqual([...bullets].sort());
  });

  it("gives every bullet a status, implementation location, and verification", () => {
    for (const [feature, status, location, verification] of rows) {
      expect(feature).toBeTruthy();
      expect(status, feature).toBeTruthy();
      expect(location, feature).toBeTruthy();
      expect(verification, feature).toBeTruthy();
    }
  });

  it("marks owner replacements and external SMS/Naver boundaries", () => {
    for (const [feature, status] of rows) {
      if (/(직원|디자이너|판매자|시술자)/.test(feature ?? "")) expect(status, feature).toBe("원장 1인 대체");
      if (/(SMS|문자|네이버)/.test(feature ?? "")) expect(status, feature).toBe("연동 확인 필요");
    }
  });
});
