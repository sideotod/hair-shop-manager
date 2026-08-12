import Link from "next/link";

import { correctExpense, saveCatalogItem, saveExpense, savePreset } from "../../app/operation-actions";
import { ledgerSettlement } from "../../lib/operations";
import { button, control, focusRing, rowLink } from "../button";
import { PageToolbar } from "../page-toolbar";
import type { JsonObject, JsonValue, LedgerEntry, SalonRecord } from "../../lib/salon-domain";
import { navChip, SalesControls } from "../sales/sales-controls";
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
const settingValues = (settings: JsonObject, key: string) => typeof settings[key] === "string" ? settings[key] : "";
type Tab = "services" | "memos" | "expenses";

type Props = {
  catalog: readonly SalonRecord<JsonValue>[]; expenses: readonly SalonRecord<JsonValue>[]; ledger: readonly LedgerEntry[]; settings: JsonObject; customers?: readonly SalonRecord<JsonValue>[];
  activeTab?: Tab; correctionId?: string; editCatalogId?: string; error?: string; period?: { start: string; end: string }; print?: boolean;
  /**
   * 숨은 폼 id 의 씨앗. **서버 컴포넌트에서 요청당 1회** 만들어 내려보낸다.
   * 렌더 중 `randomUUID()` 를 부르면 같은 요청의 재렌더마다 마크업이 달라져 캐시가 무의미해진다.
   */
  requestKey: string;
  salesContext?: boolean; salesQuery?: RevenueQuery;
};

function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="grid gap-1 text-xs font-medium text-[var(--muted)]"><span>{label}</span>{children}</label>; }
function ReturnTo({ value }: { value: string }) { return <input name="returnTo" type="hidden" value={value} />; }

function PriceList({ catalog, print, editHref }: { catalog: Props["catalog"]; print: boolean; editHref?: (id: string) => string }) {
  const services = catalog.filter((item) => ["service-major", "service-detail"].includes(string(value(item), "type")));
  return <section aria-label={print ? "인쇄용 서비스 가격표" : "서비스 가격표"} className={card}><h2 className={typeScale.section}>{print ? "인쇄용 서비스 가격표" : "서비스 가격표"}</h2><table className="mt-4 w-full text-sm"><caption className="sr-only">{print ? "인쇄용 서비스 가격표" : "서비스 가격표"}</caption><thead><tr className="border-b border-[var(--border)] text-left text-[var(--muted)]"><th className="p-2" scope="col">대분류</th><th className="p-2" scope="col">시술</th><th className="p-2 text-right" scope="col">가격</th>{editHref && <th className="p-2" scope="col">처리</th>}</tr></thead><tbody>{services.map((item) => <tr className="border-b border-[var(--border)] last:border-0" key={item.id}><td className="p-2">{string(value(item), "category") || (string(value(item), "type") === "service-major" ? string(value(item), "name") : "-")}</td><td className="p-2">{string(value(item), "type") === "service-major" ? "대분류" : string(value(item), "name")}</td><td className="p-2 text-right font-medium tabular-nums">{won(number(value(item), "priceWon"))}</td>{editHref && <td className="p-2"><Link className={rowLink} data-catalog-edit={item.id} href={editHref(item.id)}>수정</Link></td>}</tr>)}{services.length === 0 && <tr><td className="py-8 text-center text-[var(--muted)]" colSpan={editHref ? 4 : 3}>등록된 시술 가격이 없습니다.</td></tr>}</tbody></table></section>;
}

function Services({ catalog, editCatalogId, print, requestKey, returnTo }: { catalog: Props["catalog"]; editCatalogId?: string; print: boolean; requestKey: string; returnTo: string }) {
  if (print) return <PriceList catalog={catalog} print />;
  const editing = catalog.find((item) => item.id === editCatalogId); const current = editing ? value(editing) : {};
  return <div className="grid grid-cols-2 gap-5"><form action={saveCatalogItem} className={card}><ReturnTo value={returnTo} /><input name="catalogId" type="hidden" value={editing?.id ?? `catalog-${requestKey}`} /><h2 className={typeScale.section}>{editing ? "시술 분류·가격 수정" : "시술 분류·가격 등록"}</h2><div className="mt-4 grid grid-cols-2 gap-3"><Field label="구분"><select className={input} defaultValue={string(current, "type") || "service-major"} name="type"><option value="service-major">시술 대분류</option><option value="service-detail">시술 상세</option></select></Field><Field label="대분류"><input className={input} defaultValue={string(current, "category")} name="category" placeholder="커트" /></Field><Field label="항목명"><input className={input} defaultValue={string(current, "name")} name="name" required /></Field><Field label="가격"><input className={input} defaultValue={editing ? String(number(current, "priceWon")) : ""} min="0" name="priceWon" required type="number" /></Field></div><SubmitButton extra="mt-4" size="md">{editing ? "수정 저장" : "시술 저장"}</SubmitButton></form><PriceList catalog={catalog} editHref={(id) => `/operations?tab=services&edit=${encodeURIComponent(id)}`} print={false} /></div>;
}

