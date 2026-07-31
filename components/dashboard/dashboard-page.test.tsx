import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createSalonStore } from "../../lib/salon-store";
import { AppShell } from "../app-shell";
import { DashboardPage } from "./dashboard-page";

const today = new Date("2026-07-31T03:00:00.000Z");

describe("DashboardPage", () => {
  it("renders the owner operations dashboard from one salon snapshot", () => {
    const snapshot = createSalonStore(":memory:").snapshot();
    const html = renderToStaticMarkup(<DashboardPage snapshot={snapshot} today={today} />);

    expect(html).toContain("HAIRHAEYO");
    expect(html).toContain("헤어해요 · SALON MANAGEMENT");
    expect(html).toContain("수원 본점");
    expect(html).toContain("원장님");
    expect(html).not.toContain("원장 원장님");
    expect(html).not.toContain("직원");
    expect(html).not.toContain("디자이너");

    for (const label of ["오늘", "고객", "예약", "매출·결제", "문자", "상품·쿠폰", "설정"]) {
      expect(html).toContain(`>${label}<`);
    }
    for (const mode of ["핸드폰 뒷번호/고객명", "닉네임", "전화번호 뒷번호", "그룹명", "메모", "주소", "방문동기", "이메일", "포인트 카드", "패밀리번호"]) {
      expect(html).toContain(`>${mode}<`);
    }
    expect(html.match(/<option value=/g)).toHaveLength(10);
    expect(html).toContain('href="/customers?customer=customer-seed-1"');
    expect(html).toContain("SMS 잔여 500건");
    expect(html).toContain("도움말");
    expect(html).toContain("로그아웃");

    expect(html).toContain("오늘 매출");
    expect(html).toContain("오늘 예약");
    expect(html).toContain("대기 고객");
    expect(html).toContain("오늘 1건");
    expect(html).toContain("내일 1건");
    expect(html).toContain("모레 1건");
    expect(html).toContain("글피 1건");
    expect(html).toContain("박봄");
    expect(html).toContain("자동화 대기열");
    expect(html).toContain("사용");
    expect(html).toContain("중지");
    expect(html).toContain("운영 안내");
    expect(html).toContain("최근 감사 이력");

    for (const href of ["/customers?new=1", "/customers?waiting=1", "/bookings?new=1", "/sales/transactions?new=1", "/messages?new=1"]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("uses the configured owner label and renders explicit empty states", () => {
    const seeded = createSalonStore(":memory:").snapshot();
    const snapshot = {
      ...seeded,
      records: {},
      ledger: [],
      auditEvents: [],
      settings: { ...seeded.settings, ownerName: "이수진", smsRemaining: 0 },
    };
    const html = renderToStaticMarkup(<DashboardPage snapshot={snapshot} today={today} />);

    expect(html).toContain("이수진 원장님");
    expect(html).toContain("SMS 잔여 0건");
    expect(html).toContain("오늘 예약이 없습니다.");
    expect(html).toContain("대기 고객이 없습니다.");
    expect(html).toContain("대기 중인 자동화가 없습니다.");
    expect(html).toContain("공지사항이 없습니다.");
    expect(html).toContain("감사 이력이 없습니다.");
  });

  it("excludes malformed dates and renders an explicit correction warning", () => {
    const seeded = createSalonStore(":memory:").snapshot();
    const snapshot = {
      ...seeded,
      records: {
        ...seeded.records,
        bookings: [
          ...(seeded.records.bookings ?? []),
          {
            id: "booking-malformed",
            kind: "bookings",
            value: { customerId: "customer-seed-1", startsAt: "not-a-date", service: "깨진 날짜 예약", status: "confirmed" },
            createdAt: "2026-07-31T00:00:00.000Z",
            updatedAt: "2026-07-31T00:00:00.000Z",
            archivedAt: null,
          },
        ],
      },
      ledger: [{
        id: "ledger-malformed",
        requestKey: "malformed-ledger-date",
        kind: "payment",
        occurredAt: "not-a-date",
        correctionOf: null,
        amountWon: 999999999,
        vatWon: 0,
        feeWon: 0,
        incentiveWon: 0,
        pointsWon: 0,
        couponWon: 0,
        profitWon: 999999999,
      }],
      auditEvents: [{
        id: "audit-malformed",
        occurredAt: "not-a-date",
        actor: "원장",
        action: "malformed-audit",
        kind: "audit",
        recordId: null,
        payload: null,
      }],
    };

    const html = renderToStaticMarkup(<DashboardPage snapshot={snapshot} today={today} />);

    expect(html).toContain("날짜 확인 필요: 3건");
    expect(html).toContain("오늘 1건");
    expect(html).not.toContain("오늘 2건");
    expect(html).not.toContain("깨진 날짜 예약");
    expect(html).toContain("₩0");
    expect(html).not.toContain("₩999,999,999");
    expect(html).toContain("원장 · malformed-audit");
    expect(html).toContain("audit · 날짜 확인 필요");
  });

  it("preserves inert background behavior while an overlay is open", () => {
    const html = renderToStaticMarkup(
      <AppShell
        activeHref="/"
        customers={[]}
        overlay={<div role="dialog">고객 상세</div>}
        ownerName="원장"
        shopName="수원 본점"
        smsRemaining={500}
      >
        <main>배경</main>
      </AppShell>,
    );

    expect(html).toContain("data-app-shell-background");
    expect(html).toContain("inert");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('role="dialog"');
  });
});
