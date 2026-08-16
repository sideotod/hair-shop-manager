import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PAYMENT_METHODS } from "../../lib/finance";
import { FALLBACK_SERVICE_MAJORS } from "../../lib/operations";
import type { JsonValue, SalonRecord } from "../../lib/salon-domain";
import { PaymentAmounts } from "./payment-amounts";
import { PaymentForm } from "./payment-form";

const at = { defaultDate: "2026-08-01", defaultTime: "14:37" };
const catalogItem = (name: string, type = "service-major"): SalonRecord<JsonValue> => ({
  id: `catalog-${name}`, kind: "catalog-items", value: { type, name }, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", archivedAt: null,
});

describe("PaymentForm", () => {
  it("renders all payment inputs and applies a preselected customer", () => {
    const html = renderToStaticMarkup(<PaymentForm customerId="customer-1" requestKey="payment-test-key" customers={[{ id: "customer-1", value: { name: "김하늘", points: 100 } }]} {...at} />);
    // 858명짜리 드롭다운도, 회원 구분칸도 없다. 이미 정해진 고객은 숨은 값 하나와 이름 한 줄이다.
    expect(html).toContain('name="customerId" value="customer-1"');
    expect(html).toContain("김하늘");
    expect(html).not.toContain('name="memberType"');
    for (const { key } of PAYMENT_METHODS) expect(html).toContain(`name="payment_${key}"`);
    for (const name of ["grossWon", "discountWon", "pointsUsedWon", "pointsEarnedWon", "vatMode", "cardFeeRate", "expenseWon", "generalNote", "medicineNote", "scalpNote", "hairNote"]) expect(html).toContain(`name="${name}"`);
  });

  it("renders all legacy service categories and preserves payment correction context with an accessible error", () => {
    const html = renderToStaticMarkup(<PaymentForm requestKey="payment-test-key" correctionTargetId="ledger-1" customerId="customer-1" customers={[{ id: "customer-1", value: { name: "고객", points: 100 } }]} error="Duplicate ledger requestKey" returnTo="/sales?tab=payment&customer=customer-1&correction=ledger-1" {...at} />);
    for (const service of FALLBACK_SERVICE_MAJORS) expect(html).toContain(`>${service}<`);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Duplicate ledger requestKey");
    expect(html).toContain('name="targetId" value="ledger-1"');
    expect(html).toContain('name="returnTo" value="/sales?tab=payment&amp;customer=customer-1&amp;correction=ledger-1"');
    expect(html).toContain('value="2026-08-01"');
  });

  /** `10:00` 고정은 `salon-briefing.ts:73` 의 시간대 분석 차단을 영구화한다. 리터럴이 다시 기어들면 여기서 걸린다. */
  it("takes both the payment date and time from the server instead of a hardcoded 10:00", () => {
    const html = renderToStaticMarkup(<PaymentForm customers={[]} requestKey="payment-test-key" {...at} />);

    expect(html).toContain('name="occurredDate" value="2026-08-01"');
    expect(html).toContain('name="occurredTime" value="14:37"');
    // 요약줄은 펼치지 않고도 무엇이 저장될지 보여야 한다 — 실제 값이어야 의미가 있다.
    expect(html).toContain("기록 · 2026-08-01 14:37");
    expect(html).not.toContain("10:00");
  });

  it("drives the service major list from the catalog and falls back to the legacy ten when it is empty", () => {
    const empty = renderToStaticMarkup(<PaymentForm customers={[]} requestKey="payment-test-key" {...at} />);
    for (const service of FALLBACK_SERVICE_MAJORS) expect(empty).toContain(`>${service}<`);

    const stocked = renderToStaticMarkup(<PaymentForm catalog={[catalogItem("두피케어"), catalogItem("탈색"), catalogItem("샴푸", "service-detail")]} customers={[]} requestKey="payment-test-key" {...at} />);
    expect(stocked).toContain(">두피케어<");
    expect(stocked).toContain(">탈색<");
    // `service-detail` 은 대분류가 아니다. 섞이면 결제 대분류에 상세 메뉴가 나타난다.
    expect(stocked).not.toContain(">샴푸<");
    expect(stocked).not.toContain(">커트<");
  });

  /** 정정 화면에서 대분류가 조용히 바뀌면 원장 기록이 달라진다. 카탈로그에 없어도 목록에 남는다. */
  it("keeps a correction's own service major even when the catalog dropped it", () => {
    const html = renderToStaticMarkup(<PaymentForm catalog={[catalogItem("두피케어")]} correctionTargetId="ledger-1" customers={[]} requestKey="payment-test-key" serviceMajor="옛시술" {...at} />);

    expect(html).toContain('<option selected="">옛시술</option>');
  });

  it("carries the booking into the ledger and says so on screen", () => {
    const html = renderToStaticMarkup(<PaymentForm booking={{ id: "booking-1", date: "2026-08-01", time: "14:37", customerName: "김하늘" }} customerId="customer-1" customers={[{ id: "customer-1", value: { name: "김하늘", points: 0 } }]} requestKey="payment-test-key" serviceDetail="뿌리펌" {...at} />);

    expect(html).toContain('name="bookingId" value="booking-1"');
    expect(html).toContain('name="serviceDetail" value="뿌리펌"');
    expect(html).toContain("예약 연결");
    expect(html).toContain("김하늘");
    // 예약이 없으면 hidden input 자체가 없어야 한다 — 빈 문자열이 `details.bookingId` 로 새면 안 된다.
    expect(renderToStaticMarkup(<PaymentForm customers={[]} requestKey="payment-test-key" {...at} />)).not.toContain('name="bookingId"');
  });

  it("uses persisted VAT mode and card fee defaults", () => {
    const html = renderToStaticMarkup(<PaymentForm customers={[]} requestKey="payment-test-key" settings={{ vatMode: "separate", cardFeeRate: 2.75 }} {...at} />);
    expect(html).toContain('<option value="separate" selected="">별도</option>');
    expect(html).toContain('name="cardFeeRate" value="2.75"');
  });

  /** 분할 결제 여섯 칸은 3개씩 선다. 한 줄에 늘어놓으면 칸이 좁아 금액이 잘렸다. */
  it("keeps payment tenders readable across the full payment workspace", () => {
    const html = renderToStaticMarkup(<PaymentForm customers={[]} requestKey="payment-test-key" {...at} />);
    expect(html).toContain("w-full max-w-none");

    const split = renderToStaticMarkup(<PaymentAmounts cardFeeRate={0} splitOpen vatMode="included" />);
    expect(split).toContain('data-payment-method-grid="true"');
    expect(split).toContain("grid-cols-3");
    // 여섯 칸이 전부 선다 — 나머지 세 수단은 숨은 값으로 나간다.
    for (const key of ["transfer", "cash", "card", "naverPay", "other", "prepaid"]) expect(split).toContain(`name="payment_${key}"`);
  });

  it("takes the idempotency key from the server instead of minting one per render", () => {
    const html = renderToStaticMarkup(<PaymentForm customers={[]} requestKey="payment-fixed-key" {...at} />);

    expect(html).toContain('name="requestKey" value="payment-fixed-key"');
  });
});
