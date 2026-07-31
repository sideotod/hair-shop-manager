import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { isDeepStrictEqual } from "node:util";

import type { AuditEvent, JsonObject, JsonValue, LedgerEntry, LedgerInput, RecordKind, SalonRecord, SalonSnapshot, SalonStore } from "./salon-domain";

export type { AuditEvent, JsonObject, JsonValue, LedgerEntry, LedgerInput, RecordKind, SalonRecord, SalonSnapshot, SalonStore } from "./salon-domain";

type RecordRow = {
  kind: string;
  id: string;
  payload: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type LedgerRow = {
  id: string;
  request_key: string;
  kind: string;
  occurred_at: string;
  correction_of: string | null;
  customer_id: string | null;
  gross_won: number;
  amount_won: number;
  discount_won: number;
  vat_won: number;
  fee_won: number;
  expense_won: number;
  incentive_won: number;
  points_won: number;
  coupon_won: number;
  profit_won: number;
  details: string;
};

type AuditRow = {
  id: string;
  occurred_at: string;
  actor: string;
  action: string;
  kind: string | null;
  record_id: string | null;
  payload: string;
};

const now = () => new Date().toISOString();

function parseJson<T extends JsonValue>(payload: string): T {
  return JSON.parse(payload) as T;
}

function stringifyJson(value: unknown, label: string) {
  let payload: string | undefined;
  try {
    payload = JSON.stringify(value);
  } catch {
    throw new Error(`${label} must survive an exact JSON round-trip`);
  }
  if (payload === undefined || !isDeepStrictEqual(value, JSON.parse(payload))) {
    throw new Error(`${label} must survive an exact JSON round-trip`);
  }
  return payload;
}

function assertText(value: string, field: string) {
  if (!value.trim()) throw new Error(`${field} is required`);
}

function assertWon(value: number, field: string) {
  if (!Number.isSafeInteger(value)) throw new Error(`${field} must be an integer won amount`);
}

function recordFromRow<T extends JsonValue>(row: RecordRow): SalonRecord<T> {
  return {
    id: row.id,
    kind: row.kind,
    value: parseJson<T>(row.payload),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function ledgerFromRow(row: LedgerRow): LedgerEntry {
  return {
    id: row.id,
    requestKey: row.request_key,
    kind: row.kind,
    occurredAt: row.occurred_at,
    correctionOf: row.correction_of,
    customerId: row.customer_id,
    grossWon: row.gross_won,
    amountWon: row.amount_won,
    discountWon: row.discount_won,
    vatWon: row.vat_won,
    feeWon: row.fee_won,
    expenseWon: row.expense_won,
    incentiveWon: row.incentive_won,
    pointsWon: row.points_won,
    couponWon: row.coupon_won,
    profitWon: row.profit_won,
    details: parseJson<JsonObject>(row.details),
  };
}

function auditFromRow(row: AuditRow): AuditEvent {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    actor: row.actor,
    action: row.action,
    kind: row.kind,
    recordId: row.record_id,
    payload: parseJson(row.payload),
  };
}

function addAudit(db: DatabaseSync, action: string, kind: string | null, recordId: string | null, actor: string, payload: unknown, occurredAt: string) {
  db.prepare("INSERT INTO audit_events (id, occurred_at, actor, action, kind, record_id, payload) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    randomUUID(),
    occurredAt,
    actor,
    action,
    kind,
    recordId,
    stringifyJson(payload, "audit payload"),
  );
}

function transaction<T>(db: DatabaseSync, operation: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function createSchema(db: DatabaseSync) {
  // ponytail: SQLite single instance; managed SQL adapter if multi-instance hosting is introduced
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      kind TEXT NOT NULL,
      id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      PRIMARY KEY (kind, id)
    );
    CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY,
      request_key TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      correction_of TEXT REFERENCES ledger(id),
      customer_id TEXT,
      gross_won INTEGER NOT NULL DEFAULT 0,
      amount_won INTEGER NOT NULL,
      discount_won INTEGER NOT NULL DEFAULT 0,
      vat_won INTEGER NOT NULL,
      fee_won INTEGER NOT NULL,
      expense_won INTEGER NOT NULL DEFAULT 0,
      incentive_won INTEGER NOT NULL,
      points_won INTEGER NOT NULL,
      coupon_won INTEGER NOT NULL,
      profit_won INTEGER NOT NULL,
      details TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      kind TEXT,
      record_id TEXT,
      payload TEXT NOT NULL
    );
  `);
  const ledgerColumns = new Set((db.prepare("PRAGMA table_info(ledger)").all() as { name: string }[]).map(({ name }) => name));
  if (!ledgerColumns.has("customer_id")) db.exec("ALTER TABLE ledger ADD COLUMN customer_id TEXT");
  if (!ledgerColumns.has("gross_won")) db.exec("ALTER TABLE ledger ADD COLUMN gross_won INTEGER NOT NULL DEFAULT 0");
  if (!ledgerColumns.has("discount_won")) db.exec("ALTER TABLE ledger ADD COLUMN discount_won INTEGER NOT NULL DEFAULT 0");
  if (!ledgerColumns.has("expense_won")) db.exec("ALTER TABLE ledger ADD COLUMN expense_won INTEGER NOT NULL DEFAULT 0");
  if (!ledgerColumns.has("details")) db.exec("ALTER TABLE ledger ADD COLUMN details TEXT NOT NULL DEFAULT '{}'");
  db.exec("UPDATE ledger SET gross_won = amount_won WHERE gross_won = 0");
  db.exec(`UPDATE ledger SET details = CASE id
    WHEN 'ledger-seed-1' THEN '{"operator":"원장","serviceMajor":"컬러","gender":"female","visitType":"repeat","paymentMethods":{"card":10480000}}'
    WHEN 'ledger-seed-2' THEN '{"operator":"원장","serviceMajor":"펌","gender":"male","visitType":"first","paymentMethods":{"cash":8640000}}'
    WHEN 'ledger-seed-3' THEN '{"operator":"원장","serviceMajor":"클리닉","gender":"female","visitType":"repeat","paymentMethods":{"prepaid":6120000}}'
    WHEN 'ledger-seed-4' THEN '{"operator":"원장","serviceMajor":"커트","gender":"male","visitType":"repeat","paymentMethods":{"other":4720000}}'
    ELSE details END WHERE details = '{}'`);
  db.exec(`UPDATE ledger SET
    customer_id = CASE id WHEN 'ledger-seed-1' THEN 'customer-seed-1' WHEN 'ledger-seed-2' THEN 'customer-seed-2' WHEN 'ledger-seed-3' THEN 'customer-seed-1' WHEN 'ledger-seed-4' THEN 'customer-seed-2' ELSE customer_id END,
    expense_won = CASE id WHEN 'ledger-seed-1' THEN 3100000 WHEN 'ledger-seed-2' THEN 2580000 WHEN 'ledger-seed-3' THEN 1820000 WHEN 'ledger-seed-4' THEN 1440000 ELSE expense_won END,
    incentive_won = CASE id WHEN 'ledger-seed-1' THEN 2200000 WHEN 'ledger-seed-2' THEN 1800000 WHEN 'ledger-seed-3' THEN 1250000 WHEN 'ledger-seed-4' THEN 830000 ELSE incentive_won END,
    points_won = CASE id WHEN 'ledger-seed-1' THEN 1000 WHEN 'ledger-seed-2' THEN 0 WHEN 'ledger-seed-3' THEN 0 WHEN 'ledger-seed-4' THEN 0 ELSE points_won END
    WHERE id IN ('ledger-seed-1', 'ledger-seed-2', 'ledger-seed-3', 'ledger-seed-4')`);
}

function seed(db: DatabaseSync) {
  const row = db.prepare(`SELECT
    (SELECT COUNT(*) FROM records) +
    (SELECT COUNT(*) FROM ledger) +
    (SELECT COUNT(*) FROM settings) +
    (SELECT COUNT(*) FROM audit_events) AS count`).get() as { count: number };
  if (row.count !== 0) return;

  transaction(db, () => {
    const seededAt = "2026-07-31T00:00:00.000Z";
    const records: ReadonlyArray<readonly [string, string, Record<string, unknown>]> = [
      ["customers", "customer-seed-1", { name: "김하늘", gender: "female", visitType: "repeat", operator: "원장" }],
      ["customers", "customer-seed-2", { name: "이도윤", gender: "male", visitType: "first", operator: "원장" }],
      ["waiting-customers", "waiting-seed-1", { customerId: "customer-seed-2", name: "박봄", memo: "커트", gender: "female", visitType: "first", operator: "원장" }],
      ["bookings", "booking-seed-1", { customerId: "customer-seed-1", startsAt: "2026-07-31T10:00:00.000Z", service: "커트", status: "confirmed", operator: "원장" }],
      ["bookings", "booking-seed-2", { customerId: "customer-seed-2", startsAt: "2026-08-01T11:00:00.000Z", service: "남성 펌", status: "confirmed", operator: "원장" }],
      ["bookings", "booking-seed-3", { customerId: "customer-seed-1", startsAt: "2026-08-02T12:00:00.000Z", service: "클리닉", status: "confirmed", operator: "원장" }],
      ["bookings", "booking-seed-4", { customerId: "customer-seed-2", startsAt: "2026-08-03T13:00:00.000Z", service: "커트", status: "confirmed", operator: "원장" }],
      ["messages", "message-seed-1", { recipientId: "customer-seed-1", channel: "SMS", status: "dry-run", operator: "원장" }],
      ["automations", "automation-seed-1", { label: "신규 고객 등록 문자", status: "사용", schedule: "등록 10분 후", operator: "원장" }],
      ["automations", "automation-seed-2", { label: "예약 당일 안내 문자", status: "사용", schedule: "예약 3시간 전", operator: "원장" }],
      ["automations", "automation-seed-3", { label: "생일 자동 문자", status: "중지", schedule: "생일 당일 09:00", operator: "원장" }],
      ["products", "product-seed-1", { name: "헤어 오일", priceWon: 28000, operator: "원장" }],
      ["coupons", "coupon-seed-1", { name: "클리닉 5회", balanceWon: 250000, operator: "원장" }],
      ["product-sales", "product-sale-seed-1", { customerId: "customer-seed-1", name: "헤어 오일", priceWon: 28000, operator: "원장" }],
      ["customer-coupons", "customer-coupon-seed-1", { customerId: "customer-seed-1", name: "클리닉 5회", balanceWon: 250000, operator: "원장" }],
      ["notices", "notice-seed-1", { title: "운영 안내", body: "원장 전용 운영 데이터", operator: "원장" }],
    ];
    const insertRecord = db.prepare("INSERT INTO records (kind, id, payload, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, ?, NULL)");
    for (const [kind, id, value] of records) {
      insertRecord.run(kind, id, stringifyJson(value, `${kind}:${id}`), seededAt, seededAt);
      addAudit(db, "seed-record", kind, id, "원장", { before: null, after: { id, kind, value, createdAt: seededAt, updatedAt: seededAt, archivedAt: null } }, seededAt);
    }

    db.prepare("INSERT INTO settings (id, payload, updated_at) VALUES (1, ?, ?)").run(
      stringifyJson({ shopName: "수원 본점", ownerName: "원장", smsRemaining: 500 }, "settings"),
      seededAt,
    );

    const seedSettings = db.prepare("SELECT payload FROM settings WHERE id = 1").get() as { payload: string };
    addAudit(db, "seed-settings", "settings", "1", "원장", { before: null, after: parseJson<JsonObject>(seedSettings.payload) }, seededAt);

    const ledger = [
      ["ledger-seed-1", "seed-revenue-20260724", "2026-07-24T12:00:00.000Z", 10480000, 1000000, 300000, 3100000, 2200000, 1000, 6080000, "customer-seed-1", { operator: "원장", serviceMajor: "컬러", serviceDetail: "전체 염색", styleName: "브라운", gender: "female", visitType: "repeat", paymentMethods: { card: 10480000 } }],
      ["ledger-seed-2", "seed-revenue-20260725", "2026-07-25T12:00:00.000Z", 8640000, 800000, 250000, 2580000, 1800000, 0, 5010000, "customer-seed-2", { operator: "원장", serviceMajor: "펌", serviceDetail: "디지털 펌", styleName: "웨이브", gender: "male", visitType: "first", paymentMethods: { cash: 8640000 } }],
      ["ledger-seed-3", "seed-revenue-20260726", "2026-07-26T12:00:00.000Z", 6120000, 550000, 200000, 1820000, 1250000, 0, 3550000, "customer-seed-1", { operator: "원장", serviceMajor: "클리닉", serviceDetail: "집중 클리닉", styleName: "손상 케어", gender: "female", visitType: "repeat", paymentMethods: { prepaid: 6120000 } }],
      ["ledger-seed-4", "seed-revenue-20260727", "2026-07-27T12:00:00.000Z", 4720000, 370000, 160000, 1440000, 830000, 0, 2750000, "customer-seed-2", { operator: "원장", serviceMajor: "커트", serviceDetail: "남성 커트", styleName: "댄디", gender: "male", visitType: "repeat", paymentMethods: { other: 4720000 } }],
    ] as const;
    const insertLedger = db.prepare("INSERT INTO ledger (id, request_key, kind, occurred_at, correction_of, customer_id, gross_won, amount_won, discount_won, vat_won, fee_won, expense_won, incentive_won, points_won, coupon_won, profit_won, details) VALUES (?, ?, 'payment', ?, NULL, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0, ?, ?)");
    for (const [id, requestKey, occurredAt, amountWon, vatWon, feeWon, expenseWon, incentiveWon, pointsWon, profitWon, customerId, details] of ledger) {
      const detailsJson = stringifyJson(details, `ledger details:${id}`);
      insertLedger.run(id, requestKey, occurredAt, customerId, amountWon, amountWon, vatWon, feeWon, expenseWon, incentiveWon, pointsWon, profitWon, detailsJson);
      addAudit(db, "seed-ledger", "ledger", id, "원장", { before: null, after: { id, requestKey, kind: "payment", occurredAt, correctionOf: null, customerId, grossWon: amountWon, amountWon, discountWon: 0, vatWon, feeWon, expenseWon, incentiveWon, pointsWon, couponWon: 0, profitWon, details } }, occurredAt);
    }
  });
}

export function createSalonStore(filename = join(process.cwd(), ".data", "hairhaeyo.sqlite")): SalonStore {
  if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  createSchema(db);
  seed(db);

  const findRecord = <T extends JsonValue>(kind: RecordKind, id: string) => {
    const row = db.prepare("SELECT * FROM records WHERE kind = ? AND id = ?").get(kind, id) as RecordRow | undefined;
    return row ? recordFromRow<T>(row) : null;
  };

  const appendLedgerBatch = (inputs: readonly LedgerInput[], actor: string) => {
    if (inputs.length === 0) throw new Error("Ledger batch requires an entry");
    assertText(actor, "actor");
    const entries = inputs.map((input) => {
      assertText(input.requestKey, "requestKey");
      assertText(input.kind, "kind");
      const entry: LedgerEntry = {
        id: input.id ?? randomUUID(), requestKey: input.requestKey, kind: input.kind, occurredAt: input.occurredAt ?? now(), correctionOf: input.correctionOf ?? null, customerId: input.customerId ?? null,
        grossWon: input.grossWon ?? input.amountWon, amountWon: input.amountWon, discountWon: input.discountWon ?? 0, vatWon: input.vatWon ?? 0, feeWon: input.feeWon ?? 0, expenseWon: input.expenseWon ?? 0, incentiveWon: input.incentiveWon ?? 0, pointsWon: input.pointsWon ?? 0, couponWon: input.couponWon ?? 0, profitWon: input.profitWon ?? 0, details: input.details ?? {},
      };
      assertText(entry.id, "id");
      for (const [field, value] of Object.entries(entry)) if (field.endsWith("Won")) assertWon(value as number, field);
      stringifyJson(entry.details, "ledger details");
      return entry;
    });

    const pointEffects = (entry: LedgerEntry) => {
      const used = entry.details.pointsUsedWon;
      const earned = entry.details.pointsEarnedWon;
      if (typeof used === "number" || typeof earned === "number") return { used: typeof used === "number" ? used : 0, earned: typeof earned === "number" ? earned : 0 };
      return entry.pointsWon < 0 ? { used: -entry.pointsWon, earned: 0 } : { used: 0, earned: entry.pointsWon };
    };

    return transaction(db, () => {
      if (new Set(entries.map(({ requestKey }) => requestKey)).size !== entries.length || entries.some(({ requestKey }) => db.prepare("SELECT 1 FROM ledger WHERE request_key = ?").get(requestKey))) {
        throw new Error("Duplicate ledger requestKey");
      }
      for (const entry of entries) {
        if ((entry.kind === "refund" || entry.kind === "correction") && !entry.correctionOf?.trim()) throw new Error(`${entry.kind} ledger entry requires correctionOf`);
        if (entry.correctionOf && !db.prepare("SELECT 1 FROM ledger WHERE id = ?").get(entry.correctionOf)) throw new Error(`Unknown correctionOf ledger entry: ${entry.correctionOf}`);
        if (entry.customerId && !findRecord<JsonObject>("customers", entry.customerId)) throw new Error(`Unknown customerId ledger entry: ${entry.customerId}`);
      }
      for (const entry of entries) {
        const customer = entry.customerId ? findRecord<JsonObject>("customers", entry.customerId) : null;
        const { used, earned } = pointEffects(entry);
        if (customer && (used !== 0 || earned !== 0)) {
          let points = typeof customer.value.points === "number" && Number.isSafeInteger(customer.value.points) && customer.value.points >= 0 ? customer.value.points : 0;
          let pointDebtWon = typeof customer.value.pointDebtWon === "number" && Number.isSafeInteger(customer.value.pointDebtWon) && customer.value.pointDebtWon >= 0 ? customer.value.pointDebtWon : 0;
          if (used > 0) {
            if (points < used) throw new Error("Customer spendable points are insufficient");
            points -= used;
          } else points -= used;
          if (earned > 0) {
            const repayment = Math.min(pointDebtWon, earned);
            pointDebtWon -= repayment;
            points += earned - repayment;
          } else if (earned < 0) {
            const revocation = -earned;
            const fromPoints = Math.min(points, revocation);
            points -= fromPoints;
            pointDebtWon += revocation - fromPoints;
          }
          const timestamp = now();
          const after = { ...customer, value: { ...customer.value, points, pointDebtWon }, updatedAt: timestamp };
          db.prepare("UPDATE records SET payload = ?, updated_at = ? WHERE kind = 'customers' AND id = ?").run(stringifyJson(after.value, "customer points"), timestamp, customer.id);
          addAudit(db, "ledger-points", "customers", customer.id, actor, { before: customer, after }, timestamp);
        }
        db.prepare("INSERT INTO ledger (id, request_key, kind, occurred_at, correction_of, customer_id, gross_won, amount_won, discount_won, vat_won, fee_won, expense_won, incentive_won, points_won, coupon_won, profit_won, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
          entry.id, entry.requestKey, entry.kind, entry.occurredAt, entry.correctionOf, entry.customerId ?? null, entry.grossWon, entry.amountWon, entry.discountWon, entry.vatWon, entry.feeWon, entry.expenseWon, entry.incentiveWon, entry.pointsWon, entry.couponWon, entry.profitWon, stringifyJson(entry.details, "ledger details"),
        );
        addAudit(db, "append-ledger", "ledger", entry.id, actor, { before: null, after: entry }, entry.occurredAt);
      }
      return Object.freeze(entries);
    });
  };

  return {
    close() {
      db.close();
    },
    list<T extends JsonValue = JsonValue>(kind: RecordKind) {
      return (db.prepare("SELECT * FROM records WHERE kind = ? AND archived_at IS NULL ORDER BY created_at, id").all(kind) as RecordRow[]).map(recordFromRow<T>);
    },
    get<T extends JsonValue = JsonValue>(kind: RecordKind, id: string) {
      return findRecord<T>(kind, id);
    },
    save<T extends JsonValue>(kind: RecordKind, id: string, value: T, actor: string) {
      assertText(kind, "kind");
      assertText(id, "id");
      assertText(actor, "actor");
      const payload = stringifyJson(value, "record value");
      return transaction(db, () => {
        const timestamp = now();
        const before = findRecord<T>(kind, id);
        const after: SalonRecord<T> = {
          id,
          kind,
          value,
          createdAt: before?.createdAt ?? timestamp,
          updatedAt: timestamp,
          archivedAt: null,
        };
        db.prepare(`INSERT INTO records (kind, id, payload, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, ?, NULL)
          ON CONFLICT(kind, id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at, archived_at = NULL`)
          .run(kind, id, payload, after.createdAt, timestamp);
        addAudit(db, "save", kind, id, actor, { before, after }, timestamp);
        return after;
      });
    },
    archive(kind: RecordKind, id: string, actor: string) {
      assertText(kind, "kind");
      assertText(id, "id");
      assertText(actor, "actor");
      return transaction(db, () => {
        const before = findRecord<JsonValue>(kind, id);
        if (!before || before.archivedAt) throw new Error(`Cannot archive missing active ${kind}:${id}`);
        const timestamp = now();
        db.prepare("UPDATE records SET archived_at = ?, updated_at = ? WHERE kind = ? AND id = ?").run(timestamp, timestamp, kind, id);
        const after = { ...before, updatedAt: timestamp, archivedAt: timestamp };
        addAudit(db, "archive", kind, id, actor, { before, after }, timestamp);
        return after;
      });
    },
    appendLedger(input: LedgerInput, actor: string) {
      return appendLedgerBatch([input], actor)[0];
    },
    appendLedgerBatch,
    listLedger() {
      return (db.prepare("SELECT * FROM ledger ORDER BY occurred_at, rowid").all() as LedgerRow[]).map(ledgerFromRow);
    },
    getSettings() {
      const row = db.prepare("SELECT payload FROM settings WHERE id = 1").get() as { payload: string } | undefined;
      return row ? parseJson<JsonObject>(row.payload) : {};
    },
    saveSettings(values: JsonObject, actor: string) {
      assertText(actor, "actor");
      return transaction(db, () => {
        const before = this.getSettings();
        const after = { ...before, ...values };
        const timestamp = now();
        db.prepare("INSERT INTO settings (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at").run(
          stringifyJson(after, "settings"),
          timestamp,
        );
        addAudit(db, "save-settings", "settings", "1", actor, { before, after }, timestamp);
        return after;
      });
    },
    snapshot() {
      const records: Record<string, readonly SalonRecord<JsonValue>[]> = {};
      for (const row of db.prepare("SELECT DISTINCT kind FROM records ORDER BY kind").all() as { kind: string }[]) records[row.kind] = this.list(row.kind);
      return {
        records,
        ledger: this.listLedger(),
        settings: this.getSettings(),
        auditEvents: (db.prepare("SELECT * FROM audit_events ORDER BY rowid").all() as AuditRow[]).map(auditFromRow),
      } satisfies SalonSnapshot;
    },
  };
}
