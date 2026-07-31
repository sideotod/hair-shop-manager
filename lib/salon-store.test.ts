import { describe, expect, it } from "vitest";

import { createSalonStore } from "./salon-store";

describe("SalonStore", () => {
  it("saves, updates, and archives records with one audit event per mutation", () => {
    const store = createSalonStore(":memory:");
    const customerCount = store.list("customers").length;
    const auditCount = store.snapshot().auditEvents.length;

    store.save("customers", "customer-1", { name: "김하늘", gender: "female", visitType: "first" }, "원장");
    const updated = store.save("customers", "customer-1", { name: "김하늘", gender: "female", visitType: "repeat" }, "원장");
    store.save("waiting-customers", "waiting-1", { name: "박봄", memo: "커트" }, "원장");
    const archived = store.archive("waiting-customers", "waiting-1", "원장");

    expect(updated).toMatchObject({ id: "customer-1", value: { visitType: "repeat" } });
    expect(store.list("customers")).toHaveLength(customerCount + 1);
    expect(store.list("waiting-customers").some((record) => record.id === "waiting-1")).toBe(false);
    expect(archived.archivedAt).toEqual(expect.any(String));

    const events = store.snapshot().auditEvents.slice(auditCount);
    expect(events).toHaveLength(4);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "save", kind: "customers", recordId: "customer-1", actor: "원장" }),
      expect.objectContaining({ action: "archive", kind: "waiting-customers", recordId: "waiting-1", actor: "원장" }),
    ]));
  });

  it("rejects duplicate payment requests and appends linked corrections", () => {
    const store = createSalonStore(":memory:");
    const auditCount = store.snapshot().auditEvents.length;
    const payment = {
      id: "ledger-payment-1",
      requestKey: "payment-1",
      kind: "payment",
      occurredAt: "2026-07-31T09:00:00.000Z",
      amountWon: 11000,
      vatWon: 1000,
      feeWon: 200,
      incentiveWon: 0,
      pointsWon: 0,
      couponWon: 0,
      profitWon: 9800,
    } as const;

    const saved = store.appendLedger(payment, "원장");
    expect(() => store.appendLedger(payment, "원장")).toThrow(/requestKey/i);
    expect(() => store.appendLedger({ ...payment, id: "orphan", requestKey: "orphan", correctionOf: "missing" }, "원장")).toThrow(/correctionOf/i);
    const correction = store.appendLedger({
      ...payment,
      id: "ledger-correction-1",
      requestKey: "payment-1-correction",
      correctionOf: saved.id,
      amountWon: -11000,
      vatWon: -1000,
      feeWon: -200,
      profitWon: -9800,
    }, "원장");

    expect(store.listLedger()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: saved.id, amountWon: 11000 }),
      expect.objectContaining({ id: correction.id, correctionOf: saved.id, amountWon: -11000 }),
    ]));
    expect(store.snapshot().auditEvents.slice(auditCount).filter((event) => event.action === "append-ledger")).toHaveLength(2);
  });

  it("stores only integer won amounts", () => {
    const store = createSalonStore(":memory:");
    const ledgerCount = store.listLedger().length;
    const auditCount = store.snapshot().auditEvents.length;

    expect(() => store.appendLedger({ requestKey: "fractional", kind: "payment", amountWon: 10.5 }, "원장")).toThrow(/integer won/i);
    expect(store.listLedger()).toHaveLength(ledgerCount);
    expect(store.snapshot().auditEvents).toHaveLength(auditCount);
  });

  it("seeds deterministic owner-shop data and audits settings changes", () => {
    const store = createSalonStore(":memory:");
    const customers = store.list<{ gender: string; visitType: string; operator: string }>("customers");

    expect(new Set(customers.map(({ value }) => value.gender))).toEqual(new Set(["female", "male"]));
    expect(new Set(customers.map(({ value }) => value.visitType))).toEqual(new Set(["first", "repeat"]));
    expect(customers.every(({ value }) => value.operator === "원장")).toBe(true);
    for (const kind of ["waiting-customers", "bookings", "messages", "products", "coupons", "notices"]) {
      expect(store.list(kind), kind).not.toEqual([]);
    }
    expect(store.listLedger().reduce((total, entry) => total + entry.amountWon, 0)).toBe(29960000);
    expect(store.listLedger().reduce((total, entry) => total + entry.profitWon, 0)).toBe(17390000);

    const auditCount = store.snapshot().auditEvents.length;
    const settings = store.saveSettings({ shopName: "헤어해요", smsRemaining: 480 }, "원장");

    expect(settings).toMatchObject({ shopName: "헤어해요", ownerName: "원장", smsRemaining: 480 });
    expect(store.getSettings()).toEqual(settings);
    expect(store.snapshot().auditEvents.slice(auditCount)).toEqual([
      expect.objectContaining({ action: "save-settings", kind: "settings", recordId: "1", actor: "원장" }),
    ]);
  });
});
