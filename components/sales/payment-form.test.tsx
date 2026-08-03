import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PAYMENT_METHODS } from "../../lib/finance";
import { PaymentForm } from "./payment-form";

describe("PaymentForm", () => {
  it("renders all payment inputs and applies a preselected customer", () => {
    const html = renderToStaticMarkup(<PaymentForm customerId="customer-1" customers={[{ id: "customer-1", value: { name: "김하늘", points: 100 } }]} today="2026-08-01" />);
    expect(html).toContain('value="customer-1" selected=""');
    for (const { key, label } of PAYMENT_METHODS) { expect(html).toContain(`name="payment_${key}"`); expect(html).toContain(label); }
    for (const name of ["grossWon", "discountWon", "pointsUsedWon", "pointsEarnedWon", "vatMode", "cardFeeRate", "expenseWon", "generalNote", "medicineNote", "scalpNote", "hairNote"]) expect(html).toContain(`name="${name}"`);
  });

  it("renders all legacy service categories and preserves payment correction context with an accessible error", () => {
    const html = renderToStaticMarkup(<PaymentForm correctionTargetId="ledger-1" customerId="customer-1" customers={[{ id: "customer-1", value: { name: "고객", points: 100 } }]} error="Duplicate ledger requestKey" returnTo="/sales?tab=payment&customer=customer-1&correction=ledger-1" today="2026-08-01" />);
    for (const service of ["커트", "펌", "매직", "드라이", "클리닉", "컬러", "업스타일", "매니큐어", "세트메뉴", "기타"]) expect(html).toContain(`>${service}<`);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Duplicate ledger requestKey");
    expect(html).toContain('name="targetId" value="ledger-1"');
    expect(html).toContain('name="returnTo" value="/sales?tab=payment&amp;customer=customer-1&amp;correction=ledger-1"');
    expect(html).toContain('value="2026-08-01"');
  });

  it("uses persisted VAT mode and card fee defaults", () => {
    const html = renderToStaticMarkup(<PaymentForm customers={[]} settings={{ vatMode: "separate", cardFeeRate: 2.75 }} today="2026-08-01" />);
    expect(html).toContain('<option value="separate" selected="">별도</option>');
    expect(html).toContain('name="cardFeeRate" value="2.75"');
  });
});