function Memos({ settings, returnTo }: { settings: JsonObject; returnTo: string }) {
  const presets = [["scalpStates", "두피 상태"], ["hairTraits", "모발 특징"], ["selectedMemos", "선택 메모"], ["gifts", "사은품"], ["quickMemos", "간편 메모"]] as const;
  return <section className="grid grid-cols-2 gap-5" aria-label="메모와 상태값"><p className="col-span-2 text-sm text-[var(--muted)]">쉼표로 구분해 결제·고객 기록에서 사용할 값을 관리합니다.</p>{presets.map(([key, label]) => <form action={savePreset} aria-label={`${label} 저장`} className={card} key={key}><ReturnTo value={returnTo} /><input name="presetType" type="hidden" value={key} /><Field label={label}><input className={input} defaultValue={settingValues(settings, key)} name="values" required /></Field><SubmitButton extra="mt-4" size="md" tone="secondary">{label} 저장</SubmitButton></form>)}</section>;
}

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

function ExpenseLedger({ caption, correctionHref, entries, print }: { caption?: string; correctionHref?: (id: string) => string; entries: readonly LedgerEntry[]; print?: boolean }) {
  const columns = correctionHref ? 5 : 4;
  return <section aria-label={print ? "인쇄용 지출 원장" : "지출 원장"} className={`${card} overflow-x-auto ${focusRing}`} tabIndex={0}><h2 className={typeScale.section}>{print ? "인쇄용 지출 원장" : "지출 원장"}</h2><table className="mt-4 w-full min-w-[760px] text-sm"><caption className="sr-only">{caption ?? (print ? "인쇄용 지출 원장" : "지출 원장")}</caption><thead><tr className="border-b border-[var(--border)] text-left text-[var(--muted)]"><th className="p-2" scope="col">일시</th><th className="p-2" scope="col">항목</th><th className="p-2 text-right" scope="col">금액</th><th className="p-2" scope="col">상태</th>{correctionHref && <th className="p-2" scope="col">처리</th>}</tr></thead><tbody>{entries.map((entry) => { const at = seoulClockOrEmpty(entry.occurredAt); return <tr className="border-b border-[var(--border)] last:border-0" key={entry.id}><th className="p-2 font-normal" scope="row">{at.date} {at.time}</th><td className="p-2">{typeof entry.details.expenseName === "string" ? entry.details.expenseName : "지출"}</td><td className="p-2 text-right tabular-nums">{won(entry.expenseWon)}</td><td className="p-2"><LedgerStatus kind={entry.kind} /></td>{correctionHref && <td className="p-2">{entry.kind === "expense" && <Link className={rowLink} href={correctionHref(entry.id)}>정정</Link>}</td>}</tr>; })}{entries.length === 0 && <tr><td className="p-8 text-center text-[var(--muted)]" colSpan={columns}>선택 기간의 지출이 없습니다.</td></tr>}</tbody></table></section>;
}

