import Link from "next/link";

import { adjustCustomerPoints, chargePrepaid } from "../../app/customer-actions";
import { customerCode } from "../../lib/customer-code";
import { closeHref, toSearchParams, withoutParams } from "../../lib/navigation";
import { formatPhone } from "../../lib/phone";
import type { JsonObject, JsonValue, LedgerEntry, SalonRecord } from "../../lib/salon-domain";
import { seoulClockOrEmpty } from "../../lib/seoul-date";
import { button, control, focusRing } from "../button";
import { ModalHost } from "../modal-host";
import { PageToolbar } from "../page-toolbar";
import { NoticeBanner, SubmitButton } from "../submit-button";
import { typeScale } from "../type";
import { CustomerForm } from "./customer-form";
import { CustomerPaymentDialog } from "./customer-payment-dialog";

const input = `${control} min-w-0`;
/** 상세 탭. 하나만 켜지고, 켜진 것만 본문을 그린다. */
const detailTabs = [["기본정보", "profile"], ["예약", "bookings"], ["시술·결제", "ledger"], ["포인트", "points"], ["문자", "messages"]] as const;
const sortModes = [["name", "이름"], ["joined", "등록일"], ["visit", "최근 방문일"]] as const;

type Props = {
  customers: readonly SalonRecord<JsonValue>[]; settings: JsonObject; bookings: readonly SalonRecord<JsonValue>[]; messages: readonly SalonRecord<JsonValue>[]; ledger: readonly LedgerEntry[];
  /** 고객별 마지막 결제 시각. 정렬에만 쓰므로 원장 전량을 읽지 않는다. */
  lastVisits?: ReadonlyMap<string, string>;
  selectedCustomerId?: string; query?: string; sort?: string; tab?: string; page?: string;
  showNew?: boolean; editCustomerId?: string; payCustomerId?: string; showPrepaid?: boolean;
  requestKey: string; today?: string;
  error?: string; notice?: string;
  /** 라우트가 받은 원본 쿼리. 닫기 경로를 여기서 파생시킨다. */
  searchParams?: Record<string, string | string[] | undefined>;
};

