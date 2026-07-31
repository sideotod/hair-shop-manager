export type RecordKind = string;

export type SalonRecord<T> = {
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
  payload: unknown;
};

export type SalonSnapshot = {
  records: Readonly<Record<string, readonly SalonRecord<unknown>[]>>;
  ledger: readonly LedgerEntry[];
  settings: Readonly<Record<string, unknown>>;
  auditEvents: readonly AuditEvent[];
};

export type SalonStore = {
  list<T>(kind: RecordKind): readonly SalonRecord<T>[];
  get<T>(kind: RecordKind, id: string): SalonRecord<T> | null;
  save<T>(kind: RecordKind, id: string, value: T, actor: string): SalonRecord<T>;
  archive(kind: RecordKind, id: string, actor: string): SalonRecord<unknown>;
  appendLedger(input: LedgerInput, actor: string): LedgerEntry;
  listLedger(): readonly LedgerEntry[];
  getSettings(): Record<string, unknown>;
  saveSettings(values: Record<string, unknown>, actor: string): Record<string, unknown>;
  snapshot(): SalonSnapshot;
};
