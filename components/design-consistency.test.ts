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
/** 09A~09H는 일반 화면이 아니라 Figma 실측 모달이다. 이 숫자만 예외로 등록한다. */
const figmaPaymentDialog = "components/sales/payment-registration-dialog.tsx";
const figmaPaymentAmounts = "components/sales/payment-amounts.tsx";
const figmaPaymentCustomer = "components/sales/payment-customer.tsx";
const figmaSpacing = new Set([`${figmaPaymentDialog}:p-6`]);
const figmaTextSizes = new Set([`${figmaPaymentDialog}:19px`, `${figmaPaymentDialog}:15px`, `${figmaPaymentAmounts}:15px`, `${figmaPaymentAmounts}:22px`, `${figmaPaymentCustomer}:19px`]);
const figmaTextUtilities = new Set([`${figmaPaymentDialog}:text-lg`]);

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
      for (const [line, token] of spacingLiterals(source)) {
        if (!figmaSpacing.has(`${path}:${token}`)) offenders.push(`${path}:${line}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  /**
   * 제목 크기(14px 이상)는 `components/type.ts` 만 소유한다.
   *
   * 이전에는 같은 위계의 카드 제목이 화면마다 달랐다 — 설정·예약·운영 `text-lg`(18px),
   * 고객 `text-xl`(20px), 대시보드 13.5px. 화면을 옮길 때마다 같은 제목이 7px 씩 뛰었다.
   * 크기를 손으로 적을 수 있으면 다음 화면에서 또 갈라진다.
   *
   * 문서화된 예외 하나: 사이드바 워드마크 21px. 브랜드 각인이지 본문 활자가 아니다.
   *
   * 아래쪽도 같은 이유로 잠근다. 위쪽만 막아두니 13px 밑에서 0.5px 단계가 33곳까지 자랐다
   * (10.5 · 11.5 · 12.5 · 9.5 · 9). 본문이 13px 인 화면에서 0.5px 차이는 아무 정보도 나르지
   * 않으면서 같은 위계의 글자를 화면마다 다르게 만든다. 남은 발판은 10 · 11 · 12 · 13 뿐이다.
   */
  it("활자 크기는 타입 스케일 발판만 쓴다", () => {
    const offenders: string[] = [];
    for (const [path, source] of files) {
      if (path === "components/type.ts") continue;
      const allowed = path === "components/app-shell.tsx" ? /^(10|11|12|13|21)px$/ : /^(10|11|12|13)px$/;
      for (const [line, size] of sizeLiterals(source)) {
        if (!allowed.test(size) && !figmaTextSizes.has(`${path}:${size}`)) offenders.push(`${path}:${line} text-[${size}]`);
      }
      for (const [line, token] of textUtilities(source)) {
        if (!figmaTextUtilities.has(`${path}:${token}`)) offenders.push(`${path}:${line}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});

/** `text-[13px]` 같은 리터럴 크기를 줄 번호와 함께 뽑는다. `text-sm` 등 유틸리티는 대상이 아니다. */
function sizeLiterals(source: string) {
  const found: [number, string][] = [];
  const pattern = /\btext-\[(\d+(?:\.\d+)?px)\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) found.push([source.slice(0, match.index).split("\n").length, match[1]]);
  return found;
}

function spacingLiterals(source: string) {
  return utilityLiterals(source, /\bp-(6|7|9|10|12)\b/g);
}

function textUtilities(source: string) {
  return utilityLiterals(source, /\btext-(lg|xl|2xl|3xl|4xl|5xl|6xl)\b/g);
}

function utilityLiterals(source: string, pattern: RegExp) {
  const found: [number, string][] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) found.push([source.slice(0, match.index).split("\n").length, match[0]]);
  return found;
}

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
