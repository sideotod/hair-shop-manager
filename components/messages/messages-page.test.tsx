import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createSalonStore } from "../../lib/salon-store";
import { MessagesPage } from "./messages-page";

function page(props: Partial<React.ComponentProps<typeof MessagesPage>> = {}) {
  const store = createSalonStore(":memory:");
  const snapshot = store.snapshot();
  return renderToStaticMarkup(<MessagesPage automations={snapshot.records.automations ?? []} customers={snapshot.records.customers ?? []} messages={snapshot.records.messages ?? []} requestKey="test-request" settings={snapshot.settings} {...props} />);
}

describe("MessagesPage", () => {
  it("provides three keyboard-reachable workflow tabs", () => {
    const html = page();

    expect(html).toContain('aria-label="문자 작업 영역"');
    expect(html).toContain('href="#compose"');
    expect(html).toContain('href="#automation"');
    expect(html).toContain('href="#history"');
  });

  it("keeps long recipient choices and previews inside bounded work areas", () => {
    const html = page();

    expect(html).toContain('data-message-recipient-list');
    expect(html).toContain('data-message-recipient-preview');
    expect(html).toContain('max-h-72');
    expect(html).toContain('max-h-[480px]');
  });

  it("renders desktop dry-run composition, recipient preview, and automation controls", () => {
    const html = page();

    expect(html).toContain('aria-label="문자 dry-run 저장"');
    expect(html).toContain("보내는 사람: 서원");
    expect(html).toContain('name="recipientIds"');
    expect(html).toContain("개별 수신자 (최대 3명)");
    expect(html).toContain("상태: dry-run");
    expect(html).toContain("자동 문자");
  });

  it("renders correction and empty recipient states", () => {
    expect(page({ customers: [], error: "SMS 잔여 건수가 부족합니다." })).toContain('role="alert"');
    expect(page({ customers: [] })).toContain("발송 가능한 고객이 없습니다.");
  });

  it("shows a non-color disabled state and disables queue controls", () => {
    const html = page({ settings: { smsEnabled: false, smsRemaining: 500 } });

    expect(html).toContain("SMS 기능 꺼짐");
    expect(html).toContain("문자 요청을 저장할 수 없습니다");
    expect(html).toContain('<fieldset disabled=""');
    expect(html).toContain('id="automation"');
  });

  // 최대 3명을 고르는 자리에 858개 체크박스를 그리던 구조를 검색으로 바꿨다.
  // 검색이 비어 있어도 후보가 보여야 JS 없이도 수신자를 고를 수 있다.
  it("bounds the recipient list and keeps it selectable without a search term", () => {
    const many = Array.from({ length: 120 }, (_, index) => ({
      id: `bulk-${index}`, kind: "customers" as const, value: { name: `고객${index}`, phone: `010-0000-${String(index).padStart(4, "0")}`, smsOptIn: true },
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", archivedAt: null,
    }));
    const html = page({ customers: many });

    expect((html.match(/name="recipientIds"/g) ?? []).length).toBe(20);
    expect(html).toContain('type="search"');
    // 정원과 남은 자리는 색이 아니라 글로 알린다.
    expect(html).toContain('role="status"');
    expect(html).toContain("0</span>/3명 선택");
    expect(html).toContain("120명 중");
  });

  // 저장된 ownerName 이 빈 문자열이면 "보내는 사람: " 라벨만 남았다.
  it("falls back to the default sender when the stored owner name is blank", () => {
    expect(page({ settings: { ownerName: "   ", smsEnabled: true, smsRemaining: 500 } })).toContain("보내는 사람: 서원");
  });
});
