import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 라우트가 `store.snapshot()` 을 부르지 않는다는 가드.
 *
 * `snapshot()` 은 모든 kind + 전체 원장 + 감사 이력 전량을 읽는다 (`lib/salon-store.ts:475`).
 * 실측(`.data/hairhaeyo.sqlite`, 5회 평균):
 *   snapshot()          76.07 ms
 *   listLedger()        41.40 ms   (원장 5,576행)
 *   audit 전량 SELECT   13.00 ms   (감사 6,435행)
 *   list('customers')    5.26 ms
 *   getSettings()        0.12 ms
 *
 * 화면이 실제로 쓰는 양은 그보다 훨씬 적다. 대시보드는 원장에서 "오늘 합계"(SQL 0.08ms)와
 * "깨진 날짜 수"(0.50ms)만, 감사에서 "마지막 5행"(0.09ms)과 "깨진 날짜 수"(0.60ms)만 쓴다.
 * 그래서 `/` 의 serverTTFB 124ms 는 바닥이 아니었다.
 */
describe("route data access", () => {
  it("셸 라우트는 store.snapshot() 을 쓰지 않는다", () => {
    const offenders: string[] = [];
    for (const file of pageFiles(join("app", "(shell)"))) {
      const source = readFileSync(file, "utf8");
      for (const [index, line] of source.split("\n").entries()) {
        // 주석에 남긴 설명(`snapshot()은 …`)은 호출이 아니다. 실제 호출만 잡는다.
        if (/\bstore\.snapshot\(\)/.test(line)) offenders.push(`${relative(process.cwd(), file).replaceAll("\\", "/")}:${index + 1}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

function pageFiles(dir: string, found: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) pageFiles(full, found);
    else if (entry.name === "page.tsx") found.push(full);
  }
  return found;
}
