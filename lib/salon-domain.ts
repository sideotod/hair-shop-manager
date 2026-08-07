export type RecordKind = string;

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type CustomerValue = JsonObject & {
  name: string;
  phone: string;
  telephone: string;
  phoneAbsent: boolean;
  smsOptIn: boolean;
  points: number;
  pointDebtWon?: number;
  operator: "원장";
};

export type WaitingCustomerValue = JsonObject & { name: string; memo: string; operator: "원장" };

export type SalonRecord<T extends JsonValue = JsonValue> = {
  id: string;
  kind: RecordKind;
  value: T;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type LedgerInput = {
  id?: string;
  requestKey: string;
  kind: string;
  occurredAt?: string;
  correctionOf?: string;
  customerId?: string;
  grossWon?: number;
  amountWon: number;
  discountWon?: number;
  vatWon?: number;
  feeWon?: number;
  expenseWon?: number;
  incentiveWon?: number;
  pointsWon?: number;
  couponWon?: number;
  profitWon?: number;
  details?: JsonObject;
};

export type LedgerEntry = {
  id: string;
  requestKey: string;
  kind: string;
  occurredAt: string;
  correctionOf: string | null;
  customerId?: string | null;
  grossWon: number;
  amountWon: number;
  discountWon: number;
  vatWon: number;
  feeWon: number;
  expenseWon: number;
  incentiveWon: number;
  pointsWon: number;
  couponWon: number;
  profitWon: number;
  details: JsonObject;
};

export type AuditEvent = {
  id: string;
  occurredAt: string;
  actor: string;
  action: string;
  kind: RecordKind | null;
  recordId: string | null;
  payload: JsonValue;
};

export type SalonSnapshot = {
  records: Readonly<Record<string, readonly SalonRecord<JsonValue>[]>>;
  ledger: readonly LedgerEntry[];
  settings: Readonly<JsonObject>;
  auditEvents: readonly AuditEvent[];
};

/** One `GROUP BY` bucket from the ledger. Only buckets that have rows are returned. */
export type LedgerAggregateRow = {
  readonly key: string;
  readonly gross: number;
  readonly netPaid: number;
  readonly profit: number;
  readonly count: number;
  readonly corrections: number;
};

/** Settlement totals for one range. Every field is 0 when the range has no rows. */
export type LedgerSummaryRow = {
  readonly gross: number;
  readonly discount: number;
  readonly points: number;
  readonly netPaid: number;
  readonly refunds: number;
  readonly vat: number;
  readonly fee: number;
  readonly expense: number;
  readonly profit: number;
  readonly count: number;
};

export type LedgerUnit = "day" | "month" | "year";

export type SalonStore = {
  close(): void;
  list<T extends JsonValue = JsonValue>(kind: RecordKind): readonly SalonRecord<T>[];
  /** Newest `limit` active records of one kind. Cheaper than `list()` when the caller only shows a few. */
  listRecent<T extends JsonValue = JsonValue>(kind: RecordKind, limit: number): readonly SalonRecord<T>[];
  get<T extends JsonValue = JsonValue>(kind: RecordKind, id: string): SalonRecord<T> | null;
  save<T extends JsonValue>(kind: RecordKind, id: string, value: T, actor: string): SalonRecord<T>;
  archive(kind: RecordKind, id: string, actor: string): SalonRecord<JsonValue>;
  appendLedger(input: LedgerInput, actor: string): LedgerEntry;
  appendLedgerBatch(inputs: readonly LedgerInput[], actor: string): readonly LedgerEntry[];
  listLedger(): readonly LedgerEntry[];
  /** Ledger rows in `[start, endExclusive)` by business date. */
  listLedgerRange(start: string, endExclusive: string): readonly LedgerEntry[];
  /** One customer's ledger rows. Cheaper than `listLedger()` when only a selected customer is shown. */
  listLedgerByCustomer(customerId: string): readonly LedgerEntry[];
  /** Grouped totals over `[start, endExclusive)`. Ascending by key. */
  aggregateLedger(start: string, endExclusive: string, unit: LedgerUnit): readonly LedgerAggregateRow[];
  /** Settlement totals over `[start, endExclusive)`. */
  summarizeLedger(start: string, endExclusive: string): LedgerSummaryRow;
  /** Earliest and latest business dates present, or null when the ledger is empty. */
  ledgerBounds(): { readonly first: string; readonly last: string } | null;
  getSettings(): JsonObject;
  saveSettings(values: JsonObject, actor: string): JsonObject;
  /** Audit rows for the given kinds only. `snapshot()` reads the whole table (6,435행 · 2.2MB). */
  listAuditEvents(kinds: readonly string[]): readonly AuditEvent[];
  /** Newest `limit` audit rows. 대시보드는 5행만 쓴다 — 전량 SELECT 13.00ms 대 0.09ms. */
  recentAuditEvents(limit: number): readonly AuditEvent[];
  /** 원장 + 감사에서 `new Date()` 로 파싱되지 않는 행 수. 날짜 열만 읽는다. */
  countMalformedDates(): number;
  snapshot(): SalonSnapshot;
};
