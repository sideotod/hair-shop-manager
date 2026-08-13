import Link from "next/link";

import { correctExpense, saveExpense, savePreset } from "../../app/operation-actions";
import { ledgerSettlement } from "../../lib/operations";
import { button, control, focusRing, rowLink } from "../button";
import { PageToolbar } from "../page-toolbar";
import type { JsonObject, JsonValue, LedgerEntry, SalonRecord } from "../../lib/salon-domain";
import { SalesControls } from "../sales/sales-controls";
import { revenueRange, type RevenueQuery } from "../sales/revenue-query";
import { seoulBusinessDate, seoulClockOrEmpty } from "../../lib/seoul-date";
import { SubmitButton } from "../submit-button";
import { card } from "../surface";
import { typeScale } from "../type";
const input = `${control} mt-1 w-full`;
const won = (amount: number) => `₩${amount.toLocaleString("ko-KR")}`;
const value = (record: SalonRecord<JsonValue>) => record.value && typeof record.value === "object" && !Array.isArray(record.value) ? record.value as JsonObject : {};
const string = (source: JsonObject, key: string) => typeof source[key] === "string" ? source[key] : "";
const number = (source: JsonObject, key: string) => typeof source[key] === "number" ? source[key] : 0;

/**
 * 지출·정산은 `appendLedger` 를 쓰는 불변 금융 원장이다 (설계 §5.1). 설정이 아니라 돈이라
 * `/sales?tab=expenses` 가 유일한 집이다 — `/operations` 와 이중 렌더하던 `salesContext` 분기는 사라졌다.
 */
type Props = {
  expenses: readonly SalonRecord<JsonValue>[]; ledger: readonly LedgerEntry[];
  correctionId?: string; error?: string; period?: { start: string; end: string };
  /**
   * 숨은 폼 id 의 씨앗. **서버 컴포넌트에서 요청당 1회** 만들어 내려보낸다.
   * 렌더 중 `randomUUID()` 를 부르면 같은 요청의 재렌더마다 마크업이 달라져 캐시가 무의미해진다.
   */
  requestKey: string;
  salesQuery?: RevenueQuery;
};

function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="grid gap-1 text-xs font-medium text-[var(--muted)]"><span>{label}</span>{children}</label>; }
function ReturnTo({ value }: { value: string }) { return <input name="returnTo" type="hidden" value={value} />; }

function ExpenseForm({ presets, requestKey, target, returnTo }: { presets: Props["expenses"]; requestKey: string; target?: LedgerEntry; returnTo: string }) {
  const details = target?.details ?? {}; const current = (key: string) => typeof details[key] === "string" ? details[key] : "";
  const occurred = seoulClockOrEmpty(target?.occurredAt ?? "");
  return <form action={target ? correctExpense : saveExpense} aria-label={target ? "지출 정정" : "지출 등록"} className={card}><ReturnTo value={returnTo} /><input name="requestKey" type="hidden" value={`expense-${requestKey}`} />{target && <input name="targetId" type="hidden" value={target.id} />}<h2 className={typeScale.section}>{target ? "지출 정정" : "지출 등록"}</h2><div className="mt-4 grid grid-cols-2 gap-3"><Field label="지출 프리셋"><select className={input} defaultValue={current("presetId")} name="presetId"><option value="">직접 입력</option>{presets.map((preset) => <option key={preset.id} value={preset.id}>{string(value(preset), "name")}</option>)}</select></Field><Field label="지출 항목"><input className={input} defaultValue={current("expenseName")} name="expenseName" /></Field><Field label="금액"><input className={input} defaultValue={target ? String(target.expenseWon) : ""} min="1" name="amountWon" placeholder="프리셋 기본 금액 사용" type="number" /></Field><Field label="지출일"><input className={input} defaultValue={occurred.date || seoulBusinessDate()} name="occurredDate" required type="date" /></Field><Field label="시간"><input className={input} defaultValue={occurred.time} name="occurredTime" required type="time" /></Field><Field label="메모"><input className={input} defaultValue={current("memo")} maxLength={150} name="memo" /></Field>{/* 정정은 되돌릴 수 없다. 사유를 미리 채워 두면 확인 절차가 통과된 채로 시작한다. */}{target && <Field label="정정 사유"><input className={input} name="reason" required /></Field>}</div><SubmitButton extra="mt-4" size="md">{target ? "정정 저장" : "지출 저장"}</SubmitButton></form>;
}

function LedgerStatus({ kind }: { kind: LedgerEntry["kind"] }) {
  if (kind !== "correction") return <span className="text-[var(--muted)]">지출</span>;
  /** Figma 원장 정정 행: 골드 2px 세로 바 + 골드 12.5px 라벨. */
  return <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--accent)]"><span aria-hidden="true" className="inline-block h-[26px] w-[2px] shrink-0 bg-[var(--accent)]" />정정</span>;
}