function value(record: SalonRecord<JsonValue>) { return typeof record.value === "object" && record.value !== null && !Array.isArray(record.value) ? record.value as JsonObject : {}; }
function text(record: SalonRecord<JsonValue>, key: string, fallback = "-") { const field = value(record)[key]; return typeof field === "string" ? field : fallback; }
function number(record: SalonRecord<JsonValue>, key: string) { const field = value(record)[key]; return typeof field === "number" ? field : 0; }
function linked(records: readonly SalonRecord<JsonValue>[], customerId: string, field = "customerId") { return records.filter((record) => text(record, field, "") === customerId); }
function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="grid gap-1 text-xs font-medium text-[var(--muted)]"><span>{label}</span>{children}</label>; }
function listItems(records: readonly SalonRecord<JsonValue>[], empty: string, render: (record: SalonRecord<JsonValue>) => React.ReactNode) { return records.length ? <ul className="mt-2 divide-y divide-[var(--border)]">{records.map((record) => <li className="py-2 text-sm" key={record.id}>{render(record)}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--muted)]">{empty}</p>; }

/**
 * 목록 안 검색. **숫자면 번호 뒷자리, 아니면 이름.**
 *
 * 셸 헤더의 검색은 화면을 옮겨 다니는 검색이고, 이건 지금 보고 있는 목록을 좁히는 검색이다.
 * 모드 선택칸을 두지 않는 이유는 원장이 실제로 치는 게 둘뿐이기 때문이다 — "김서연" 아니면 "5678".
 */
function matches(record: SalonRecord<JsonValue>, query: string) {
  if (!query) return true;
  const digits = query.replace(/\D/g, "");
  return /^\d+$/.test(query.trim()) && digits
    ? text(record, "phone", "").endsWith(digits)
    : text(record, "name", "").includes(query.trim());
}

/**
 * 한 페이지에 보여줄 고객 수.
 *
 * 858명을 한 번에 흘리면 목록이 45,000px가 되어 "아까 그 고객"으로 돌아갈 방법이 스크롤뿐이었다.
 * 이제 목록 칸은 화면 높이에 맞춰 고정되므로 페이지 크기도 그 안에 들어가는 만큼으로 맞춘다.
 * 1440×900 에서 목록 스크롤 영역은 519px, 한 행은 52px — 실측으로 9행이다(Playwright).
 * 12행이면 페이지 안에서 또 스크롤해야 하고, 그러면 페이지를 나눈 의미가 없어진다.
 */
const pageSize = 9;

export function CustomersPage({ customers, settings, bookings, messages, ledger, lastVisits, selectedCustomerId, error, notice, query = "", sort = "name", tab = "ledger", page = "1", showNew, editCustomerId, payCustomerId, showPrepaid, requestKey, today = "", searchParams }: Props) {
  const filtered = customers.filter((record) => matches(record, query));
  const collator = new Intl.Collator("ko-KR");
  const sorted = [...filtered].sort((left, right) => {
    if (sort === "joined") return text(right, "joinedAt", "").localeCompare(text(left, "joinedAt", ""));
    if (sort === "visit") return (lastVisits?.get(right.id) ?? "").localeCompare(lastVisits?.get(left.id) ?? "");
    return collator.compare(text(left, "name", ""), text(right, "name", ""));
  });
  const selected = customers.find(({ id }) => id === selectedCustomerId) ?? null;
  const selectedBookings = selected ? linked(bookings, selected.id) : [];
  const selectedMessages = selected ? linked(messages, selected.id, "recipientId") : [];
  const selectedLedger = selected ? ledger.filter((entry) => entry.customerId === selected.id) : [];
  // 포인트 조정은 돈이 오간 거래가 아니다. 시술·결제 이력에 두면 ₩0 짜리 결제 행으로 찍힌다. 포인트 이력에만 남긴다.
  const paymentLedger = selectedLedger.filter((entry) => entry.kind !== "point-adjust");
  const pointLedger = selectedLedger.filter((entry) => entry.pointsWon !== 0);

  // 닫기 경로는 현재 URL 에서 모달 키만 지워 만든다. 손으로 조립하면 `customer`, `sort` 처럼
  // 화이트리스트에 없는 파라미터가 조용히 사라져 "닫았더니 다른 화면" 이 된다.
  const modalKeys = ["new", "edit", "pay", "prepaid"] as const;
  const current = toSearchParams(searchParams ?? { ...(query ? { query } : {}), ...(sort !== "name" ? { sort } : {}), ...(selectedCustomerId ? { customer: selectedCustomerId } : {}) });
  const customerHref = closeHref("/customers", current, ...modalKeys);
  const href = (changes: Record<string, string | undefined>) => {
    const params = withoutParams(current, ...modalKeys);
    for (const [key, item] of Object.entries(changes)) { if (item === undefined) params.delete(key); else params.set(key, item); }
    const search = params.toString();
    return search ? `/customers?${search}` : "/customers";
  };

  // 페이지 번호는 항상 유효 범위로 접는다. `?page=999` 나 `?page=abc` 로 들어와도 빈 목록이 아니라 마지막(또는 첫) 페이지가 나온다.
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(pageCount, Math.max(1, Math.trunc(Number(page)) || 1));
  const pageStart = (currentPage - 1) * pageSize;
  const visible = sorted.slice(pageStart, pageStart + pageSize);

  const editing = editCustomerId ? customers.find(({ id }) => id === editCustomerId) ?? null : null;
  const paying = payCustomerId ? customers.find(({ id }) => id === payCustomerId) ?? null : null;
  const prepaidTarget = showPrepaid ? selected : null;
  const dialog = showNew || editing || paying || prepaidTarget
    ? { label: paying ? "결제 등록" : prepaidTarget ? "선결제 충전" : editing ? "고객 정보 변경" : "고객 등록", wide: Boolean(paying) }
    : null;

  return <main className="flex h-full min-w-[1032px] flex-col px-7 pb-6 pt-5">
    {dialog && <ModalHost label={dialog.label}>
      {/* 전역 `[data-dialog-panel]` 은 `min(1120px,100%)` 다. 여기 폼들은 한 칸씩 세로로 서므로
          그 폭을 쓰면 라벨과 입력칸 사이가 한 뼘씩 벌어진다. 결제는 금액 격자가 2열이라 조금 더 넓다. */}
      <section aria-label={dialog.label} aria-modal="true" className={`dialog-scroll p-5 ${dialog.wide ? "!w-[560px]" : "!w-[420px]"} !max-w-full`} data-dialog-panel role="dialog">
        <div className="flex items-center justify-between gap-4">
          <h2 className={typeScale.title}>{dialog.label}</h2>
          <Link className={button("md")} data-dialog-close href={customerHref}>닫기</Link>
        </div>
        {paying
          ? <div className="mt-5"><CustomerPaymentDialog cardFeeRate={typeof settings.cardFeeRate === "number" ? settings.cardFeeRate : 0} customer={{ id: paying.id, value: value(paying) }} error={error} pointEarnRate={typeof settings.pointEarnRate === "number" ? settings.pointEarnRate : 1} requestKey={requestKey} returnTo={customerHref} today={today} vatMode={settings.vatMode === "separate" ? "separate" : "included"} /></div>
          : prepaidTarget
            ? <form action={chargePrepaid} aria-label="선결제 충전" className="mt-5 grid gap-4">
              <input name="customerId" type="hidden" value={prepaidTarget.id} />
              <input name="requestKey" type="hidden" value={requestKey} />
              <input name="returnTo" type="hidden" value={customerHref} />
              <p className="rounded-[var(--radius-card)] bg-[var(--background)] px-4 py-3 text-sm">{text(prepaidTarget, "name")} · 현재 잔액 <strong className="tabular-nums">₩{number(prepaidTarget, "prepaidWon").toLocaleString("ko-KR")}</strong></p>
              <Field label="충전 금액(원)"><input className={`${input} w-full`} inputMode="numeric" name="amountWon" required /></Field>
              <Field label="받은 방법"><select className={`${input} w-full`} defaultValue="cash" name="method"><option value="cash">현금</option><option value="card">카드</option><option value="transfer">계좌이체</option></select></Field>
              <SubmitButton extra="w-full">선결제 충전</SubmitButton>
            </form>
            : <CustomerForm customer={editing ?? undefined} returnTo={customerHref} settings={settings} />}
      </section>
    </ModalHost>}

    <PageToolbar description={<>이름이나 휴대전화 뒷자리로 좁히고, 선택한 고객의 이력을 오른쪽에서 확인합니다. 등록 {customers.length.toLocaleString("ko-KR")}명{query && <> · 검색 일치 {filtered.length.toLocaleString("ko-KR")}명</>}</>}>
      <Link className={button("lg", "primary")} href={href({ new: "1" })}>고객 등록</Link>
    </PageToolbar>
    {error && !paying && <p className="mt-5 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">{error}</p>}
    {notice && <NoticeBanner className="mt-5 rounded-[var(--radius-card)] border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">{notice}</NoticeBanner>}

    {/* 두 칸은 같은 높이로 서고 **각자 안에서만** 스크롤한다. 페이지 전체가 늘어나면
        오른쪽 이력을 보려고 내린 스크롤이 왼쪽 목록을 화면 밖으로 밀어낸다. */}
    <div className="mt-5 grid min-h-0 flex-1 grid-cols-[minmax(360px,0.85fr)_minmax(480px,1.15fr)] grid-rows-1 gap-5">
      <section aria-label="고객 목록" className="flex min-h-0 flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">고객 목록</h2>
            <span className="text-xs text-[var(--muted)]">{sorted.length.toLocaleString("ko-KR")}명 중 <span className="tabular-nums">{sorted.length ? pageStart + 1 : 0}–{pageStart + visible.length}</span></span>
          </div>
          {/* 검색은 GET 폼이라 JS 없이도 동작한다. 검색어가 바뀌면 페이지는 1로 돌아간다. */}
          <form action="/customers" className="mt-3 flex gap-2" method="get">
            {selectedCustomerId && <input name="customer" type="hidden" value={selectedCustomerId} />}
            {sort !== "name" && <input name="sort" type="hidden" value={sort} />}
            <input aria-label="이름 또는 휴대전화 뒷자리" className={`${input} flex-1`} defaultValue={query} name="query" placeholder="이름 또는 휴대전화 뒷자리" />
            <button className={button("md", "secondary")} type="submit">검색</button>
            {query && <Link className={button("md", "quiet")} href={href({ query: undefined, page: undefined })}>해제</Link>}
          </form>
          <nav aria-label="고객 목록 정렬" className="mt-3 flex gap-2">
            {sortModes.map(([key, name]) => <Link className={button("xs", sort === key ? "primary" : "secondary")} href={href({ sort: key === "name" ? undefined : key, page: undefined })} key={key}>{name}</Link>)}
          </nav>
        </div>
        <ul className="dialog-scroll min-h-0 flex-1 divide-y divide-[var(--border)] overflow-auto" data-customer-list>
          {visible.map((record) => <li className="h-[52px]" data-customer-row={record.id} key={record.id}>
            <Link className={`flex h-full items-center gap-3 px-5 hover:bg-[var(--background)] ${focusRing} ${record.id === selectedCustomerId ? "bg-[var(--background)]" : ""}`} href={href({ customer: record.id })}>
              <strong className="min-w-0 truncate">{text(record, "name")}</strong>
              <span className="ml-auto shrink-0 text-xs tabular-nums text-[var(--muted)]">{formatPhone(text(record, "phone", "")) || "휴대전화 없음"}</span>
            </Link>
          </li>)}
          {sorted.length === 0 && <li className="p-8 text-center text-sm text-[var(--muted)]">{query ? "검색과 일치하는 고객이 없습니다." : "등록된 고객이 없습니다."}</li>}
        </ul>
        {pageCount > 1 && <nav aria-label="고객 목록 페이지" className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3 text-sm">
          <span className="text-[var(--muted)]"><span className="tabular-nums">{currentPage}</span> / <span className="tabular-nums">{pageCount}</span> 페이지</span>
          <span className="flex gap-2">
            {currentPage > 1 ? <Link className={button("sm", "secondary")} href={href({ page: currentPage - 1 <= 1 ? undefined : String(currentPage - 1) })} rel="prev">이전</Link> : <span aria-disabled="true" className={button("sm", "secondary", "pointer-events-none opacity-40")}>이전</span>}
            {currentPage < pageCount ? <Link className={button("sm", "secondary")} href={href({ page: String(currentPage + 1) })} rel="next">다음</Link> : <span aria-disabled="true" className={button("sm", "secondary", "pointer-events-none opacity-40")}>다음</span>}
          </span>
        </nav>}
      </section>

      <aside aria-label="고객 상세" className="dialog-scroll min-h-0 overflow-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
        {selected ? <>
          <p className="text-xs font-medium text-[var(--muted)]">선택 고객</p>
          <h2 className={`mt-1 flex items-baseline gap-2 ${typeScale.title}`}>{text(selected, "name")}<span className="text-xs font-medium tabular-nums text-[var(--muted)]">{customerCode(selected.id)}</span></h2>
          <p className="mt-1 text-sm tabular-nums text-[var(--muted)]">{formatPhone(text(selected, "phone", "")) || "휴대전화 없음"}</p>
          {/* 세 버튼은 한 줄이다. `고객 정보 변경` 만 아래 접힘 안에 숨어 있던 탓에
              "고쳐야 하는데 어디서?" 가 반복됐다. 같은 줄에 두면 찾을 곳이 하나다. */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className={button("sm", "primary")} data-selected-customer-payment={selected.id} href={href({ pay: selected.id })}>결제 등록</Link>
            <Link className={button("sm")} href={href({ prepaid: "1" })}>선결제 충전</Link>
            <Link className={button("sm")} href={href({ edit: selected.id })}>고객 정보 변경</Link>
          </div>
          <p className="mt-4 border-y border-[var(--border)] py-3 text-sm">포인트 <span className="tabular-nums">{number(selected, "points").toLocaleString("ko-KR")}P</span> · 선결제 잔액 <span className="tabular-nums">₩{number(selected, "prepaidWon").toLocaleString("ko-KR")}</span></p>

          {/* 다섯 구역을 전부 펼쳐 두면 상세 칸이 목록보다 세 배 길어져 두 칸 높이가 어긋난다.
              탭은 그대로 두되 **누른 것만** 그린다. 링크라 뒤로가기도 그대로 동작한다. */}
          <nav aria-label="고객 상세 구역" className="mt-4 flex flex-wrap gap-2">
            {detailTabs.map(([name, key]) => <Link aria-current={tab === key ? "page" : undefined} className={button("sm", tab === key ? "primary" : "quiet")} href={href({ tab: key })} key={key}>{name}</Link>)}
          </nav>

          <section className="mt-5">
            {tab === "profile" && <><h3 className="font-bold">기본 정보</h3><dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm"><dt className="text-[var(--muted)]">성별</dt><dd>{{ female: "여성", male: "남성" }[text(selected, "gender", "")] ?? "미지정"}</dd><dt className="text-[var(--muted)]">첫 방문날짜</dt><dd className="tabular-nums">{text(selected, "joinedAt", "기록 없음")}</dd><dt className="text-[var(--muted)]">문자 수신</dt><dd>{value(selected).smsOptIn === false ? "거부" : "동의"}</dd><dt className="text-[var(--muted)]">메모</dt><dd className="whitespace-pre-wrap">{text(selected, "memo", "메모 없음")}</dd></dl></>}
            {tab === "bookings" && <><h3 className="font-bold">예약 이력</h3>{listItems(selectedBookings, "예약 이력이 없습니다.", (record) => { const at = seoulClockOrEmpty(text(record, "startsAt")); return <>{at.date} {at.time} · {text(record, "service")} · {text(record, "status")}</>; })}</>}
            {tab === "ledger" && <><h3 className="font-bold">시술·결제 이력</h3>{paymentLedger.length ? <ul className="mt-2 divide-y divide-[var(--border)]">{paymentLedger.map((entry) => <li className="py-2 text-sm tabular-nums" key={entry.id}>{entry.occurredAt.slice(0, 10)} · {typeof entry.details.serviceMajor === "string" ? entry.details.serviceMajor : "결제"} · ₩{entry.amountWon.toLocaleString("ko-KR")}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--muted)]">시술·결제 이력이 없습니다.</p>}</>}
            {tab === "points" && <><h3 className="font-bold">포인트 이력</h3>{pointLedger.length ? <ul className="mt-2">{pointLedger.map((entry) => <li className="text-sm tabular-nums" key={entry.id}>{entry.occurredAt.slice(0, 10)} · {entry.pointsWon.toLocaleString("ko-KR")}P{typeof entry.details.reason === "string" && entry.details.reason ? <span className="ml-2 text-xs text-[var(--muted)]">{entry.details.reason}</span> : null}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--muted)]">포인트 변동 이력이 없습니다.</p>}
              {/* 되돌릴 수 없는 조정이라 사유가 필수다. 사유칸이 곧 확인 절차 — 별도 confirm 다이얼로그를 두지 않는다. */}
              <form action={adjustCustomerPoints} className="mt-4 grid grid-cols-[120px_1fr_auto] items-end gap-2 border-t border-[var(--border)] pt-4"><input name="customerId" type="hidden" value={selected.id} /><Field label="조정 포인트"><input className={input} name="pointsWon" placeholder="-500" required step="1" type="number" /></Field><Field label="조정 사유 (필수)"><input className={input} maxLength={150} name="reason" required /></Field><SubmitButton size="md" tone="secondary">포인트 조정</SubmitButton></form></>}
            {tab === "messages" && <><h3 className="font-bold">문자 발송 이력</h3>{listItems(selectedMessages, "문자 발송 이력이 없습니다.", (record) => <>{text(record, "channel")} · {text(record, "status")}</>)}<Link className={button("sm", "quiet", "mt-3")} href={`/messages?customer=${selected.id}`}>문자 발송으로 이동</Link></>}
          </section>
        </> : <p className="p-8 text-center text-sm text-[var(--muted)]">목록에서 고객을 선택하면 상세와 이력을 확인할 수 있습니다.</p>}
      </aside>
    </div>
  </main>;
}
