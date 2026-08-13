import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OperationsPage } from "./operations-page";

/** 시술 가격표·메모 탭은 `/settings` 로 옮겼다 (설계 §5.2) — 그 확인은 `settings-page.test.tsx` 가 맡는다. */
const record = (id: string, value: Record<string, string | number>) => ({ id, kind: "test", value, createdAt: "2026-07-31T09:30:00.000Z", updatedAt: "2026-07-31T09:30:00.000Z", archivedAt: null });
const props = { expenses: [record("preset", { name: "임대료", defaultWon: 500000 })], ledger: [{ id: "expense-1", requestKey: "expense-1", kind: "expense", occurredAt: "2026-07-31T09:30:00.000Z", correctionOf: null, customerId: null, grossWon: -500000, amountWon: -500000, discountWon: 0, vatWon: 0, feeWon: 0, expenseWon: 500000, incentiveWon: 0, pointsWon: 0, couponWon: 0, profitWon: -500000, details: { expenseName: "임대료" } }], period: { start: "2026-07-01", end: "2026-07-31" }, requestKey: "ops-test-key" };

describe("OperationsPage", () => {
  it("renders expense preset, period reconciliation, correction, and the ledger from one period", () => {
    const page = renderToStaticMarkup(<OperationsPage {...props} correctionId="expense-1" />);

    expect(page).toContain("지출 정정");
    expect(page).toContain("지출 프리셋");
    expect(page).toContain("기간 정산");
    expect(page).toContain("지출 원장");
    expect(page).toContain("임대료");
  });

  it("leaves the shell chrome to the route layout instead of rendering its own", () => {
    const html = renderToStaticMarkup(<OperationsPage {...props} />);

    expect(html).not.toContain('data-app-shell-background');
    expect(html).not.toContain('aria-label="주요 메뉴"');
  });

  it("shows explicit empty and input-error states", () => {
    const page = renderToStaticMarkup(<OperationsPage {...props} error="지출 금액을 입력하세요." ledger={[]} />);

    expect(page).toContain('role="alert"');
    expect(page).toContain("선택 기간의 지출이 없습니다.");
  });

  it("takes hidden form ids from the server so identical renders stay identical", () => {
    const first = renderToStaticMarkup(<OperationsPage {...props} requestKey="ops-fixed-key" />);
    const second = renderToStaticMarkup(<OperationsPage {...props} requestKey="ops-fixed-key" />);

    expect(first).toBe(second);
    expect(first).toContain('name="requestKey" value="expense-ops-fixed-key"');
  });
});
