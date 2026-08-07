import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { buildPoints, dailyAxis, monthlyAxis, yearlyAxis } from "./revenue-aggregate";
import { createSalonStore } from "./salon-store";
import { seoulBusinessDate } from "./seoul-date";

const LIVE_DB = ".data/hairhaeyo.sqlite";

function fixture() {
  const store = createSalonStore(":memory:", { seed: false });
  const at = (date: string, gross: number, kind = "payment", correctionOf?: string) => ({
    requestKey: `${kind}-${date}-${gross}`,
    kind,
    occurredAt: `${date}T12:00:00.000Z`,
    correctionOf,
    grossWon: gross,
    amountWon: gross,
    discountWon: 0,
    vatWon: 0,
    feeWon: 0,
    expenseWon: 0,
    incentiveWon: 0,
    pointsWon: 0,
    couponWon: 0,
    profitWon: gross,
    details: {},
  });
  store.appendLedgerBatch(
    [
      at("2025-12-31", 1_000),
      at("2026-01-15", 2_000),
      at("2026-01-20", 3_000),
      at("2026-03-01", 4_000),
      at("2026-08-01", 5_000),
      at("2026-08-03", 6_000),
    ],
    "원장",
  );
  return store;
}

describe("aggregateLedger", () => {
  it("groups by business day, month, and year within a half-open range", () => {
    const store = fixture();
    try {
      expect(store.aggregateLedger("2026-01-01", "2027-01-01", "month").map(({ key, gross, count }) => ({ key, gross, count }))).toEqual([
        { key: "2026-01", gross: 5_000, count: 2 },
        { key: "2026-03", gross: 4_000, count: 1 },
        { key: "2026-08", gross: 11_000, count: 2 },
      ]);
      expect(store.aggregateLedger("2026-08-01", "2026-09-01", "day").map(({ key, gross }) => ({ key, gross }))).toEqual([
        { key: "2026-08-01", gross: 5_000 },
        { key: "2026-08-03", gross: 6_000 },
      ]);
      expect(store.aggregateLedger("0000-01-01", "9999-12-31", "year").map(({ key, gross }) => ({ key, gross }))).toEqual([
        { key: "2025", gross: 1_000 },
        { key: "2026", gross: 20_000 },
      ]);
    } finally {
      store.close();
    }
  });

  it("excludes the exclusive end and includes the inclusive start", () => {
    const store = fixture();
    try {
      // 2026-01-20 is the end boundary: excluded here, included when the range extends one day.
      expect(store.aggregateLedger("2026-01-01", "2026-01-20", "month").at(0)?.gross).toBe(2_000);
      expect(store.aggregateLedger("2026-01-01", "2026-01-21", "month").at(0)?.gross).toBe(5_000);
      expect(store.aggregateLedger("2026-01-15", "2026-01-21", "month").at(0)?.count).toBe(2);
      expect(store.aggregateLedger("2026-01-16", "2026-01-21", "month").at(0)?.count).toBe(1);
    } finally {
      store.close();
    }
  });

  it("returns an empty result rather than throwing for a range with no rows", () => {
    const store = fixture();
    try {
      expect(store.aggregateLedger("2030-01-01", "2031-01-01", "day")).toEqual([]);
      expect(store.summarizeLedger("2030-01-01", "2031-01-01")).toMatchObject({ gross: 0, count: 0, profit: 0 });
    } finally {
      store.close();
    }
  });
});

