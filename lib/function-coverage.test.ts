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
const allowedStatuses = new Set(["구현", "원장 1인 대체", "연동 확인 필요", "사용자 승인 제외", "사용자 승인 메일 대체"]);
const evidencePath = /^(?:FUNCTION\.md|(?:app|components|lib|docs)\/[^\s;]+)$/;

function evidencePaths(cell: string, feature: string) {
  const paths = cell.split(";").map((value) => value.trim()).filter(Boolean);
  for (const path of paths) {
    expect(evidencePath.test(path), `${feature}: concrete repo path required instead of ${path}`).toBe(true);
    expect(existsSync(resolve(path)), `${feature}: ${path}`).toBe(true);
  }
  return paths;
}

describe("FUNCTION.md coverage matrix", () => {
  it("parses escaped pipes without splitting the feature cell", () => {
    expect(parseMarkdownRow("| SMS \\| LMS | 구현 | app/messages/page.tsx | lib/function-coverage.test.ts |"))
      .toEqual(["SMS | LMS", "구현", "app/messages/page.tsx", "lib/function-coverage.test.ts"]);
  });

  it("tracks all 253 top-level and 10 nested bullets exactly", () => {
    expect([...functionText.matchAll(/^-\s(.+)$/gm)]).toHaveLength(253);
    expect([...functionText.matchAll(/^[ \t]{2,}-[ \t]+(.+)$/gm)]).toHaveLength(10);
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
      const implementationPaths = evidencePaths(location, feature);
      const verificationPaths = evidencePaths(verification, feature);
      if (status === "구현" || status === "원장 1인 대체") {
        expect(implementationPaths.some((path) => /^(?:app|components|lib)\//.test(path)), `${feature}: implementation code path required`).toBe(true);
        expect(verificationPaths.some((path) => /\.test\.tsx?$/.test(path)), `${feature}: focused test path required`).toBe(true);
      }
    }
  });

  it("rejects generic verification labels instead of concrete repository paths", () => {
    expect(() => evidencePaths("components/dashboard/dashboard-page.test.tsx; Playwright", "generic evidence fixture")).toThrow();
  });

  it("marks owner replacements and external SMS/Naver boundaries", () => {
    for (const [feature, status] of rows) {
      if (/(직원|디자이너|판매자|시술자)/.test(feature ?? "") && status !== "사용자 승인 제외") expect(status, feature).toBe("원장 1인 대체");
      if (/(SMS|문자|네이버)/.test(feature ?? "")) expect(["구현", "연동 확인 필요", "사용자 승인 제외", "사용자 승인 메일 대체"]).toContain(status);
    }
  });

  it("maps legacy Naver direct integration rows to the approved booking-mail replacement", () => {
    for (const feature of [
      "네이버 스마트 플레이스 회원 가입 안내",
      "네이버 예약 코드 등록",
      "네이버 계정/매장 정보 입력",
      "네이버 예약 ID·코드·매장명·담당자·전화번호·메모 저장",
      "네이버 예약 연동 FAQ",
      "네이버 고객센터 연결",
      "네이버 페이센터 연결",
      "네이버 예약 설정 참고 자료",
      "네이버 예약 데이터 동기화 `[추가확인: 실제 API/동기화 주기/충돌 규칙]`",
      "네이버 예약 연동 설정",
      "외부 네이버 예약/네이버 페이 연동은 계정 권한과 API 계약 확인이 필요하다.",
    ]) {
      const row = rows.find(([name]) => name === feature);
      expect(row?.[1], feature).toBe("사용자 승인 메일 대체");
      expect(row?.[2], feature).toContain("components/bookings/naver-mail-connection.tsx");
      expect(row?.[3], feature).toContain("components/bookings/naver-mail-connection.test.tsx");
    }
  });

  it("excludes pure product and coupon rows while retaining prepaid replacements", () => {
    for (const [feature, status] of rows) if (/(상품|쿠폰|선불권|선불티켓)/.test(feature ?? "")) expect(status, feature).toBe("사용자 승인 제외");
  });

  it("has no pending coverage rows", () => {
    const pending = rows.filter(([, status]) => status === "연동 확인 필요");
    expect(pending).toHaveLength(0);
    for (const [feature] of pending) expect(feature, feature).toMatch(/네이버/);
    for (const feature of [
      "포인트 시작값/적립 기준/사용 제한",
      "포인트 시작값/한도/적립 방식",
      "팝업 함수(`SerSort`, `SerMemo*`, `VPatron`, `AdjustExpense`, `Color`, `FAQnaver` 등)는 호출 지점과 입력 필드는 확인했지만 각 팝업 내부 저장/삭제 동작은 별도 테스트가 필요하다.",
      "`Con.asp` 처리 endpoint는 화면에서 전송하지 않고 폼 구조만 확인했다.",
    ]) expect(rows.find(([name]) => name === feature)?.[1], feature).toBe("구현");
  });
});
