import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createSalonStore } from "../../lib/salon-store";
import { CustomersPage } from "./customers-page";

describe("CustomersPage", () => {
  it("renders the complete FUNCTION.md 2.1–2.5 customer and waiting workflow", () => {
    const store = createSalonStore(":memory:");
    const snapshot = store.snapshot();
    const html = renderToStaticMarkup(<CustomersPage
      bookings={snapshot.records.bookings ?? []}
      customers={snapshot.records.customers ?? []}
      ledger={snapshot.ledger}
      messages={snapshot.records.messages ?? []}
      selectedCustomerId="customer-seed-1"
      settings={snapshot.settings}
      showNew
      showWaiting
      waitingCustomers={snapshot.records["waiting-customers"] ?? []}
    />);

    for (const label of ["성명", "성별", "휴대전화", "휴대전화 없음", "일반 전화", "주소 / 우편번호", "이메일", "SMS 수신", "생년월일", "생일 구분", "닉네임", "고객 등급", "고객 그룹", "방문 동기", "포인트", "포인트 카드", "패밀리 번호", "메모 (150자 이하)", "첫 만남 날짜", "가입일"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('maxLength="150"');
    expect(html).toContain("수신 거부");
    expect(html).toContain("양력");
    expect(html).toContain("음력");
    expect(html).toContain("등록 직후 SMS 발송");
    expect(html).toContain("초기 예약 날짜");
    expect(html).toContain("대기 고객 동시 등록");

    expect(html).toContain('aria-label="고객 검색 기준"');
    expect(html.match(/<select aria-label="고객 검색 기준"[^>]*>[\s\S]*?<\/select>/)?.[0].match(/<option value=/g)).toHaveLength(10);
    for (const label of ["기본 정보", "예약", "시술·결제", "상품", "포인트", "쿠폰·선불", "문자", "파워 고객", "매출 기준", "등급별", "그룹별", "성별", "방문동기", "최근 방문", "미방문", "생일 대상", "인쇄 양식 1", "인쇄 양식 2", "인쇄 양식 3", "인쇄 양식 4", "기존 회원 결제 이동", "대기 완료"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('href="/messages?customer=customer-seed-1"');
    expect(html).toContain('href="/sales/transactions?customer=customer-seed-2"');
  });

  it("renders explicit empty and selected-detail states without staff fields", () => {
    const seeded = createSalonStore(":memory:").snapshot();
    const html = renderToStaticMarkup(<CustomersPage bookings={[]} customers={[]} ledger={[]} messages={[]} settings={seeded.settings} waitingCustomers={[]} />);

    expect(html).toContain("조건에 맞는 고객이 없습니다.");
    expect(html).toContain("목록에서 고객을 선택하면 상세와 이력을 확인할 수 있습니다.");
    expect(html).toContain("대기 고객이 없습니다.");
    expect(html).not.toContain("디자이너");
    expect(html).not.toContain("직원");
  });
});