describe("sum identities (§14)", () => {
  const store = fixture();

  it("day totals equal the month total", () => {
    const days = store.aggregateLedger("2026-08-01", "2026-09-01", "day");
    const month = store.aggregateLedger("2026-08-01", "2026-09-01", "month");
    expect(days.reduce((total, row) => total + row.gross, 0)).toBe(month[0].gross);
  });

  it("month totals equal the year total", () => {
    const months = store.aggregateLedger("2026-01-01", "2027-01-01", "month");
    const year = store.aggregateLedger("2026-01-01", "2027-01-01", "year");
    expect(months.reduce((total, row) => total + row.gross, 0)).toBe(year[0].gross);
  });

  it("the axis points sum to the range summary, which comes from a different query", () => {
    const rows = store.aggregateLedger("2026-08-01", "2026-09-01", "day");
    const points = buildPoints(rows, "daily", dailyAxis("2026-08"), "2026-08-31");
    const summary = store.summarizeLedger("2026-08-01", "2026-09-01");
    expect(points.reduce((total, point) => total + (point.gross ?? 0), 0)).toBe(summary.gross);
  });

  it("holds for the monthly and yearly axes too", () => {
    const monthRows = store.aggregateLedger("2026-01-01", "2027-01-01", "month");
    const monthPoints = buildPoints(monthRows, "monthly", monthlyAxis("2026"), "2026-12-31");
    expect(monthPoints.reduce((total, point) => total + (point.gross ?? 0), 0)).toBe(store.summarizeLedger("2026-01-01", "2027-01-01").gross);

    const yearRows = store.aggregateLedger("0000-01-01", "9999-12-31", "year");
    const yearPoints = buildPoints(yearRows, "yearly", yearlyAxis(yearRows), "2026-08-06");
    expect(yearPoints.reduce((total, point) => total + (point.gross ?? 0), 0)).toBe(store.summarizeLedger("0000-01-01", "9999-12-31").gross);
  });
});

describe("listLedgerRange", () => {
  it("returns only the rows the aggregate counted", () => {
    const store = fixture();
    try {
      const rows = store.listLedgerRange("2026-08-01", "2026-09-01");
      expect(rows.map((row) => row.grossWon)).toEqual([5_000, 6_000]);
      expect(rows.reduce((total, row) => total + row.grossWon, 0)).toBe(store.summarizeLedger("2026-08-01", "2026-09-01").gross);
    } finally {
      store.close();
    }
  });
});

describe("ledgerBounds", () => {
  it("reports the real span instead of a hardcoded one, and null when empty", () => {
    const store = fixture();
    try {
      expect(store.ledgerBounds()).toEqual({ first: "2025-12-31", last: "2026-08-03" });
    } finally {
      store.close();
    }
    const empty = createSalonStore(":memory:", { seed: false });
    try {
      expect(empty.ledgerBounds()).toBeNull();
    } finally {
      empty.close();
    }
  });
});

describe("SQL business date matches seoulBusinessDate", () => {
  it("agrees on the 09:00 Seoul cutoff, where the +9h offset and the -1 day cancel", () => {
    for (const [iso, expected] of [
      ["2026-08-04T14:59:59.000Z", "2026-08-04"], // Seoul 23:59 same day
      ["2026-08-04T15:00:00.000Z", "2026-08-04"], // Seoul 00:00 next day, before the 09:00 cutoff
      ["2026-08-04T23:59:59.000Z", "2026-08-04"], // Seoul 08:59, still the previous business day
      ["2026-08-05T00:00:00.000Z", "2026-08-05"], // Seoul 09:00, the business day rolls over
      ["2026-08-05T12:00:00.000Z", "2026-08-05"],
    ] as const) {
      expect([iso, seoulBusinessDate(iso)]).toEqual([iso, expected]);
      expect([iso, iso.slice(0, 10)]).toEqual([iso, expected]);
    }
  });

  it.skipIf(!existsSync(LIVE_DB))("agrees on every row of the live ledger", () => {
    const db = new DatabaseSync(LIVE_DB, { readOnly: true });
    try {
      const rows = db.prepare("SELECT occurred_at AS occurredAt, substr(occurred_at, 1, 10) AS sqlDate FROM ledger").all() as {
        occurredAt: string;
        sqlDate: string;
      }[];
      const mismatched = rows.filter((row) => seoulBusinessDate(row.occurredAt) !== row.sqlDate);
      expect({ rows: rows.length > 0, mismatched }).toEqual({ rows: true, mismatched: [] });
    } finally {
      db.close();
    }
  });
});