function Expenses({ correctionId, expenses, ledger, period, print, requestKey, returnTo }: { correctionId?: string; expenses: Props["expenses"]; ledger: Props["ledger"]; period: NonNullable<Props["period"]>; print: boolean; requestKey: string; returnTo: string }) {
  // `occurredAt` 앞 10자는 서울 영업일이다(09:00 기준, `lib/seoul-date.ts`). SQL `substr(occurred_at,1,10)` 과 같은 값.
  const entries = ledger.filter((entry) => entry.occurredAt.slice(0, 10) >= period.start && entry.occurredAt.slice(0, 10) <= period.end && (entry.kind === "expense" || (entry.kind === "correction" && typeof entry.details.expenseName === "string")));
  const settlement = ledgerSettlement(ledger.filter((entry) => entry.occurredAt.slice(0, 10) >= period.start && entry.occurredAt.slice(0, 10) <= period.end));
  const target = correctionId ? ledger.find((entry) => entry.id === correctionId && entry.kind === "expense") : undefined;
  if (print) return <div className="grid gap-5"><section aria-label="인쇄용 지출 정산" className={card}><h2 className={typeScale.section}>인쇄용 지출 정산</h2><p className="mt-1 text-sm text-[var(--muted)]">{period.start} ~ {period.end}</p><dl className="mt-5 grid grid-cols-3 gap-3">{[["지출", settlement.expenseWon], ["실결제", settlement.amountWon], ["샵 수익", settlement.profitWon]].map(([label, amount]) => <div className="rounded-[var(--radius-card)] bg-[var(--background)] px-4 py-3" key={label as string}><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 font-bold tabular-nums">{won(amount as number)}</dd></div>)}</dl></section><ExpenseLedger entries={entries} print /></div>;
  return <div className="grid gap-5"><div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5"><ExpenseForm presets={expenses} requestKey={requestKey} returnTo={returnTo} target={target} /><form action={savePreset} className={card}><ReturnTo value={returnTo} /><input name="presetType" type="hidden" value="expense" /><input name="presetId" type="hidden" value={`expense-preset-${requestKey}`} /><h2 className={typeScale.section}>지출 프리셋</h2><div className="mt-4 grid grid-cols-2 gap-3"><Field label="항목"><input className={input} name="name" required /></Field><Field label="기본 금액"><input className={input} min="0" name="defaultWon" required type="number" /></Field></div><SubmitButton extra="mt-4" size="md" tone="secondary">프리셋 저장</SubmitButton><ul className="mt-4 divide-y divide-[var(--border)] text-sm">{expenses.map((preset) => <li className="flex justify-between py-2" key={preset.id}><span>{string(value(preset), "name")}</span><strong>{won(number(value(preset), "defaultWon"))}</strong></li>)}</ul></form></div><section aria-label="기간 정산" className={card}><div className="flex items-center justify-between"><div><h2 className={typeScale.section}>기간 정산</h2><p className="text-sm text-[var(--muted)]">{period.start} ~ {period.end}</p></div><form className="flex items-end gap-2" method="get"><input name="tab" type="hidden" value="expenses" /><Field label="시작"><input className={input} defaultValue={period.start === "0000-01-01" ? "" : period.start} name="start" type="date" /></Field><Field label="종료"><input className={input} defaultValue={period.end === "9999-12-31" ? "" : period.end} name="end" type="date" /></Field><button className={button("md", "secondary")} type="submit">적용</button></form></div><dl className="mt-5 grid grid-cols-5 gap-3">{[["총 매출", settlement.grossWon], ["실결제", settlement.amountWon], ["VAT", settlement.vatWon], ["지출", settlement.expenseWon], ["샵 수익", settlement.profitWon]].map(([label, amount]) => <div className="rounded-[var(--radius-card)] bg-[var(--background)] px-4 py-3" key={label as string}><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 font-bold tabular-nums">{won(amount as number)}</dd></div>)}</dl></section><ExpenseLedger caption={`${period.start} ~ ${period.end} 지출 원장`} correctionHref={(id) => `${returnTo}&correction=${encodeURIComponent(id)}`} entries={entries} /></div>;
}

export function OperationsPage({ activeTab = "services", catalog, correctionId, editCatalogId, error, expenses, ledger, period = { start: "0000-01-01", end: "9999-12-31" }, print = false, requestKey, salesContext = false, salesQuery, settings, customers = [] }: Props) {
  const returnTo = salesContext ? "/sales?tab=expenses" : `/operations?tab=${activeTab}`;
  const href = (tab: Tab) => salesContext ? "/sales?tab=expenses" : `/operations?tab=${tab}`;
  const expensePrintHref = `/operations?tab=expenses&print=1&start=${encodeURIComponent(period.start)}&end=${encodeURIComponent(period.end)}`;
  const salesControls = salesContext && salesQuery ? <SalesControls label={revenueRange(salesQuery).label} query={salesQuery} tab="expenses" /> : null;
  return <main className="min-w-0 px-7 pb-6 pt-5">{!print && salesControls}<PageToolbar className={salesContext ? "mt-5" : ""} description={<>시술 가격, 기록 값, 지출 원장을 한 곳에서 관리합니다. {salesContext ? "매출 워크스페이스 · 지출·정산" : `${activeTab === "services" ? "시술 설정" : activeTab === "memos" ? "메모·상태값" : "지출·정산"} · 원장 계정`}</>}>{activeTab === "services" && !print && <Link className={button("md")} href="/operations?tab=services&print=1">인쇄용 가격표</Link>}{activeTab === "expenses" && !print && <Link className={button("md")} href={expensePrintHref}>인쇄용 지출 원장</Link>}</PageToolbar>{error &&<p className="mt-5 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">입력 내용을 수정하세요: {error}</p>}{!print && !salesContext && <nav aria-label="운영 설정 기능" className="mt-5 flex gap-2">{([["services", "시술 설정"], ["memos", "메모·상태값"], ["expenses", "지출·정산"]] as const).map(([tab, label]) => <Link aria-current={activeTab === tab ? "page" : undefined} className={navChip(activeTab === tab)} href={href(tab)} key={tab}>{label}</Link>)}</nav>}<section className="mt-5">{activeTab === "services" ? <Services catalog={catalog} editCatalogId={editCatalogId} print={print} requestKey={requestKey} returnTo={returnTo} /> : activeTab === "memos" ? <Memos settings={settings} returnTo={returnTo} /> : <Expenses correctionId={correctionId} expenses={expenses} ledger={ledger} period={period} print={print} requestKey={requestKey} returnTo={returnTo} />}</section></main>;
}
