import { existsSync, readFileSync } from "node:fs";
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
const allowedStatuses = new Set(["구현", "원장 1인 대체", "연동 확인 필요", "사용자 승인 제외"]);

describe("FUNCTION.md coverage matrix", () => {
  it("parses escaped pipes without splitting the feature cell", () => {
    expect(parseMarkdownRow("| SMS \\| LMS | 구현 | app/messages/page.tsx | lib/function-coverage.test.ts |"))
      .toEqual(["SMS | LMS", "구현", "app/messages/page.tsx", "lib/function-coverage.test.ts"]);
  });

  it("tracks all 253 top-level and 10 nested bullets exactly", () => {
    expect([...functionText.matchAll(/^-\s(.+)$/gm)]).toHaveLength(253);
    expect([...functionText.matchAll(/^\s{2,}-\s(.+)$/gm)]).toHaveLength(10);
    expect(bullets).toHaveLength(263);
    expect(rows).toHaveLength(263);
    expect(rows.map(([feature]) => feature).sort()).toEqual([...bullets].sort());
  });

  it("gives every bullet one allowed status and exact implementation and verification paths", () => {
    for (const [feature, status, location, verification] of rows) {
      expect(rows.find((row) => row[0] === feature)).toHaveLength(4);
      expect(feature).toBeTruthy();
      expect(allowedStatuses.has(status ?? ""), feature).toBe(true);
      expect(status, feature).not.toContain("계획");
      expect(location, feature).toMatch(/(?:^|; )(?:app|components|lib|docs)\/.+/);
      expect(verification, feature).toMatch(/(?:^|; )(?:app|components|lib|docs)\/.+/);
      for (const path of `${location};${verification}`.split(";").map((value) => value.trim()).filter((value) => /^(?:app|components|lib|docs)\//.test(value))) expect(existsSync(resolve(path)), `${feature}: ${path}`).toBe(true);
    }
  });

  it("keeps the approved status totals stable", () => {
    expect(Object.fromEntries([...allowedStatuses].map((status) => [status, rows.filter((row) => row[1] === status).length]))).toEqual({
      "구현": 177,
      "원장 1인 대체": 16,
      "연동 확인 필요": 32,
      "사용자 승인 제외": 38,
    });
  });

  it("marks owner replacements and external SMS/Naver boundaries", () => {
    for (const [feature, status] of rows) {
      if (/(직원|디자이너|판매자|시술자)/.test(feature ?? "") && status !== "사용자 승인 제외") expect(status, feature).toBe("원장 1인 대체");
      if (/(SMS|문자|네이버)/.test(feature ?? "")) expect(["구현", "연동 확인 필요", "사용자 승인 제외"]).toContain(status);
    }
  });
});
