export type RecordKind = string;

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

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
  amountWon: number;
  vatWon?: number;
  feeWon?: number;
  incentiveWon?: number;
  pointsWon?: number;
  couponWon?: number;
  profitWon?: number;
};

export type LedgerEntry = {
  id: string;
  requestKey: string;
  kind: string;
  occurredAt: string;
  correctionOf: string | null;
  amountWon: number;
  vatWon: number;
  feeWon: number;
  incentiveWon: number;
  pointsWon: number;
  couponWon: number;
  profitWon: number;
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

export type SalonStore = {
  list<T extends JsonValue = JsonValue>(kind: RecordKind): readonly SalonRecord<T>[];
  get<T extends JsonValue = JsonValue>(kind: RecordKind, id: string): SalonRecord<T> | null;
  save<T extends JsonValue>(kind: RecordKind, id: string, value: T, actor: string): SalonRecord<T>;
  archive(kind: RecordKind, id: string, actor: string): SalonRecord<JsonValue>;
  appendLedger(input: LedgerInput, actor: string): LedgerEntry;
  listLedger(): readonly LedgerEntry[];
  getSettings(): JsonObject;
  saveSettings(values: JsonObject, actor: string): JsonObject;
  snapshot(): SalonSnapshot;
};
