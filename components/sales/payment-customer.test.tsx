import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DuplicateEntry } from "../customers/customer-form";
import { PaymentAmounts } from "./payment-amounts";
import { PaymentCustomer, PaymentCustomerScope } from "./payment-customer";

const index: readonly DuplicateEntry[] = [
  ["customer-1", "김하늘", "female", "01011112222", "2024-03-02", ""],
  ["customer-2", "이수린", "female", "01033332222", "2025-01-09", ""],
];
// react-dom 이 속성 순서를 제 마음대로 낸다(`readOnly` 가 `name` 앞). 칸 하나를 통째로 떠서 본다.
const input = (html: string, name: string) => html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0] ?? "";
const amounts = (fixed?: { customerId: string; points: number }) =>
  renderToStaticMarkup(<PaymentCustomerScope fixed={fixed}><PaymentAmounts cardFeeRate={0} vatMode="included" /></PaymentCustomerScope>);

/**
 * 회원 구분칸은 없다 — 등록되어 있는 사람이 회원이다.
 *
 * 예전에는 `구분` 셀렉트가 회원/비회원을 물었고 그 값이 `memberType` 으로 서버까지 갔다.
 * 두 칸(구분 · 회원 고객)이 같은 사실을 두 번 물어 서로 어긋날 수 있었다.
 * 이제 묻는 것은 이름과 뒷자리 둘뿐이고, 결정은 `customerId` 하나가 나른다.
 */
describe("PaymentCustomer", () => {
  const html = renderToStaticMarkup(<PaymentCustomerScope><PaymentCustomer index={index} settings={{}} today="2026-08-14" /></PaymentCustomerScope>);

  it("이름과 뒷자리만 묻고 회원 구분칸을 두지 않는다", () => {
    expect(html).toContain('name="lookupName"');
    expect(html).toContain('name="lookupTail"');
    expect(html).not.toContain('name="memberType"');
    expect(html).not.toContain(">회원<");
    expect(html).not.toContain(">비회원<");
    // 첫 페인트에서는 아무도 안 골랐으므로 `customerId` 는 비어 있다.
    expect(input(html, "customerId")).toContain('value=""');
  });

  it("둘 다 비우면 비회원 결제라고 화면이 먼저 말한다", () => {
    expect(html).toContain("비회원 결제");
  });

  /** 서버가 던지는 필수는 요청 키뿐이다(`finance.ts`). 고객칸에 `required` 가 붙으면 비회원 결제가 막힌다. */
  it("고객칸을 필수로 만들지 않는다", () => {
    expect(html).not.toMatch(/name="customerId"[^>]*required/);
  });
});

describe("PaymentCustomerScope", () => {
  // `finance.ts` 는 등록되지 않은 고객 + 포인트를 저장 시점에 던진다. 고객칸과 포인트칸은 서로 다른
  // 섹션에 있어 화면에서는 아무 신호도 없었다. 스코프가 둘을 잇는지 두 칸으로 확인한다.
  it("등록되지 않은 고객이면 포인트 두 칸을 0으로 잠근다", () => {
    const html = amounts();
    expect(input(html, "pointsUsedWon")).toMatch(/readOnly/i);
    expect(input(html, "pointsEarnedWon")).toMatch(/readOnly/i);
    expect(input(html, "pointsUsedWon")).toContain('value="0"');
    expect(html).toContain("등록 고객만");
    expect(html).not.toContain("보유 500P");
  });

  it("등록 고객이면 포인트칸을 열고 보유 포인트를 함께 보여준다", () => {
    const html = amounts({ customerId: "customer-1", points: 500 });
    expect(input(html, "pointsUsedWon")).not.toMatch(/readOnly/i);
    expect(input(html, "pointsEarnedWon")).not.toMatch(/readOnly/i);
    expect(html).toContain("보유 500P");
    expect(html).not.toContain("등록 고객만");
  });
});
