import { describe, expect, it } from "vitest";

import type { JsonValue } from "./salon-domain";
import { createSalonStore } from "./salon-store";

describe("SalonStore", () => {
  it("closes its SQLite connection", () => {
    const store = createSalonStore(":memory:");

    store.close();

    expect(() => store.list("customers")).toThrow();
  });

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

  it("rejects refund and correction entries without a persisted correction target", () => {
    const store = createSalonStore(":memory:");
    const ledgerCount = store.listLedger().length;

    for (const kind of ["refund", "correction"]) {
      expect(() => store.appendLedger({ requestKey: `${kind}-missing`, kind, amountWon: -1000 }, "원장")).toThrow(/correctionOf/i);
      expect(() => store.appendLedger({ requestKey: `${kind}-empty`, kind, correctionOf: "   ", amountWon: -1000 }, "원장")).toThrow(/correctionOf/i);
      expect(() => store.appendLedger({ requestKey: `${kind}-unknown`, kind, correctionOf: "missing", amountWon: -1000 }, "원장")).toThrow(/correctionOf/i);
    }

    expect(store.listLedger()).toHaveLength(ledgerCount);
  });

  it("stores only integer won amounts", () => {
    const store = createSalonStore(":memory:");
    const ledgerCount = store.listLedger().length;
    const auditCount = store.snapshot().auditEvents.length;

    expect(() => store.appendLedger({ requestKey: "fractional", kind: "payment", amountWon: 10.5 }, "원장")).toThrow(/integer won/i);
    expect(store.listLedger()).toHaveLength(ledgerCount);
    expect(store.snapshot().auditEvents).toHaveLength(auditCount);
  });

  it("rejects values that cannot survive an exact JSON round-trip", () => {
    const store = createSalonStore(":memory:");
    const auditCount = store.snapshot().auditEvents.length;

    expect(() => store.save("customers", "invalid-record", { nested: { omitted: undefined } } as unknown as JsonValue, "원장")).toThrow(/JSON round-trip/i);
    expect(() => store.saveSettings({ callback: () => undefined } as unknown as Record<string, JsonValue>, "원장")).toThrow(/JSON round-trip/i);

    expect(store.get("customers", "invalid-record")).toBeNull();
    expect(store.snapshot().auditEvents).toHaveLength(auditCount);
  });

  it("seeds deterministic owner-shop data with immutable creation history", () => {
    const store = createSalonStore(":memory:");
    const customers = store.list<{ gender: string; visitType: string; operator: string }>("customers");
    const bookings = store.list<{ startsAt: string; operator: string }>("bookings");
    const automations = store.list<{ label: string; status: string; operator: string }>("automations");

    expect(new Set(customers.map(({ value }) => value.gender))).toEqual(new Set(["female", "male"]));
    expect(new Set(customers.map(({ value }) => value.visitType))).toEqual(new Set(["first", "repeat"]));
    expect(customers.every(({ value }) => value.operator === "원장")).toBe(true);
    for (const kind of ["waiting-customers", "bookings", "messages", "products", "coupons", "notices"]) {
      expect(store.list(kind), kind).not.toEqual([]);
    }
    expect(bookings.map(({ value }) => value.startsAt.slice(0, 10))).toEqual([
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
    expect(bookings.every(({ value }) => value.operator === "원장")).toBe(true);
    expect(automations.map(({ value }) => value.status)).toEqual(["사용", "사용", "중지"]);
    expect(automations.every(({ value }) => value.operator === "원장")).toBe(true);
    expect(store.listLedger().reduce((total, entry) => total + entry.amountWon, 0)).toBe(29960000);
    expect(store.listLedger().reduce((total, entry) => total + entry.profitWon, 0)).toBe(17390000);
    expect(store.getSettings()).toMatchObject({ shopName: "수원 본점", ownerName: "원장", smsRemaining: 500 });

    const seedEvents = store.snapshot().auditEvents;
    expect(seedEvents.filter((event) => event.action === "seed-ledger")).toHaveLength(store.listLedger().length);
    expect(seedEvents).toContainEqual(expect.objectContaining({ action: "seed-settings", kind: "settings", recordId: "1", actor: "원장" }));
    expect(seedEvents.every((event) => event.actor === "원장")).toBe(true);

    const auditCount = store.snapshot().auditEvents.length;
    const settings = store.saveSettings({ shopName: "광교점", ownerName: "이수진", smsRemaining: 480 }, "원장");

    expect(settings).toMatchObject({ shopName: "광교점", ownerName: "이수진", smsRemaining: 480 });
    expect(store.getSettings()).toEqual(settings);
    expect(store.snapshot().auditEvents.slice(auditCount)).toEqual([
      expect.objectContaining({ action: "save-settings", kind: "settings", recordId: "1", actor: "원장" }),
    ]);
  });
});
