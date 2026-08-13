import { describe, expect, it } from "vitest";

import { activeNavigationItem, closeHref, matchNavigationItem, navigationItems, paymentReturnTo, resolveSettingsSection, settingsSections } from "./navigation";

describe("matchNavigationItem", () => {
  it("prefers the exact path over a shorter prefix", () => {
    expect(matchNavigationItem("/sales/transactions").title).toBe("거래 기록");
    expect(matchNavigationItem("/sales").title).toBe("매출 분석");
  });

  it("keeps the sidebar on the parent for child routes", () => {
    expect(activeNavigationItem("/sales/transactions").path).toBe("/sales");
    expect(activeNavigationItem("/sales").path).toBe("/sales");
  });

  it("matches on segment boundaries, not substrings", () => {
    // "/salesperson" must not resolve to "/sales".
    expect(matchNavigationItem("/salesperson").path).toBe("/");
    expect(matchNavigationItem("/").title).toBe("오늘");
  });

  it("exposes one entry per sidebar destination", () => {
    // `/operations` 가 빠져 6 항목이다 — 지출은 `/sales`, 시술·메모는 `/settings` 로 갔다 (설계 §5.2).
    expect(navigationItems.filter((item) => !item.parentId).map((item) => item.path)).toEqual([
      "/", "/customers", "/bookings", "/sales", "/messages", "/settings",
    ]);
  });
});

/**
 * 구역 목록은 사이드바(`components/app-shell.tsx`)와 설정 화면이 함께 본다.
 * 예전에 목록이 두 벌이라 한쪽에만 있는 구역이 생겼다 — 원본이 하나인지 여기서 지킨다.
 */
describe("settingsSections", () => {
  it("keeps the owner-approved seven and drops the deleted two", () => {
    expect(settingsSections.map(([key]) => key)).toEqual(["owner", "customer", "payment", "booking", "services", "integrations", "help"]);
    // 예약은 `bookingOpen`·`reminderDayBefore` 등의 유일한 writer 다. 사라지면 저장할 곳이 없다 (설계 §5.3).
    expect(settingsSections.find(([key]) => key === "booking")?.[1]).toBe("예약");
    expect(settingsSections.find(([, label]) => label === "계정 설정")?.[0]).toBe("owner");
  });

  it("falls back to the first section for unknown or missing keys", () => {
    // 깊은 링크(`?section=owner` `?section=booking`)는 그대로 열려야 한다.
    for (const key of ["owner", "booking", "help"]) expect(resolveSettingsSection(key)).toBe(key);
    // 지운 두 구역의 옛 링크는 조용히 첫 구역으로 떨어진다 — 사이드바와 본문이 갈라지면 안 된다.
    for (const key of ["memos", "messages", "evil", "", undefined]) expect(resolveSettingsSection(key)).toBe("owner");
  });
});

describe("closeHref", () => {
  it("drops only the modal keys and keeps every other parameter", () => {
    expect(closeHref("/customers", new URLSearchParams("mode=phone&query=010&customer=c-12&new=1"), "new", "waiting"))
      .toBe("/customers?mode=phone&query=010&customer=c-12");
  });

  it("keeps booking edit and notice state when the create dialog closes", () => {
    expect(closeHref("/bookings", new URLSearchParams("date=2026-08-06&view=day&edit=b-1&notice=saved&new=1"), "new"))
      .toBe("/bookings?date=2026-08-06&view=day&edit=b-1&notice=saved");
  });

  it("returns a bare pathname when nothing is left", () => {
    expect(closeHref("/customers", new URLSearchParams("new=1"), "new")).toBe("/customers");
  });
});

/**
 * 브라우저로 잡은 결함이다. 라우트가 예약이 붙여 보낸 `returnTo` 를 무시하고 자기 경로를 다시
 * 조립해, 예약에서 출발한 결제가 저장 뒤 예약 목록이 아니라 빈 결제 폼으로 떨어졌다.
 * 판정이 라우트와 서버 액션 두 곳에 필요해 함수 하나로 모았다 — 여기서 그 한 벌을 지킨다.
 */
describe("paymentReturnTo", () => {
  it("예약·고객·거래 기록에서 온 복귀 경로를 그대로 돌려준다", () => {
    for (const path of ["/bookings?date=2026-08-13", "/bookings", "/customers?customer=c-1", "/sales/transactions", "/sales?tab=payment"]) {
      expect(paymentReturnTo(path, "/fallback")).toBe(path);
    }
  });

  it("허용 목록 밖은 전부 기본 경로로 떨어뜨린다", () => {
    // `/bookingsX` 는 접두사만 같다. `//evil.com` 은 프로토콜 상대 URL 로 바깥을 가리킨다.
    // `/` 는 일부러 뺐다 — 앞이 고정된 대안들 사이에 두면 실수하기 쉽다(`navigation.ts` 주석).
    for (const bad of ["/bookingsX", "//evil.com", "https://evil.com", "/", "/messages", "", undefined, null, 7]) {
      expect(paymentReturnTo(bad, "/sales?tab=payment")).toBe("/sales?tab=payment");
    }
  });
});
