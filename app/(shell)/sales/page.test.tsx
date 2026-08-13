import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SalesPage from "./page";
import { buildRevenueTransactions } from "../../../lib/revenue-data";
import { createSalonStore } from "../../../lib/salon-store";

describe("SalesPage", () => {
  beforeEach(() => vi.stubEnv("HAIRHAEYO_DB_PATH", ":memory:"));
  afterEach(() => vi.unstubAllEnvs());

  it("hands the client a server aggregate that matches the ledger row by row (§14)", async () => {
    const page = await SalesPage({ searchParams: Promise.resolve({ view: "month", cursor: "2026-07-31" }) });
    const { analytics, summary } = page.props;
    // 개별 거래는 페이로드에 실리지 않는다 (A4-1). 같은 원장을 여기서 직접 합산해 서버 집계와 맞춘다.
    const store = createSalonStore(":memory:");
    const transactions = (() => {
      try {
        return buildRevenueTransactions(store.listLedgerRange(summary.period.start, summary.period.endExclusive), store.list("customers"));
      } finally {
        store.close();
      }
    })();
    expect(analytics.transactions).toBeUndefined();
    expect(summary.gross).toBe(transactions.reduce((total, row) => total + row.gross, 0));
    expect(summary.netPaid).toBe(transactions.filter((row) => row.status !== "지출").reduce((total, row) => total + row.netPaid, 0));
    expect(analytics.settlement.find((row: { name: string }) => row.name === "총 매출")?.value).toBe(summary.gross);
    expect(analytics.settlement.find((row: { name: string }) => row.name === "실결제")?.value).toBe(summary.netPaid);
  });
  it("opens payment registration on the sales tab with a preselected customer", async () => {
    const page = await SalesPage({ searchParams: Promise.resolve({ tab: "payment", customer: "customer-seed-2" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain('value="customer-seed-2" selected=""');
    // 기간 스테퍼(일별/주별/…/누적 + ←/→)는 결제 폼을 한 글자도 바꾸지 않는다.
    // 아무 일도 안 하는 컨트롤 7개가 폼보다 먼저 Tab 순서에 서 있었다.
    expect(html).not.toContain('aria-label="매출 조회"');
    // 탭 줄도 없앴다. 라우트는 살아 있고(이 테스트가 곧 그 증거다) 링크만 내렸다 —
    // 결제는 예약 행·고객 상세·오늘 화면에서 열리는 작업이지 상시 메뉴가 아니다.
    expect(html).not.toContain('aria-label="매출 기능"');
  });
  it("opens the expense and reconciliation tab from the same ledger snapshot", async () => {
    const page = await SalesPage({ searchParams: Promise.resolve({ tab: "expenses" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("기간 정산");
    expect(html).toContain('aria-label="매출 조회"');
  });
  it("never lets a sales tab borrow another page's header title", async () => {
    for (const tab of ["payment", "expenses"]) {
      const html = renderToStaticMarkup(await SalesPage({ searchParams: Promise.resolve({ tab }) }));
      // 헤더 제목은 경로에서 파생된다. /sales 는 언제나 "매출·결제".
      expect(html).not.toMatch(/<strong class="text-\[19px\][^"]*">(?:오늘|운영 설정)<\/strong>/);
    }
  });
});
