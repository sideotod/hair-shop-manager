import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PaymentCustomer } from "./payment-customer";

const customers = [{ id: "customer-1", value: { name: "김하늘", phone: "01011112222" } }];

describe("PaymentCustomer", () => {
  // 서버가 실제로 던지는 필수는 `finance.ts:115` 한 줄뿐이다. 첫 페인트는 회원이므로
  // 고객칸이 필수여야 하고, 나머지 32칸에는 `required` 가 없어야 한다.
  const html = renderToStaticMarkup(<PaymentCustomer customerId="customer-1" customers={customers} />);

  it("회원일 때 고객칸만 필수로 표시한다", () => {
    expect(html).toContain('name="customerId"');
    expect(html).toMatch(/name="customerId"[^>]*required/);
    expect(html).toContain("필수");
    expect(html).toMatch(/name="memberType"(?![^>]*required)/);
  });

  it("선택된 고객을 그대로 유지한다", () => {
    expect(html).toContain('value="customer-1" selected=""');
  });
});
