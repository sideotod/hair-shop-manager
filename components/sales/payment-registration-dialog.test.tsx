import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LedgerEntry } from "../../lib/salon-domain";
import { PaymentRegistrationDialog } from "./payment-registration-dialog";
import { formatWonInput, PaymentAmounts, splitTender } from "./payment-amounts";
import { PaymentRegistrationModal } from "./payment-registration-modal";

describe("PaymentRegistrationDialog", () => {
  it("keeps the 09A base width while the 09D side panel owns the expansion", () => {
    const html = renderToStaticMarkup(<PaymentRegistrationDialog closeHref="/customers" customers={[]} defaultDate="2026-08-14" defaultTime="14:30" requestKey="payment-test" settings={{}} />);
    expect(html).toContain('data-payment-registration-dialog="true"');
    // 09A is 860px. When 09D opens, the nested 0fr → 1fr grid grows the
    // dialog by the panel's own 236px plus its 16px margin — no absolute
    // panel or separate container-width animation may desynchronise it.
    expect(html).toContain('min-w-[860px]');
    // 공통 `[data-dialog-panel]`의 1120px 폭보다 이 모달의 내용 폭이 우선한다.
    expect(html).toContain('!w-fit');
    expect(html).toContain('transition-[grid-template-columns]');
    expect(html).toContain('ml-4 flex h-full w-[236px]');
    expect(html).not.toContain('absolute left-[414px]');
    expect(html).not.toContain('w-[1240px]');
    expect(html).toContain('grid-cols-2');
    expect(html).toContain('h-9');
    expect(html).toContain('href="/customers"');
  });

  it("keeps the server payment contract while a selected customer is shown in the modal", () => {
    const html = renderToStaticMarkup(<PaymentRegistrationDialog closeHref="/customers?customer=customer-1" customerId="customer-1" customers={[{ id: "customer-1", value: { name: "김하늘", points: 300 } }]} defaultDate="2026-08-14" defaultTime="14:30" requestKey="payment-test" returnTo="/customers?customer=customer-1" settings={{}} />);

    expect(html).toContain('type="hidden" name="customerId" value="customer-1"');
    expect(html).toContain('type="hidden" name="requestKey" value="payment-test"');
    expect(html).toContain('name="payment_cash"');
    expect(html).toContain('type="hidden" name="expenseWon" value="0"');
    expect(html).not.toContain('name="memberType"');
  });

  it("keeps split payment inside the same 09 dialog shell and renders one payment-amount readout", () => {
    const html = renderToStaticMarkup(<PaymentAmounts cardFeeRate={0} dialog splitOpen vatMode="included" />);

    expect(html.match(/결제 금액/g)).toHaveLength(1);
    expect(html).not.toContain("실결제");
    expect(html).not.toContain("나머지를 받을 칸");
    expect(html).toContain('data-payment-method-grid="true"');
    expect(html).toContain("mt-auto");
    expect(html).not.toContain("overflow-y-auto");
    expect(html).toContain("!h-9");
    expect(html.indexOf(">카드<")).toBeLessThan(html.indexOf(">현금<"));
    expect(html.indexOf(">현금<")).toBeLessThan(html.indexOf(">계좌이체<"));
  });

  it("uses the same six-method order and card default for single payment", () => {
    const html = renderToStaticMarkup(<PaymentAmounts cardFeeRate={0} dialog vatMode="included" />);

    const card = html.indexOf('<option value="card" selected="">카드</option>');
    const cash = html.indexOf('<option value="cash">현금</option>');
    const transfer = html.indexOf('<option value="transfer">계좌이체</option>');
    expect(card).toBeGreaterThan(-1);
    expect(card).toBeLessThan(cash);
    expect(cash).toBeLessThan(transfer);
    expect(html).not.toContain('option value="cashReceipt"');
    expect(html).not.toContain('option value="zeroPay"');
  });

  it("pins the 09A body and footer so payment-method choices cannot change dialog height", () => {
    const html = renderToStaticMarkup(<PaymentRegistrationDialog closeHref="/customers" customers={[]} defaultDate="2026-08-14" defaultTime="14:30" requestKey="payment-test" settings={{}} />);

    expect(html).toContain('h-[601px]');
    expect(html).toContain('h-[509px]');
    expect(html).toContain('min-w-[136px]');
    expect(html).toContain('min-w-[96px]');
  });
});

describe("post-payment unknown-customer prompt", () => {
  it("opens only after a saved non-member payment and offers customer registration", () => {
    const payment = { id: "payment-1", kind: "payment", occurredAt: "2026-08-15T12:00:00.000Z", amountWon: 10000, details: { customerName: "새 고객" } } as unknown as LedgerEntry;
    const html = renderToStaticMarkup(<PaymentRegistrationModal bookings={[]} catalog={[]} customers={[]} ledger={[payment]} pathname="/sales" searchParams={{ firstVisitPayment: "payment-1" }} settings={{}} />);

    expect(html).toContain("목록에 없는 고객이에요");
    expect(html).toContain("결제는 비회원으로 등록했습니다.");
    expect(html).toContain('href="/customers?new=1&amp;firstVisitPayment=payment-1"');
  });
});

describe("formatWonInput", () => {
  it("formats the canonical integer only for the visible money field", () => {
    expect(formatWonInput("0")).toBe("0");
    expect(formatWonInput("50000")).toBe("50,000");
    expect(formatWonInput("1200000")).toBe("1,200,000");
  });
});

describe("splitTender", () => {
  it("keeps the split balance on the single-payment method and reduces it by the other tender amounts", () => {
    expect(splitTender("naverPay", "naverPay", 100, {})).toBe("100");
    expect(splitTender("naverPay", "naverPay", 100, { cash: "50" })).toBe("50");
    expect(splitTender("naverPay", "naverPay", 100, { cash: "50", transfer: "30" })).toBe("20");
    expect(splitTender("cash", "naverPay", 100, { cash: "50" })).toBe("50");
  });
});
