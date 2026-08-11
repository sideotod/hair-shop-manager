import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PaymentAmounts } from "./payment-amounts";
import { PaymentCustomer, PaymentMemberScope } from "./payment-customer";

const customers = [{ id: "customer-1", value: { name: "김하늘", phone: "01011112222" } }];
const amounts = (initial: string) => renderToStaticMarkup(<PaymentMemberScope initial={initial}><PaymentAmounts availablePoints={500} cardFeeRate={0} vatMode="included" /></PaymentMemberScope>);
// react-dom 이 속성 순서를 제 마음대로 낸다(`readOnly` 가 `name` 앞). 칸 하나를 통째로 떠서 본다.
const input = (html: string, name: string) => html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0] ?? "";

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

describe("PaymentMemberScope", () => {
  // `finance.ts:121` 은 비회원 + 포인트를 저장 시점에 던진다. 구분과 포인트칸은 서로 다른
  // 섹션에 있어 화면에서는 아무 신호도 없었다. 스코프가 둘을 잇는지 두 칸으로 확인한다.
  it("비회원이면 포인트 두 칸을 0으로 잠근다", () => {
    const html = amounts("non-member");
    expect(input(html, "pointsUsedWon")).toMatch(/readOnly/i);
    expect(input(html, "pointsEarnedWon")).toMatch(/readOnly/i);
    expect(input(html, "pointsUsedWon")).toContain('value="0"');
    expect(html).toContain("비회원 불가");
    expect(html).not.toContain("보유 500P");
  });

  it("회원이면 포인트칸을 그대로 연다", () => {
    const html = amounts("member");
    expect(input(html, "pointsUsedWon")).not.toMatch(/readOnly/i);
    expect(input(html, "pointsEarnedWon")).not.toMatch(/readOnly/i);
    expect(html).toContain("보유 500P");
    expect(html).not.toContain("비회원 불가");
  });
});
