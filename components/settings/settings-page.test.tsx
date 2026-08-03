import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { hashOwnerPassword, verifyOwnerPassword } from "../../lib/auth";
import { changeOwnerPasswordRecord, parseShopSettings } from "../../lib/settings";
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
});

describe("SettingsPage", () => {
  const props = {
    auditEvents: [{ id: "audit-1", occurredAt: "2026-08-03T00:00:00.000Z", actor: "원장", action: "save-settings", kind: "settings", recordId: "1", payload: {} }],
    error: "",
    naverConfigured: false,
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
    const messages = renderToStaticMarkup(<SettingsPage {...props} section="messages" />);
    expect(messages).toContain("상태: dry-run");
    expect(messages).toContain("공급자 전송 없이");
  });

  it("shows non-secret Naver help and reachable notices, FAQ, and audit history", () => {
    const integrations = renderToStaticMarkup(<SettingsPage {...props} section="integrations" />);
    expect(integrations).toContain("연동 확인 필요");
    for (const secret of ["naverAccount", "password", "clientSecret", "비밀키 입력"]) expect(integrations).not.toContain(secret);
    const help = renderToStaticMarkup(<SettingsPage {...props} section="help" />);
    expect(help).toContain("도움말 · FAQ");
    expect(help).toContain("운영 공지");
    expect(help).toContain("설정 변경 이력");
    expect(help).toContain("원장");
  });
});
