import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OperationsPage } from "./operations-page";

const record = (id: string, value: Record<string, string | number>) => ({ id, kind: "test", value, createdAt: "2026-07-31T09:30:00.000Z", updatedAt: "2026-07-31T09:30:00.000Z", archivedAt: null });
const props = { catalog: [record("major", { type: "service-major", name: "커트", category: "", priceWon: 0 }), record("detail", { type: "service-detail", name: "여성 커트", category: "커트", priceWon: 25000 })], expenses: [record("preset", { name: "임대료", defaultWon: 500000 })], ledger: [{ id: "expense-1", requestKey: "expense-1", kind: "expense", occurredAt: "2026-07-31T09:30:00.000Z", correctionOf: null, customerId: null, grossWon: -500000, amountWon: -500000, discountWon: 0, vatWon: 0, feeWon: 0, expenseWon: 500000, incentiveWon: 0, pointsWon: 0, couponWon: 0, profitWon: -500000, details: { expenseName: "임대료" } }], settings: {}, period: { start: "2026-07-01", end: "2026-07-31" } };

describe("OperationsPage", () => {
  it("renders the service catalog, supported memo values, and printable price list without excluded workflows", () => {
    const services = renderToStaticMarkup(<OperationsPage {...props} activeTab="services" />);
    const memos = renderToStaticMarkup(<OperationsPage {...props} activeTab="memos" />);
    const printed = renderToStaticMarkup(<OperationsPage {...props} activeTab="services" print />);

    expect(services).toContain("시술 분류·가격 등록");
    expect(services).toContain("여성 커트");
    expect(memos).toContain("두피 상태");
    expect(memos).toContain("모발 특징");
    expect(memos).toContain("선택 메모");
    expect(memos).toContain("사은품");
    expect(memos).toContain("간편 메모");
    expect(printed).toContain("인쇄용 서비스 가격표");
    expect(services).not.toContain("상품·쿠폰");
    expect(services).not.toContain("선불권");
  });

  it("renders expense preset, period reconciliation, correction, and the ledger from one period", () => {
    const page = renderToStaticMarkup(<OperationsPage {...props} activeTab="expenses" correctionId="expense-1" />);

    expect(page).toContain('href="/operations?tab=expenses&amp;print=1&amp;start=2026-07-01&amp;end=2026-07-31"');

    expect(page).toContain("지출 정정");
    expect(page).toContain("지출 프리셋");
    expect(page).toContain("기간 정산");
    expect(page).toContain("지출 원장");
    expect(page).toContain("임대료");
  });

  it("renders a populated catalog edit form and a dedicated expense print layout", () => {
    const EditableOperationsPage = OperationsPage as unknown as (input: typeof props & { activeTab: "services"; editCatalogId: string }) => React.ReactElement;
    const edit = renderToStaticMarkup(<EditableOperationsPage {...props} activeTab="services" editCatalogId="detail" />);
    const print = renderToStaticMarkup(<OperationsPage {...props} activeTab="expenses" print />);

    expect(edit).toContain('data-catalog-edit="detail"');
    expect(edit).toContain('type="hidden" name="catalogId" value="detail"');
    expect(edit).toContain('name="name" value="여성 커트"');
    expect(print).toContain("인쇄용 지출 원장");
    expect(print).toContain("임대료");
  });

  it("leaves the shell chrome to the route layout instead of rendering its own", () => {
    const html = renderToStaticMarkup(<OperationsPage {...props} activeTab="expenses" />);

    expect(html).not.toContain('data-app-shell-background');
    expect(html).not.toContain('aria-label="주요 메뉴"');
  });

  it("shows explicit empty and input-error states", () => {
    const page = renderToStaticMarkup(<OperationsPage {...props} activeTab="expenses" error="지출 금액을 입력하세요." ledger={[]} />);

    expect(page).toContain('role="alert"');
    expect(page).toContain("선택 기간의 지출이 없습니다.");
  });
});