function ExpenseLedger({ caption, correctionHref, entries }: { caption?: string; correctionHref?: (id: string) => string; entries: readonly LedgerEntry[] }) {
  const columns = correctionHref ? 5 : 4;
  return <section aria-label="지출 원장" className={`${card} overflow-x-auto ${focusRing}`} tabIndex={0}><h2 className={typeScale.section}>지출 원장</h2><table className="mt-4 w-full min-w-[760px] text-sm"><caption className="sr-only">{caption ?? "지출 원장"}</caption><thead><tr className="border-b border-[var(--border)] text-left text-[var(--muted)]"><th className="p-2" scope="col">일시</th><th className="p-2" scope="col">항목</th><th className="p-2 text-right" scope="col">금액</th><th className="p-2" scope="col">상태</th>{correctionHref && <th className="p-2" scope="col">처리</th>}</tr></thead><tbody>{entries.map((entry) => { const at = seoulClockOrEmpty(entry.occurredAt); return <tr className="border-b border-[var(--border)] last:border-0" key={entry.id}><th className="p-2 font-normal" scope="row">{at.date} {at.time}</th><td className="p-2">{typeof entry.details.expenseName === "string" ? entry.details.expenseName : "지출"}</td><td className="p-2 text-right tabular-nums">{won(entry.expenseWon)}</td><td className="p-2"><LedgerStatus kind={entry.kind} /></td>{correctionHref && <td className="p-2">{entry.kind === "expense" && <Link className={rowLink} href={correctionHref(entry.id)}>정정</Link>}</td>}</tr>; })}{entries.length === 0 && <tr><td className="p-8 text-center text-[var(--muted)]" colSpan={columns}>선택 기간의 지출이 없습니다.</td></tr>}</tbody></table></section>;
}

function Expenses({ correctionId, expenses, ledger, period, requestKey, returnTo }: { correctionId?: string; expenses: Props["expenses"]; ledger: Props["ledger"]; period: NonNullable<Props["period"]>; requestKey: string; returnTo: string }) {
  // `occurredAt` 앞 10자는 서울 영업일이다(09:00 기준, `lib/seoul-date.ts`). SQL `substr(occurred_at,1,10)` 과 같은 값.
  const entries = ledger.filter((entry) => entry.occurredAt.slice(0, 10) >= period.start && entry.occurredAt.slice(0, 10) <= period.end && (entry.kind === "expense" || (entry.kind === "correction" && typeof entry.details.expenseName === "string")));
  const settlement = ledgerSettlement(ledger.filter((entry) => entry.occurredAt.slice(0, 10) >= period.start && entry.occurredAt.slice(0, 10) <= period.end));
  const target = correctionId ? ledger.find((entry) => entry.id === correctionId && entry.kind === "expense") : undefined;
  return <div className="grid gap-5"><div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5"><ExpenseForm presets={expenses} requestKey={requestKey} returnTo={returnTo} target={target} /><form action={savePreset} className={card}><ReturnTo value={returnTo} /><input name="presetType" type="hidden" value="expense" /><input name="presetId" type="hidden" value={`expense-preset-${requestKey}`} /><h2 className={typeScale.section}>지출 프리셋</h2><div className="mt-4 grid grid-cols-2 gap-3"><Field label="항목"><input className={input} name="name" required /></Field><Field label="기본 금액"><input className={input} min="0" name="defaultWon" required type="number" /></Field></div><SubmitButton extra="mt-4" size="md" tone="secondary">프리셋 저장</SubmitButton><ul className="mt-4 divide-y divide-[var(--border)] text-sm">{expenses.map((preset) => <li className="flex justify-between py-2" key={preset.id}><span>{string(value(preset), "name")}</span><strong>{won(number(value(preset), "defaultWon"))}</strong></li>)}</ul></form></div><section aria-label="기간 정산" className={card}><div className="flex items-center justify-between"><div><h2 className={typeScale.section}>기간 정산</h2><p className="text-sm text-[var(--muted)]">{period.start} ~ {period.end}</p></div><form className="flex items-end gap-2" method="get"><input name="tab" type="hidden" value="expenses" /><Field label="시작"><input className={input} defaultValue={period.start === "0000-01-01" ? "" : period.start} name="start" type="date" /></Field><Field label="종료"><input className={input} defaultValue={period.end === "9999-12-31" ? "" : period.end} name="end" type="date" /></Field><button className={button("md", "secondary")} type="submit">적용</button></form></div><dl className="mt-5 grid grid-cols-5 gap-3">{[["총 매출", settlement.grossWon], ["실결제", settlement.amountWon], ["VAT", settlement.vatWon], ["지출", settlement.expenseWon], ["샵 수익", settlement.profitWon]].map(([label, amount]) => <div className="rounded-[var(--radius-card)] bg-[var(--background)] px-4 py-3" key={label as string}><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 font-bold tabular-nums">{won(amount as number)}</dd></div>)}</dl></section><ExpenseLedger caption={`${period.start} ~ ${period.end} 지출 원장`} correctionHref={(id) => `${returnTo}&correction=${encodeURIComponent(id)}`} entries={entries} /></div>;
}

export function OperationsPage({ correctionId, error, expenses, ledger, period = { start: "0000-01-01", end: "9999-12-31" }, requestKey, salesQuery }: Props) {
  const returnTo = "/sales?tab=expenses";
  return <main className="min-w-0 px-7 pb-6 pt-5">{salesQuery && <SalesControls label={revenueRange(salesQuery).label} query={salesQuery} tab="expenses" />}<PageToolbar className="mt-5" description={<>지출 원장과 기간 정산을 관리합니다. 매출 워크스페이스 · 지출·정산</>} />{error &&<p className="mt-5 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">입력 내용을 수정하세요: {error}</p>}<section className="mt-5"><Expenses correctionId={correctionId} expenses={expenses} ledger={ledger} period={period} requestKey={requestKey} returnTo={returnTo} /></section></main>;
}
