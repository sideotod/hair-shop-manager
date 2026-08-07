import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 디자인 일관성 가드.
 *
 * 버튼 크기는 이미 `components/button.ts` 한 곳에서 나온다. 표면(카드)은 아직 아니다.
 * 같은 그림자 문자열이 여섯 파일에 복붙돼 있고, 그 옆에 Tailwind 기본 그림자
 * (`shadow-sm` / `shadow-lg` / `shadow-2xl`) 세 개가 섞여 있다. 기본 그림자는 순수 검정이라
 * 배경(`--background: #f2f1ed`)과 색이 어긋난다.
 *
 * 여백도 마찬가지다. 실측 census: p-2 27 · p-3 7 · p-4 37 · p-5 13 · p-6 3 · p-7 1 · p-8 2 · p-9 1 · p-10 3 · p-12 1.
 * 뒤쪽 다섯 개(p-7·p-9·p-10·p-12 와 카드 p-6)는 한 번씩만 쓰이는 일회성 값이다.
 */

const files = [...sourceFiles("components"), ...sourceFiles("app")];

/** 카드 표면 그림자. 배경 색조(13,21,18)로 물들여 순수 검정을 피한다. */
const cardShadow = "shadow-[0_1px_2px_rgba(13,21,18,0.04),0_14px_30px_-20px_rgba(13,21,18,0.25)]";

describe("design consistency", () => {
  it("카드 표면은 한 곳에서만 정의된다", () => {
    const owners = files.filter(([, source]) => source.includes(cardShadow)).map(([path]) => path);

    expect(owners).toEqual(["components/surface.ts"]);
  });

  it("Tailwind 기본 그림자를 쓰지 않는다", () => {
    const offenders: string[] = [];
    for (const [path, source] of files) {
      for (const line of lines(source, /\bshadow-(sm|md|lg|xl|2xl)\b/)) offenders.push(`${path}:${line}`);
    }

    expect(offenders).toEqual([]);
  });

  /** 일회성 여백은 금지. 남는 스케일: 2(표 칸) · 3 · 4 · 5(카드) · 8(빈 상태). */
  it("여백은 합의된 스케일만 쓴다", () => {
    const offenders: string[] = [];
    for (const [path, source] of files) {
      for (const line of lines(source, /\bp-(6|7|9|10|12)\b/)) offenders.push(`${path}:${line}`);
    }

    expect(offenders).toEqual([]);
  });
});

function lines(source: string, pattern: RegExp) {
  const found: number[] = [];
  const global = new RegExp(pattern.source, "g");
  let match: RegExpExecArray | null;
  while ((match = global.exec(source))) found.push(source.slice(0, match.index).split("\n").length);
  return found;
}

/** 주석은 검사 대상이 아니다. 규칙을 설명하는 문장이 규칙 위반으로 잡히면 안 된다. 줄 번호는 유지한다. */
function stripComments(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (line, lead: string) => lead + " ".repeat(line.length - lead.length));
}

function sourceFiles(dir: string, found: [string, string][] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, found);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) {
      found.push([relative(process.cwd(), full).replaceAll("\\", "/"), stripComments(readFileSync(full, "utf8"))]);
    }
  }
  return found;
}
