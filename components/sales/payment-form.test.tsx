import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PAYMENT_METHODS } from "../../lib/finance";
import { PaymentForm } from "./payment-form";

describe("PaymentForm", () => {
  it("renders all payment inputs and applies a preselected customer", () => {
    const html = renderToStaticMarkup(<PaymentForm customerId="customer-1" customers={[{ id: "customer-1", value: { name: "김하늘", points: 100 } }]} />);
    expect(html).toContain('value="customer-1" selected=""');
    for (const { key, label } of PAYMENT_METHODS) { expect(html).toContain(`name="payment_${key}"`); expect(html).toContain(label); }
    for (const name of ["grossWon", "discountWon", "pointsUsedWon", "pointsEarnedWon", "vatMode", "cardFeeRate", "expenseWon", "generalNote", "medicineNote", "scalpNote", "hairNote"]) expect(html).toContain(`name="${name}"`);
  });
});
