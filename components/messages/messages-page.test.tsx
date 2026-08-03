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
  it("renders desktop dry-run composition, recipient preview, and automation controls", () => {
    const html = page();

    expect(html).toContain('data-app-shell-background');
    expect(html).toContain('href="/messages"');
    expect(html).toContain('aria-label="문자 dry-run 저장"');
    expect(html).toContain("보내는 사람: 원장");
    expect(html).toContain('name="recipientIds"');
    expect(html).toContain("개별 수신자 (최대 3명)");
    expect(html).toContain("상태: dry-run");
    expect(html).toContain("자동 문자");
  });

  it("renders correction and empty recipient states", () => {
    expect(page({ customers: [], error: "SMS 잔여 건수가 부족합니다." })).toContain('role="alert"');
    expect(page({ customers: [] })).toContain("발송 가능한 고객이 없습니다.");
  });
});
