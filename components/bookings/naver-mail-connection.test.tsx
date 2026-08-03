import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NaverMailConnection } from "./naver-mail-connection";

describe("NaverMailConnection", () => {
  it("renders the user-approved mail replacement and official Naver help links", () => {
    const html = renderToStaticMarkup(<NaverMailConnection history={[]} settings={{}} />);

    for (const label of ["스마트플레이스 회원 가입", "기존 네이버 예약 코드", "네이버 메일 주소 = 네이버 계정", "매장 = Hairhaeyo 단일 매장", "담당자 = 원장 1인", "예약 연동 FAQ", "직접 API·코드 연동을 제공하지 않습니다."]) expect(html).toContain(label);
    for (const url of ["https://smartplace.naver.com/", "https://help.naver.com/", "https://help.pay.naver.com/", "https://booking.naver.com/"]) {
      const tag = html.match(new RegExp(`<a[^>]*href="${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`))?.[0] ?? "";
      expect(tag).toContain('target="_blank"');
      expect(tag).toContain('rel="noopener noreferrer"');
      expect(tag).toContain('aria-label=');
    }
  });

  it("renders the eight-step secure connection flow without a stored secret", () => {
    const html = renderToStaticMarkup(<NaverMailConnection history={[]} settings={{ naverMail: { email: "owner@naver.com", provider: "naver", connected: true, lastSyncUid: 18372, lastSyncAt: "2026-07-31T15:18:00" } }} />);

    for (const label of ["연동 방식·개인정보 안내", "네이버 메일 주소 입력", "애플리케이션 비밀번호 입력", "연결 테스트", "예약 관련 메일 자동 탐색", "초기 예약 데이터 불러오기", "앱 실행 시 신규 메일 동기화"]) expect(html).toContain(label);
    expect(html).toContain("Windows Credential Manager");
    expect(html).toContain("18372");
    expect(html).not.toContain("application-password-secret");
  });

  it("renders the stored safe correction message in sync history", () => {
    const html = renderToStaticMarkup(<NaverMailConnection history={[{ id: "sync-error", kind: "naver-syncs", value: { status: "error", result: "incremental-sync-failed", message: "메일 주소와 애플리케이션 비밀번호를 다시 확인하세요.", attemptedAt: "2026-08-03T10:00:00" }, createdAt: "2026-08-03T10:00:00", updatedAt: "2026-08-03T10:00:00", archivedAt: null }]} settings={{ naverMail: { email: "owner@naver.com", provider: "naver", connected: true, lastSyncUid: 18372, lastSyncAt: "2026-07-31T15:18:00" } }} />);

    expect(html).toContain("메일 주소와 애플리케이션 비밀번호를 다시 확인하세요.");
  });
});
