import { describe, expect, it } from "vitest";

import { adjustCustomerPointsRecord, chargePrepaidRecord, saveCustomerRecord } from "../lib/customer-operations";
import { createSalonStore } from "../lib/salon-store";

const store = createSalonStore(":memory:");

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("customer actions", () => {
  it("rejects invalid customer input and duplicate identity until explicitly overridden", async () => {
    expect(() => saveCustomerRecord(store, form({ name: "", phone: "01012345678" }))).toThrow("고객명");
    expect(() => saveCustomerRecord(store, form({ name: "번호 오류", phone: "12345" }))).toThrow("휴대전화");
    expect(() => saveCustomerRecord(store, form({ name: "신규 고객", phone: "010-1234-5678", memo: "가".repeat(151) }))).toThrow("150");
    expect(() => saveCustomerRecord(store, form({ name: "김하늘", phone: "01012345678" }))).toThrow("중복");

    // 폼이 실어 보낸 `points` 는 무시된다. 잔액을 만드는 곳은 원장뿐이다.
    const saved = saveCustomerRecord(store, form({ name: "김하늘", phone: "01012345678", allowDuplicate: "on", points: "12", smsOptIn: "off" }));
    expect(saved.value).toMatchObject({ smsOptIn: false, points: 0 });
  });

  it("keeps only the six form fields and drops the removed customer attributes", () => {
    const saved = saveCustomerRecord(store, form({ name: "여섯 칸", phone: "010-2222-1111", gender: "male", joinedAt: "2026-03-04", memo: "단골" }));

    expect(saved.value).toMatchObject({ name: "여섯 칸", phone: "01022221111", gender: "male", joinedAt: "2026-03-04", memo: "단골", prepaidWon: 0 });
    // 등급·그룹·방문동기·생일 따위는 폼에서 와도 저장되지 않는다.
    for (const key of ["grade", "group", "motive", "birthday", "telephone", "address", "email", "nickname"]) {
      expect(saved.value).not.toHaveProperty(key);
    }
  });

  it("keeps ledger points out of the customer form and demands a reason to adjust", async () => {
    const created = saveCustomerRecord(store, form({ name: "포인트 고객", phone: "01055556666" }));
    expect(() => adjustCustomerPointsRecord(store, form({ customerId: created.id, pointsWon: "500" }))).toThrow("사유");
    expect(() => adjustCustomerPointsRecord(store, form({ customerId: created.id, pointsWon: "0", reason: "무효" }))).toThrow("0이 아닌");
    adjustCustomerPointsRecord(store, form({ customerId: created.id, pointsWon: "500", reason: "이벤트 보상" }));
    expect(store.get<{ points: number }>("customers", created.id)?.value.points).toBe(500);

    // 이름 한 글자만 고쳐 저장해도 적립분이 폼 값으로 되돌아가지 않아야 한다.
    saveCustomerRecord(store, form({ customerId: created.id, name: "포인트 고객", phone: "01055556666", points: "0" }));
    expect(store.get<{ points: number }>("customers", created.id)?.value.points).toBe(500);
  });

  /**
   * 선결제는 고객 필드(잔액)와 원장(돈이 움직인 사실) 두 곳에 남는다.
   * 한쪽만 쓰면 매출에서 돈이 사라지거나 원장에 없는 잔액이 생긴다.
   */
  it("charges prepaid on registration and records it in the ledger", () => {
    const created = saveCustomerRecord(store, form({ name: "선결제 고객", phone: "010-8888-7777", prepaidWon: "300000" }));

    expect(created.value).toMatchObject({ prepaidWon: 300000 });
    expect(store.listLedgerByCustomer(created.id).some((entry) => entry.details.serviceMajor === "선결제" && entry.amountWon === 300000)).toBe(true);
  });

  it("never lets the edit form overwrite an existing prepaid balance", () => {
    const created = saveCustomerRecord(store, form({ name: "잔액 고객", phone: "010-8888-6666", prepaidWon: "100000" }));

    // 수정 폼에는 선결제 칸이 없다. 값을 억지로 실어 보내도 잔액은 그대로다.
    saveCustomerRecord(store, form({ customerId: created.id, name: "잔액 고객", phone: "010-8888-6666", prepaidWon: "0" }));
    expect(store.get<{ prepaidWon: number }>("customers", created.id)?.value.prepaidWon).toBe(100000);

    chargePrepaidRecord(store, form({ customerId: created.id, amountWon: "50000", method: "card" }));
    expect(store.get<{ prepaidWon: number }>("customers", created.id)?.value.prepaidWon).toBe(150000);
  });

  it("rejects unusable prepaid charges", () => {
    const created = saveCustomerRecord(store, form({ name: "충전 검증", phone: "010-8888-5555" }));

    expect(() => chargePrepaidRecord(store, form({ customerId: "없는-고객", amountWon: "1000" }))).toThrow("고객");
    expect(() => chargePrepaidRecord(store, form({ customerId: created.id, amountWon: "0" }))).toThrow("금액");
    expect(() => chargePrepaidRecord(store, form({ customerId: created.id, amountWon: "-100" }))).toThrow("금액");
    // 포인트와 선결제 자체로는 선결제를 채울 수 없다 — 그건 잔액을 잔액으로 미는 셈이다.
    expect(() => chargePrepaidRecord(store, form({ customerId: created.id, amountWon: "1000", method: "prepaid" }))).toThrow("결제수단");
    expect(() => chargePrepaidRecord(store, form({ customerId: created.id, amountWon: "1000", method: "points" }))).toThrow("결제수단");
  });

  it("rejects an impossible first-visit date", () => {
    expect(() => saveCustomerRecord(store, form({ name: "날짜 검증", phone: "010-1000-0001", joinedAt: "2026-02-30" }))).toThrow("확인하세요");
    expect(store.list<{ name: string }>("customers").some(({ value }) => value.name === "날짜 검증")).toBe(false);
  });
});
