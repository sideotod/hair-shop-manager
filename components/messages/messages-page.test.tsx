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
});
