import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NaverMailConnection } from "./naver-mail-connection";

describe("NaverMailConnection", () => {
  it("renders the eight-step secure connection flow without a stored secret", () => {
    const html = renderToStaticMarkup(<NaverMailConnection history={[]} settings={{ naverMail: { email: "owner@naver.com", provider: "naver", connected: true, lastSyncUid: 18372, lastSyncAt: "2026-07-31T15:18:00" } }} />);

    for (const label of ["연동 방식·개인정보 안내", "네이버 메일 주소 입력", "애플리케이션 비밀번호 입력", "연결 테스트", "예약 관련 메일 자동 탐색", "초기 예약 데이터 불러오기", "앱 실행 시 신규 메일 동기화"]) expect(html).toContain(label);
    expect(html).toContain("Windows Credential Manager");
    expect(html).toContain("18372");
    expect(html).not.toContain("application-password-secret");
  });
});
