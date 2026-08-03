import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { hashOwnerPassword, verifyOwnerPassword } from "../../lib/auth";
import { changeOwnerPasswordRecord, parseShopSettings, settingsErrorMessage } from "../../lib/settings";
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

  it("confirms and hashes a changed owner password without persisting plaintext", () => {
    const store = createSalonStore(":memory:");
    try {
      store.saveSettings({ ownerPasswordHash: hashOwnerPassword("current-password", "current-salt") }, "원장");
      const formData = settingsForm({ currentPassword: "current-password", newPassword: "changed-password", confirmPassword: "changed-password" });

      changeOwnerPasswordRecord(store, formData);

      const snapshot = store.snapshot();
      const storedHash = String(snapshot.settings.ownerPasswordHash);
      expect(verifyOwnerPassword("changed-password", storedHash)).toBe(true);
      expect(JSON.stringify(snapshot.settings)).not.toContain("changed-password");
      expect(JSON.stringify(snapshot.auditEvents.at(-1)?.payload)).not.toContain("changed-password");
      expect(snapshot.auditEvents.at(-1)?.actor).toBe("원장");
    } finally {
      store.close();
    }
  });

  it("requires matching password confirmation", () => {
    const store = createSalonStore(":memory:");
    try {
      store.saveSettings({ ownerPasswordHash: hashOwnerPassword("current-password", "current-salt") }, "원장");
      expect(() => changeOwnerPasswordRecord(store, settingsForm({ currentPassword: "current-password", newPassword: "changed-password", confirmPassword: "different-password" }))).toThrow("확인");
    } finally {
      store.close();
    }
  });

  it("rejects a wrong current password and a short new password", () => {
    const store = createSalonStore(":memory:");
    try {
      store.saveSettings({ ownerPasswordHash: hashOwnerPassword("current-password", "current-salt") }, "원장");
      expect(() => changeOwnerPasswordRecord(store, settingsForm({ currentPassword: "wrong-password", newPassword: "changed-password", confirmPassword: "changed-password" }))).toThrow("현재 비밀번호");
      expect(() => changeOwnerPasswordRecord(store, settingsForm({ currentPassword: "current-password", newPassword: "short", confirmPassword: "short" }))).toThrow("8자 이상");
    } finally {
      store.close();
    }
  });

  it("preserves password whitespace exactly instead of trimming it", () => {
    const store = createSalonStore(":memory:");
    try {
      store.saveSettings({ ownerPasswordHash: hashOwnerPassword(" current-password ", "current-salt") }, "원장");
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
    auditEvents: [{ id: "audit-1", occurredAt: "2026-08-03T00:00:00.000Z", actor: "원장", action: "save-settings", kind: "settings", recordId: "1", payload: {} }],
    error: "",

    notice: "",
    notices: [{ id: "notice-1", kind: "notices", value: { title: "운영 공지", body: "공지 내용", operator: "원장" }, createdAt: "2026-08-03T00:00:00.000Z", updatedAt: "2026-08-03T00:00:00.000Z", archivedAt: null }],
    settings: { shopName: "강남점", ownerName: "민지", hiddenMenus: ["/messages"], backgroundColor: "#f7f5f6", foregroundColor: "#211a1f" },
  } as const;

  it("renders grouped owner settings and applies persisted shell settings", () => {
    const html = renderToStaticMarkup(<SettingsPage {...props} section="owner" />);
    for (const label of ["매장 · 원장 계정", "고객 정책", "결제 정책", "예약", "문자 자동화", "외부 연동", "도움말 · 공지"]) expect(html).toContain(label);
    expect(html).toContain('name="ownerName"');
    expect(html).toContain('value="민지"');
    expect(html).toContain('name="confirmPassword"');
    expect(html).not.toContain('href="/messages"');
    expect(html).toContain("--background:#f7f5f6");
    expect(html).not.toContain("상품 설정");
    expect(html).not.toContain("쿠폰 설정");
  });

  it("uses the same visual defaults in the settings form and app shell", () => {
    const html = renderToStaticMarkup(<SettingsPage {...props} settings={{ shopName: "강남점", ownerName: "민지" }} section="customer" />);
    for (const token of ["#f7f5f0", "#202124", "#5c344f", "#2b2028"]) expect(html.match(new RegExp(token, "g"))?.length).toBeGreaterThanOrEqual(2);
  });

  it("renders customer, payment, booking, and dry-run messaging policies", () => {
    const customer = renderToStaticMarkup(<SettingsPage {...props} section="customer" />);
    expect(customer).toContain("사이드 메뉴 숨김");
    expect(customer).toContain("서버의 원장 전용 경로 보호는 그대로 유지됩니다.");
    const payment = renderToStaticMarkup(<SettingsPage {...props} section="payment" />);
    expect(payment).toContain("선불 결제 대체 흐름");
    expect(payment).toContain('href="/sales"');
    expect(payment).not.toContain('href="/prepaid"');
    expect(payment).not.toContain('name="balance"');
    const booking = renderToStaticMarkup(<SettingsPage {...props} section="booking" />);
    expect(booking).toContain('name="bookingOpen"');
    expect(booking).toContain('name="bookingClose"');
    expect(booking).toContain('name="reminderText"');
    expect(booking).not.toContain('name="bookingNoticeText"');
    const messages = renderToStaticMarkup(<SettingsPage {...props} section="messages" />);
    expect(messages).toContain("상태: dry-run");
    expect(messages).toContain("공급자 전송 없이");
    expect(messages).toContain('href="/messages#automation"');
    expect(messages).not.toContain('name="messageAutomationSchedule"');
    expect(messages).not.toContain('name="messageAutomationText"');
    expect(messages).not.toContain('name="messageAutomationEnabled"');
  });

  it("shows Naver mail metadata and a booking link without credentials", () => {
    const disconnected = renderToStaticMarkup(<SettingsPage {...props} section="integrations" />);
    expect(disconnected).toContain('href="/bookings"');
    const integrations = renderToStaticMarkup(<SettingsPage {...props} settings={{ ...props.settings, naverMail: { email: "owner@naver.com", provider: "naver", connected: true, lastSyncUid: 18372, lastSyncAt: "2026-08-03T15:18:00" } }} section="integrations" />);
    for (const label of ["owner@naver.com", "18372", "2026-08-03T15:18:00"]) expect(integrations).toContain(label);
    for (const secret of ["applicationPassword", "clientSecret", "NAVER_RESERVATION_CLIENT_SECRET"]) expect(integrations).not.toContain(secret);    const help = renderToStaticMarkup(<SettingsPage {...props} section="help" />);
    expect(help).toContain("도움말 · FAQ");
    expect(help).toContain("운영 공지");
    expect(help).toContain("설정 변경 이력");
    expect(help).toContain("원장");
    expect(help).toContain('id="terms"');
    expect(help).toContain("서비스 이용약관");
    expect(help).toContain("불변 거래 원장");
    expect(help).toContain("공급자 연결 전까지 dry-run");
  });

  it("redacts operational errors and password values from rendered HTML", () => {
    const secret = "plain-password-from-sqlite";
    const html = renderToStaticMarkup(<SettingsPage {...props} error={`SQLITE_BUSY: ${secret}`} section="owner" />);

    expect(html).toContain("설정을 저장하지 못했습니다.");
    expect(html).not.toContain("SQLITE_BUSY");
    expect(html).not.toContain(secret);
  });
});
