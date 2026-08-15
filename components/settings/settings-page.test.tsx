import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { hashOwnerPassword, verifyOwnerPassword } from "../../lib/auth";
import { changeOwnerPasswordRecord, parseShopSettings, setInitialOwnerPasswordRecord, settingsErrorMessage } from "../../lib/settings";
import { createSalonStore } from "../../lib/salon-store";
import { SettingsPage } from "./settings-page";

function settingsForm(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe("settings validation", () => {
  it("rejects rates outside 0 through 100", () => {
    expect(() => parseShopSettings(settingsForm({ cardFeeRate: "101" }), {})).toThrow("0~100");
    expect(() => parseShopSettings(settingsForm({ cardFeeRate: "-0.1" }), {})).toThrow("0~100");
  });

  it("requires opening time before closing time", () => {
    expect(() => parseShopSettings(settingsForm({ bookingOpen: "21:00", bookingClose: "09:30" }), {})).toThrow("영업 시간");
  });

  it("accepts only six-digit hexadecimal display colors", () => {
    expect(() => parseShopSettings(settingsForm({ backgroundColor: "red" }), {})).toThrow("색상");
    expect(parseShopSettings(settingsForm({ backgroundColor: "#f7f5f6", foregroundColor: "#211a1f" }), {})).toMatchObject({ backgroundColor: "#f7f5f6", foregroundColor: "#211a1f" });
  });

  it("rejects visual tokens without readable contrast", () => {
    expect(() => parseShopSettings(settingsForm({ backgroundColor: "#ffffff", foregroundColor: "#ffffff" }), {})).toThrow("대비");
    expect(() => parseShopSettings(settingsForm({ brandColor: "#ffffff" }), {})).toThrow("대비");
    expect(() => parseShopSettings(settingsForm({ sidebarColor: "#ffffff" }), {})).toThrow("대비");
  });

  it("does not add visual defaults to unrelated settings saves", () => {
    expect(parseShopSettings(settingsForm({ shopName: "강남점" }), {})).toEqual({ shopName: "강남점" });
  });

  it("stores the existing booking reminder key and ignores the retired duplicate key", () => {
    expect(parseShopSettings(settingsForm({ reminderText: "예약 하루 전 안내" }), {})).toEqual({ reminderText: "예약 하루 전 안내" });
    expect(parseShopSettings(settingsForm({ bookingNoticeText: "unused" }), {})).toEqual({});
  });

  it("accepts a 150-character reminder and rejects longer text", () => {
    expect(parseShopSettings(settingsForm({ reminderText: "가".repeat(150) }), {})).toEqual({ reminderText: "가".repeat(150) });
    expect(() => parseShopSettings(settingsForm({ reminderText: "가".repeat(151) }), {})).toThrow("150자 이하");
  });

  it("keeps a settings save working when the stored hiddenMenus still holds the retired /operations path", () => {
    // 이미 저장된 설정 행에 `/operations` 가 남아 있어도 저장이 깨지면 안 된다 (설계 §5.2).
    // 폼은 그 값을 보내지 않으므로 사용자는 체크를 풀 방법도 없다 — 던지면 고객 정책이 영영 잠긴다.
    const formData = settingsForm({ section: "customer" });
    for (const value of ["/operations", "/messages"]) formData.append("hiddenMenus", value);

    expect(parseShopSettings(formData, {}).hiddenMenus).toEqual(["/messages"]);
    // 알 수 없는 경로는 여전히 거부한다. 검증이 헐거워진 게 아니다.
    const unknown = settingsForm({ section: "customer" });
    unknown.append("hiddenMenus", "/evil");
    expect(() => parseShopSettings(unknown, {})).toThrow("숨김 메뉴");
  });

  it("round-trips both booking reminder flags through the shop settings writer", () => {
    // `saveBookingSettingsRecord` 삭제로 유일한 writer 를 잃을 뻔한 두 칸이다 (설계 §5.3).
    expect(parseShopSettings(settingsForm({ section: "booking", reminderDayBefore: "on", reminderDayOf: "on" }), {}))
      .toMatchObject({ reminderDayBefore: true, reminderDayOf: true });
    expect(parseShopSettings(settingsForm({ section: "booking" }), {}))
      .toMatchObject({ reminderDayBefore: false, reminderDayOf: false, bookingAllowOverlap: false });
  });

  it("still rejects slot-inconsistent booking hours through the surviving writer", () => {
    // writer 가 하나가 됐다고 검증이 약해지지 않았다. `lib/settings.ts:86` 이 `bookingSettings()` 를 부른다.
    expect(() => parseShopSettings(settingsForm({ section: "booking", bookingOpen: "09:45", bookingClose: "21:00", bookingSlotMinutes: "30" }), {})).toThrow("영업 시간");
    expect(() => parseShopSettings(settingsForm({ section: "booking", bookingOpen: "09:30", bookingClose: "21:00", bookingSlotMinutes: "7" }), {})).toThrow("예약 시간 단위");
  });

  it("confirms and hashes a changed owner password without persisting plaintext", () => {
    const store = createSalonStore(":memory:");
    try {
      store.saveSettings({ ownerPasswordHash: hashOwnerPassword("current-password", "current-salt") }, "사용자");
      const formData = settingsForm({ currentPassword: "current-password", newPassword: "changed-password", confirmPassword: "changed-password" });

      changeOwnerPasswordRecord(store, formData);

      const snapshot = store.snapshot();
      const storedHash = String(snapshot.settings.ownerPasswordHash);
      expect(verifyOwnerPassword("changed-password", storedHash)).toBe(true);
      expect(JSON.stringify(snapshot.settings)).not.toContain("changed-password");
      expect(JSON.stringify(snapshot.auditEvents.at(-1)?.payload)).not.toContain("changed-password");
      expect(snapshot.auditEvents.at(-1)?.actor).toBe("사용자");
    } finally {
      store.close();
    }
  });

  it("requires matching password confirmation", () => {
    const store = createSalonStore(":memory:");
    try {
      store.saveSettings({ ownerPasswordHash: hashOwnerPassword("current-password", "current-salt") }, "사용자");
      expect(() => changeOwnerPasswordRecord(store, settingsForm({ currentPassword: "current-password", newPassword: "changed-password", confirmPassword: "different-password" }))).toThrow("확인");
    } finally {
      store.close();
    }
  });

  it("rejects a wrong current password and an empty new password", () => {
    const store = createSalonStore(":memory:");
    try {
      store.saveSettings({ ownerPasswordHash: hashOwnerPassword("current-password", "current-salt") }, "사용자");
      expect(() => changeOwnerPasswordRecord(store, settingsForm({ currentPassword: "wrong-password", newPassword: "changed-password", confirmPassword: "changed-password" }))).toThrow("현재 비밀번호");
      expect(() => changeOwnerPasswordRecord(store, settingsForm({ currentPassword: "current-password", newPassword: "", confirmPassword: "" }))).toThrow("새 비밀번호를 입력");
      // 길이 제한은 없앴다. 짧은 비밀번호도 그대로 통과한다.
      changeOwnerPasswordRecord(store, settingsForm({ currentPassword: "current-password", newPassword: "1", confirmPassword: "1" }));
      expect(verifyOwnerPassword("1", String(store.getSettings().ownerPasswordHash))).toBe(true);
    } finally {
      store.close();
    }
  });

  it("sets the first password only while none is stored", () => {
    const store = createSalonStore(":memory:");
    try {
      setInitialOwnerPasswordRecord(store, settingsForm({ newPassword: "first-password", confirmPassword: "first-password" }));

      expect(verifyOwnerPassword("first-password", String(store.getSettings().ownerPasswordHash))).toBe(true);
      expect(() => setInitialOwnerPasswordRecord(store, settingsForm({ newPassword: "second", confirmPassword: "second" }))).toThrow("이미 설정");
    } finally {
      store.close();
    }
  });

  it("preserves password whitespace exactly instead of trimming it", () => {
    const store = createSalonStore(":memory:");
    try {
      store.saveSettings({ ownerPasswordHash: hashOwnerPassword(" current-password ", "current-salt") }, "사용자");
      changeOwnerPasswordRecord(store, settingsForm({ currentPassword: " current-password ", newPassword: " changed-password ", confirmPassword: " changed-password " }));
      expect(verifyOwnerPassword(" changed-password ", String(store.getSettings().ownerPasswordHash))).toBe(true);
      expect(verifyOwnerPassword("changed-password", String(store.getSettings().ownerPasswordHash))).toBe(false);
    } finally {
      store.close();
    }
  });

  it("keeps known validation errors but redacts operational details from redirect queries", () => {
    const secret = "plain-password-from-sqlite";
    const query = new URLSearchParams({ error: settingsErrorMessage(new Error(`SQLITE_BUSY: ${secret}`)) }).toString();

    expect(new URLSearchParams(query).get("error")).toBe("설정을 저장하지 못했습니다.");
    expect(query).not.toContain(secret);
    expect(settingsErrorMessage(new Error("현재 비밀번호를 확인하세요."))).toBe("현재 비밀번호를 확인하세요.");
  });
});

describe("SettingsPage", () => {
  const props = {
    auditEvents: [{ id: "audit-1", occurredAt: "2026-08-03T00:00:00.000Z", actor: "사용자", action: "save-settings", kind: "settings", recordId: "1", payload: {} }],
    error: "",

    notice: "",
    notices: [{ id: "notice-1", kind: "notices", value: { title: "운영 공지", body: "공지 내용", operator: "사용자" }, createdAt: "2026-08-03T00:00:00.000Z", updatedAt: "2026-08-03T00:00:00.000Z", archivedAt: null }],
    settings: { shopName: "강남점", ownerName: "민지", hiddenMenus: ["/messages"], backgroundColor: "#f7f5f6", foregroundColor: "#211a1f" },
  } as const;

  it("renders every settings section in a horizontal navigation bar", () => {
    const html = renderToStaticMarkup(<SettingsPage {...props} section="payment" />);

    expect(html).toContain('aria-label="설정 세부 메뉴"');
    for (const label of ["계정 설정", "고객 정책", "결제 정책", "예약", "시술 가격", "외부 연동", "도움말 · 공지"]) expect(html).toContain(`>${label}<`);
    expect(html).toContain('data-settings-active-indicator="true"');
    const activeTab = html.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0] ?? "";
    expect(activeTab).toContain("bg-transparent");
  });

  it("keeps the active settings content in the full horizontal work area below the section menu", () => {
    const html = renderToStaticMarkup(<SettingsPage {...props} section="payment" />);

    expect(html).toMatch(/data-settings-detail="true" class="w-full max-w-\[1180px\]"/);
  });

  it("renders one account surface with both forms kept separate", () => {
    const html = renderToStaticMarkup(<SettingsPage {...props} section="owner" />);
    expect(html).toContain("계정 설정");
    expect(html).toContain('name="ownerName"');
    expect(html).toContain('value="민지"');
    expect(html).toContain('name="confirmPassword"');
    // 표면만 합쳤다. 폼이 하나가 되면 매장명을 고칠 때마다 비밀번호 세 칸이 같이 전송된다.
    // 셋: 매장 정보 · 비밀번호 · 로그아웃. 로그아웃은 사이드바 매장 카드에서 옮겨왔다.
    expect(html.match(/<form/g)).toHaveLength(3);
    expect(html).toContain('aria-label="매장과 사용자 정보"');
    expect(html).toContain('aria-label="사용자 비밀번호 변경"');
    // 로그아웃은 링크가 아니라 제출 버튼이다. GET 링크면 브라우저 선반입만으로 세션이 끊긴다.
    expect(html).toContain(">로그아웃</button>");
    // 구역 목록은 단순화된 사이드바 대신 본문 상단에 한 벌만 둔다.
    expect(html).not.toContain('aria-label="설정 구역"');
    expect(html).toContain('aria-label="설정 세부 메뉴"');
    expect(html).not.toContain("상품 설정");
    expect(html).not.toContain("쿠폰 설정");
  });

  /** 삭제된 두 구역. 어떤 `?section=` 으로도 다시 나오면 안 된다. */
  it("no longer renders the memo presets or the messaging forwarder", () => {
    for (const section of ["memos", "messages"]) {
      const html = renderToStaticMarkup(<SettingsPage {...props} section={section} />);
      // 모르는 구역은 첫 구역(계정 설정)으로 떨어진다.
      expect(html).toContain("계정 설정");
      for (const label of ["두피 상태", "모발 특징", "선택 메모", "사은품", "간편 메모", "문자 자동화"]) expect(html).not.toContain(label);
      expect(html).not.toContain('href="/messages#automation"');
      expect(html).not.toContain('name="presetType"');
    }
  });

  it("never offers raw visual token fields to the owner", () => {
    const html = renderToStaticMarkup(<SettingsPage {...props} settings={{ shopName: "강남점", ownerName: "민지" }} section="customer" />);
    for (const name of ["backgroundColor", "foregroundColor", "brandColor", "sidebarColor"]) expect(html).not.toContain(`name="${name}"`);
  });

  it("renders customer, payment, and booking policies", () => {
    const customer = renderToStaticMarkup(<SettingsPage {...props} section="customer" />);
    expect(customer).toContain("사이드 메뉴 숨김");
    expect(customer).toContain("서버의 사용자 전용 경로 보호는 그대로 유지됩니다.");
    const payment = renderToStaticMarkup(<SettingsPage {...props} section="payment" />);
    expect(payment).toContain("선불 결제 대체 흐름");
    expect(payment).toContain('href="/sales"');
    expect(payment).not.toContain('href="/prepaid"');
    expect(payment).not.toContain('name="balance"');
    const booking = renderToStaticMarkup(<SettingsPage {...props} section="booking" />);
    expect(booking).toContain('name="bookingOpen"');
    expect(booking).toContain('name="bookingClose"');
    expect(booking).toContain('name="reminderText"');
    // 예약 화면 폼에서 옮겨온 두 칸. 여기가 사라지면 알림 설정이 저장될 곳을 잃는다 (설계 §5.3).
    expect(booking).toContain('name="reminderDayBefore"');
    expect(booking).toContain('name="reminderDayOf"');
    expect(booking).not.toContain('name="bookingNoticeText"');
  });

  it("shows Naver mail metadata and a booking link without credentials", () => {
    const disconnected = renderToStaticMarkup(<SettingsPage {...props} section="integrations" />);
    expect(disconnected).toContain('href="/bookings"');
    for (const label of ["스마트플레이스 회원 가입", "기존 네이버 예약 코드", "네이버 메일 주소 = 네이버 계정", "매장 = Hairhaeyo 단일 매장", "담당자 = 사용자 1인", "예약 연동 FAQ", "직접 API·코드 연동을 제공하지 않습니다."]) expect(disconnected).toContain(label);
    for (const url of ["https://smartplace.naver.com/", "https://help.naver.com/", "https://help.pay.naver.com/", "https://booking.naver.com/"]) {
      const tag = disconnected.match(new RegExp(`<a[^>]*href="${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`))?.[0] ?? "";
      expect(tag).toContain('target="_blank"');
      expect(tag).toContain('rel="noopener noreferrer"');
      expect(tag).toContain('aria-label=');
    }
    const integrations = renderToStaticMarkup(<SettingsPage {...props} settings={{ ...props.settings, naverMail: { email: "owner@naver.com", provider: "naver", connected: true, lastSyncUid: 18372, lastSyncAt: "2026-08-03T15:18:00" } }} section="integrations" />);
    for (const label of ["owner@naver.com", "18372", "2026-08-03T15:18:00"]) expect(integrations).toContain(label);
    for (const secret of ["applicationPassword", "clientSecret", "NAVER_RESERVATION_CLIENT_SECRET"]) expect(integrations).not.toContain(secret);    const help = renderToStaticMarkup(<SettingsPage {...props} section="help" />);
    expect(help).toContain("도움말 · FAQ");
    expect(help).toContain("운영 공지");
    expect(help).toContain("설정 변경 이력");
    expect(help).toContain("사용자");
    expect(help).toContain('id="terms"');
    expect(help).toContain("서비스 이용약관");
    expect(help).toContain("불변 거래 원장");
    for (const hidden of ["문자가 실제 발송되나요?", "SMS", "공급자 연결 전까지 dry-run"]) expect(help).not.toContain(hidden);
  });

  /** `/operations` 의 시술 탭이 옮겨온 자리. 화면이 사라진 게 아니라 집이 바뀐 것이다 (설계 §5.2). */
  it("renders the relocated service catalog section", () => {
    const catalog = [
      { id: "major", kind: "catalog-items", value: { type: "service-major", name: "커트", category: "", priceWon: 0 }, createdAt: "", updatedAt: "", archivedAt: null },
      { id: "detail", kind: "catalog-items", value: { type: "service-detail", name: "여성 커트", category: "커트", priceWon: 25000 }, createdAt: "", updatedAt: "", archivedAt: null },
    ];
    const services = renderToStaticMarkup(<SettingsPage {...props} catalog={catalog} requestKey="ops-fixed-key" section="services" />);
    expect(services).toContain("시술 분류·가격 등록");
    expect(services).toContain("여성 커트");
    expect(services).toContain('name="catalogId" value="catalog-ops-fixed-key"');
    expect(services).not.toContain("/operations");

    const edit = renderToStaticMarkup(<SettingsPage {...props} catalog={catalog} editCatalogId="detail" section="services" />);
    expect(edit).toContain('data-catalog-edit="detail"');
    expect(edit).toContain('type="hidden" name="catalogId" value="detail"');
    expect(edit).toContain('name="name" value="여성 커트"');
  });

  it("redacts operational errors and password values from rendered HTML", () => {    const secret = "plain-password-from-sqlite";
    const html = renderToStaticMarkup(<SettingsPage {...props} error={`SQLITE_BUSY: ${secret}`} section="owner" />);

    expect(html).toContain("설정을 저장하지 못했습니다.");
    expect(html).not.toContain("SQLITE_BUSY");
    expect(html).not.toContain(secret);
  });
});
