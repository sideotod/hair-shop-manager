import Link from "next/link";

import { adjustCustomerPoints, chargePrepaid } from "../../app/customer-actions";
import { customerCode } from "../../lib/customer-code";
import { messagingUiEnabled } from "../../lib/feature-flags";
import { closeHref, toSearchParams, withoutParams } from "../../lib/navigation";
import { formatPhone } from "../../lib/phone";
import type { JsonObject, JsonValue, LedgerEntry, SalonRecord } from "../../lib/salon-domain";
import { seoulClockOrEmpty } from "../../lib/seoul-date";
import { button, control, focusRing } from "../button";
import { ModalHost } from "../modal-host";
import { NoticeBanner, SubmitButton } from "../submit-button";
import { typeScale } from "../type";
import { CustomerForm, type DuplicateEntry } from "./customer-form";

const input = `${control} min-w-0`;
/** 상세 탭. 하나만 켜지고, 켜진 것만 본문을 그린다. */
const detailTabs = [["기본정보", "profile"], ["예약", "bookings"], ["시술·결제", "ledger"], ["포인트", "points"]] as const;
const sortModes = [["name", "이름"], ["joined", "등록일"], ["visit", "최근 방문일"]] as const;

type Props = {
  customers: readonly SalonRecord<JsonValue>[]; settings: JsonObject; bookings: readonly SalonRecord<JsonValue>[]; messages: readonly SalonRecord<JsonValue>[]; ledger: readonly LedgerEntry[];
  /** 시술 대분류 선택지의 원천. 결제 팝업이 `serviceMajorOptions()` 로 읽는다 (`operations.ts:65`). */
  catalog?: readonly SalonRecord<JsonValue>[];
  /** 고객별 마지막 결제 시각. 정렬에만 쓰므로 원장 전량을 읽지 않는다. */
  lastVisits?: ReadonlyMap<string, string>;
  selectedCustomerId?: string; query?: string; sort?: string; tab?: string; page?: string;
  showNew?: boolean; editCustomerId?: string; payCustomerId?: string; showPrepaid?: boolean; newCustomerName?: string;
  requestKey: string;
  /** 결제 팝업 기본 시각. 라우트가 요청당 1회 계산해 내린다 — 렌더 중 `new Date()` 는 재렌더마다 값이 달라진다. */
  defaultDate?: string; defaultTime?: string;
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
 * 첫 방문날짜는 **날짜까지만** 보여준다.
 *
 * 옮겨온 고객은 `2020-02-18T12:00:00.000Z` 처럼 시각까지 들고 있다. 그 시각은 가져오기가
 * 만든 자리표시자(정오)라 아무 뜻이 없는데, 화면에 그대로 나오면 사용자는 그 손님이
 * 낮 12시에 왔다고 읽는다. 없는 사실을 보여주느니 자른다.
 */
function joinedDate(record: SalonRecord<JsonValue>) {
  const raw = text(record, "joinedAt", "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : "기록 없음";
}

/**
 * 목록 안 검색. **숫자면 번호 뒷자리, 아니면 이름.**
 *
 * 셸 헤더의 검색은 화면을 옮겨 다니는 검색이고, 이건 지금 보고 있는 목록을 좁히는 검색이다.
 * 모드 선택칸을 두지 않는 이유는 사용자가 실제로 치는 게 둘뿐이기 때문이다 — "김서연" 아니면 "5678".
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
 * 1440×900 에서 목록 스크롤 영역은 519px, 한 행은 56px(이름 위·번호 아래) — 9행 × 56 = 504,
 * 알약 여백(`py-1`) 8 을 더해 512 로 들어간다. 남는 여유는 7px 뿐이라 행 사이 gap 은 둘 수 없다.
 * 행 높이를 바꾸면 여기부터 다시 계산한다. 10행이면 568px 로 넘쳐 페이지 안에서 또 스크롤해야 하고,
 * 그러면 페이지를 나눈 의미가 없어진다.
 */
const pageSize = 9;

export function CustomersPage({ catalog = [], customers, settings, bookings, messages, ledger, lastVisits, selectedCustomerId, error, notice, query = "", sort = "name", tab = "profile", page = "1", showNew, editCustomerId, payCustomerId, showPrepaid, newCustomerName, requestKey, defaultDate = "", defaultTime = "", searchParams }: Props) {
  const filtered = customers.filter((record) => matches(record, query));
  const collator = new Intl.Collator("ko-KR");
  const sorted = [...filtered].sort((left, right) => {
    if (sort === "joined") return text(right, "joinedAt", "").localeCompare(text(left, "joinedAt", ""));
    if (sort === "visit") return (lastVisits?.get(right.id) ?? "").localeCompare(lastVisits?.get(left.id) ?? "");
    return collator.compare(text(left, "name", ""), text(right, "name", ""));
  });
  /**
   * `?customer=` 가 없으면 **목록 첫 줄**을 편다.
   *
   * 들어오자마자 오른쪽 절반이 "목록에서 고객을 선택하면…" 한 줄로 비어 있었다. 화면의 절반이
   * 아무것도 하지 않는 상태로 시작하는 셈이라, 무엇을 볼 수 있는 화면인지 클릭 한 번을 해야 알았다.
   * 기준은 **지금 보고 있는 정렬**이다 — 이름순이면 이름순 첫 줄, 등록일순이면 최근 등록 첫 줄.
   * 그래서 `customers[0]` 이 아니라 `sorted[0]` 을 쓴다(정렬·검색이 모두 반영된 목록).
   * `page` 는 아직 접기 전이라 여기서 쓸 수 없으므로 `sorted` 를 본다 — 1페이지 첫 줄과 같다.
   * URL 은 건드리지 않는다. `?customer=` 는 여전히 "사용자가 고른 고객" 만 뜻하고,
   * 자동 선택은 화면에서만 일어난다 — 검색·정렬을 바꾸면 첫 줄도 따라 바뀐다.
   */
  const selected = customers.find(({ id }) => id === selectedCustomerId) ?? sorted[0] ?? null;
  const activeTab = detailTabs.some(([, key]) => key === tab) || (messagingUiEnabled && tab === "messages") ? tab : "profile";
  const activeId = selected?.id;
  const selectedBookings = selected ? linked(bookings, selected.id) : [];
  const selectedMessages = selected ? linked(messages, selected.id, "recipientId") : [];
  const selectedLedger = selected ? ledger.filter((entry) => entry.customerId === selected.id) : [];
  // 포인트 조정은 돈이 오간 거래가 아니다. 시술·결제 이력에 두면 ₩0 짜리 결제 행으로 찍힌다. 포인트 이력에만 남긴다.
  const paymentLedger = selectedLedger.filter((entry) => entry.kind !== "point-adjust");
  const pointLedger = selectedLedger.filter((entry) => entry.pointsWon !== 0);

  // 닫기 경로는 현재 URL 에서 모달 키만 지워 만든다. 손으로 조립하면 `customer`, `sort` 처럼
  // 화이트리스트에 없는 파라미터가 조용히 사라져 "닫았더니 다른 화면" 이 된다.
  const modalKeys = ["new", "edit", "pay", "prepaid", "firstVisitPayment"] as const;
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
  // 결제는 페이지별 소형 폼이 아니라 공용 09A~09H 모달이 맡는다. 이 화면은 배경으로 남는다.
  const paying = null;
  const prepaidTarget = showPrepaid ? selected : null;
  const dialog = showNew || editing || prepaidTarget
    ? { label: paying ? "결제 등록" : prepaidTarget ? "선결제 충전" : editing ? "고객 정보 변경" : "고객 등록", wide: Boolean(paying), form: !paying && !prepaidTarget }
    : null;
  // 중복 확인은 팝업이 열렸을 때만 필요하다. 858명 × 6칸은 목록 응답에 실리지 않는다.
  const duplicateIndex: readonly DuplicateEntry[] = dialog?.form
    ? customers.map((record) => [record.id, text(record, "name", ""), text(record, "gender", ""), text(record, "phone", ""), text(record, "joinedAt", ""), text(record, "memo", "")] as const)
    : [];

  return <main className="flex h-full min-w-[1032px] flex-col px-7 pb-6 pt-5">
    {dialog && <ModalHost label={dialog.label}>
      {/* 전역 `[data-dialog-panel]` 은 `min(1120px,100%)` 다. 여기 폼들은 한 칸씩 세로로 서므로
          그 폭을 쓰면 라벨과 입력칸 사이가 한 뼘씩 벌어진다. 결제는 금액 격자가 2열이라 조금 더 넓다.
          고객 등록은 폭을 고정하지 않는다(`!w-auto`) — 중복 확인 패널이 옆으로 펴질 때
          패널이 안쪽 폭을 따라가야 두 움직임이 한 몸으로 읽힌다. 접힌 폭은 40+380 = 420px 로 같다. */}
      <section aria-label={dialog.label} aria-modal="true" className={`dialog-scroll p-5 ${dialog.wide ? "!w-[560px]" : dialog.form ? "!w-auto" : "!w-[420px]"} !max-w-full`} data-dialog-panel role="dialog">
        <div className="flex items-center justify-between gap-4">
          <h2 className={typeScale.title}>{dialog.label}</h2>
          <Link className={button("md")} data-dialog-close href={customerHref}>닫기</Link>
        </div>
        {prepaidTarget
            ? <form action={chargePrepaid} aria-label="선결제 충전" className="mt-5 grid gap-4">
              <input name="customerId" type="hidden" value={prepaidTarget.id} />
              <input name="requestKey" type="hidden" value={requestKey} />
              <input name="returnTo" type="hidden" value={customerHref} />
              <p className="rounded-[var(--radius-card)] bg-[var(--background)] px-4 py-3 text-sm">{text(prepaidTarget, "name")} · 현재 잔액 <strong className="tabular-nums">₩{number(prepaidTarget, "prepaidWon").toLocaleString("ko-KR")}</strong></p>
              <Field label="충전 금액(원)"><input className={`${input} w-full`} inputMode="numeric" name="amountWon" required /></Field>
              <Field label="받은 방법"><select className={`${input} w-full`} defaultValue="cash" name="method"><option value="cash">현금</option><option value="card">카드</option><option value="transfer">계좌이체</option></select></Field>
              <SubmitButton extra="w-full">선결제 충전</SubmitButton>
            </form>
            : <CustomerForm customer={editing ?? undefined} defaultName={showNew ? newCustomerName : undefined} duplicateIndex={duplicateIndex} returnTo={customerHref} settings={settings} today={defaultDate} />}
      </section>
    </ModalHost>}

    {error && !paying && <p className="mb-5 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">{error}</p>}
    {notice && <NoticeBanner className="mb-5 rounded-[var(--radius-card)] border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">{notice}</NoticeBanner>}

    {/* 두 칸은 같은 높이로 서고 **각자 안에서만** 스크롤한다. 페이지 전체가 늘어나면
        오른쪽 이력을 보려고 내린 스크롤이 왼쪽 목록을 화면 밖으로 밀어낸다.
        높이를 내용에 맞춰 줄이면 탭을 옮길 때마다 칸이 뛰므로 높이는 고정이다. 대신 짧은 탭이
        남기던 빈 자리는 그 탭 안에서 채운다(기본정보의 메모칸) — 아래 `min-h-full` 주석. */}
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(360px,0.85fr)_minmax(480px,1.15fr)] grid-rows-1 gap-5">
      <section aria-label="고객 목록" className="flex min-h-0 flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <h2 className={typeScale.section}>고객 목록</h2>
              <span className="text-xs text-[var(--muted)]">{sorted.length.toLocaleString("ko-KR")}명 중 <span className="tabular-nums">{sorted.length ? pageStart + 1 : 0}–{pageStart + visible.length}</span></span>
            </div>
            {/* 등록 버튼은 목록 카드 머리줄에 산다. 화면을 말로 설명하던 툴바 줄이 사라져도
                주 동작은 자기가 만드는 목록 바로 위에 남는다.
                크기는 `sm`(32px). `md`(40px) 는 아래 검색줄 입력칸(`control`, h-10)과 키를 맞추려고
                있는 값인데, 이 버튼은 그 줄에 없고 13px 제목 옆에 선다 — 40px 이면 제목보다 버튼이
                무거워 머리줄이 버튼 줄처럼 읽혔다. 검색·해제는 입력칸과 같은 줄이므로 `md` 그대로다. */}
            <Link className={button("sm", "primary")} href={href({ new: "1" })}>고객 등록</Link>
          </div>
          {/* 검색은 GET 폼이라 JS 없이도 동작한다. 검색어가 바뀌면 페이지는 1로 돌아간다. */}
          <form action="/customers" className="mt-3 flex gap-2" method="get">
            {selectedCustomerId && <input name="customer" type="hidden" value={selectedCustomerId} />}
            {sort !== "name" && <input name="sort" type="hidden" value={sort} />}
            <input aria-label="이름 또는 휴대전화 뒷자리" className={`${input} flex-1`} defaultValue={query} name="query" placeholder="이름 또는 휴대전화 뒷자리" />
            <button className={button("md", "secondary")} type="submit">검색</button>
            {query && <Link className={button("md", "quiet")} href={href({ query: undefined, page: undefined })}>해제</Link>}
          </form>
          {/* 머리 블록은 세 줄이다 — 정체성(제목·건수+등록) / 찾기(검색) / 정렬. 한 줄로 합칠 수는 없다:
              이 칸의 안쪽 폭은 1440 에서 448px, 앱 최소폭 1152 에서 338px 인데 세 덩어리를 한 줄에
              세우면 450px 이 든다. 대신 **무게**를 가른다. 정렬은 매일 쓰는 검색과 달리 가끔 쓴다.
              비활성 칩이 `secondary`(흰 배경 + 테두리)였을 때 머리에 테두리 상자가 셋 더 서서
              세 줄이 같은 세기로 읽혔다. `quiet` 는 테두리를 뺀다 — 켜진 하나만 상자로 남는다. */}
          <nav aria-label="고객 목록 정렬" className="mt-3 flex justify-end gap-2">
            {sortModes.map(([key, name]) => <Link className={button("xs", sort === key ? "primary" : "quiet")} href={href({ sort: key === "name" ? undefined : key, page: undefined })} key={key}>{name}</Link>)}
          </nav>
        </div>
        {/* 구분선은 `<ul>` 의 좌우 여백 안에서만 그어진다. 예전에는 카드 테두리에 딱 붙어
            선이 벽에서 벽까지 갔고, hover·선택 배경도 함께 붙어 행이 카드 안에 있는 게 아니라
            카드를 덧칠한 것처럼 보였다. 박스를 하나 더 두는 대신(여백 두 배, 테두리 3겹)
            좌우를 8px 씩 띄운다 — `divide-y` 는 `<li>` 에 걸리므로 선도 같이 8px 씩 물러난다.
            알약 어법은 사이드바 메뉴가 이미 쓴다(`app-shell.tsx:78`).
            `px-2` 는 `<ul>` 이 든다. `<li>` 에 두면 스크롤바가 알약 위로 겹친다.
            `box-sizing: border-box`(globals.css) 라 1px 선은 `h-[56px]` **안**에 들어간다 —
            9행은 여전히 504px 다. */}
        <ul className="dialog-scroll min-h-0 flex-1 divide-y divide-[var(--border)] overflow-auto px-2 py-1" data-customer-list>
          {/* 이름 위·번호 아래로 쌓는다. 좌우로 갈라 두면 목록이 좁아질수록 둘 사이가 벌어져
              어느 번호가 어느 이름인지 눈이 한 번 더 움직였다. 오른쪽 상세도 같은 순서다.
              **56px 는 계산값이다**: 13px 본문(20) + 11px 부제(16) + gap 2 + 상하 9씩 = 56.
              9행 × 56 = 504, 위아래 `py-1` 8 = 512 ≤ 519px(실측 스크롤 영역)이라 `pageSize` 는 그대로 9다.
              행 사이 gap 은 두지 않는다 — 2px 씩만 줘도 8칸 16px 이 붙어 520 으로 넘친다.
              쉬고 있을 때는 붙어 있고, 손이 닿은 행만 알약으로 떠오른다.
              높이는 `<li>` 가 든다 — `<Link>` 로 옮기면 `button.test.ts` 가 손으로 만든 버튼으로 잡는다.
              선택은 hover 와 **다른 언어**를 쓴다. 예전에는 둘 다 `--background` 라 화면상 구분되지
              않았다. 색만으로 가르지 않으려고 좌측 바(사이드바 활성 항목과 같은 어법)와 굵기를 함께 준다.
              `aria-current` 는 `"page"` 가 아니라 `"true"` — 상세 탭 nav 가 이미 `"page"` 를 쓴다. */}
          {visible.map((record) => <li className="h-[56px]" data-customer-row={record.id} key={record.id}>
            <Link aria-current={record.id === activeId ? "true" : undefined} className={`relative flex h-full flex-col justify-center gap-0.5 rounded-[var(--radius-control)] pl-4 pr-3 ${focusRing} ${record.id === activeId ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--background)]"}`} href={href({ customer: record.id })}>
              {record.id === activeId && <span aria-hidden="true" className="absolute inset-y-2 left-1.5 w-[2px] rounded-[1px] bg-[var(--brand)]" />}
              <strong className={`truncate ${record.id === activeId ? "text-[var(--brand)]" : ""}`}>{text(record, "name")}</strong>
              <span className={`truncate tabular-nums ${typeScale.meta} text-[var(--muted)]`}>{formatPhone(text(record, "phone", "")) || "휴대전화 없음"}</span>
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
        {/* `min-h-full` 로 칸 높이를 물려받아 본문 구역이 남은 높이를 가진다. 넘치면 `aside` 가 스크롤한다. */}
        {selected ? <div className="flex min-h-full flex-col">
          {/* 이름과 세 동작이 한 줄이다. 동작이 흐름에서 빠져 아래 탭 줄이 그만큼 위로 올라온다.
              `고객 정보 변경` 만 접힘 안에 숨어 있던 탓에 "고쳐야 하는데 어디서?" 가 반복됐다. */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--muted)]">선택 고객 · {customerCode(selected.id)}</p>
              <h2 className={`mt-1 ${typeScale.title}`}>{text(selected, "name")}</h2>
              <p className="mt-1 text-sm tabular-nums text-[var(--muted)]">{formatPhone(text(selected, "phone", "")) || "휴대전화 없음"}</p>
            </div>
            {/* 세 동작은 `sm`(32px) 이다. 바로 아래 탭 줄이 이미 `sm` 이라 `md`(40px) 일 때는
                이 칸에서 가장 큰 것이 제목(21px)이 아니라 버튼 셋이었다. 옆에 입력칸이 없으므로
                `md` 가 지키던 h-10 정렬도 여기서는 지킬 게 없다. */}
            <div className="flex shrink-0 gap-2">
              <Link className={button("sm", "primary")} data-selected-customer-payment={selected.id} href={href({ pay: "1", customer: selected.id })}>결제 등록</Link>
              <Link className={button("sm")} href={href({ prepaid: "1" })}>선결제 충전</Link>
              <Link className={button("sm")} href={href({ edit: selected.id })}>고객 정보 변경</Link>
            </div>
          </div>
          <p className="mt-4 border-y border-[var(--border)] py-3 text-sm">포인트 <span className="tabular-nums">{number(selected, "points").toLocaleString("ko-KR")}P</span> · 선결제 잔액 <span className="tabular-nums">₩{number(selected, "prepaidWon").toLocaleString("ko-KR")}</span></p>

          {/* 다섯 구역을 전부 펼쳐 두면 상세 칸이 목록보다 세 배 길어져 두 칸 높이가 어긋난다.
              탭은 그대로 두되 **누른 것만** 그린다. 링크라 뒤로가기도 그대로 동작한다. */}
          <nav aria-label="고객 상세 구역" className="mt-4 flex flex-wrap gap-2">
            {detailTabs.map(([name, key]) => <Link aria-current={activeTab === key ? "page" : undefined} className={button("sm", activeTab === key ? "primary" : "quiet")} href={href({ tab: key })} key={key}>{name}</Link>)}
            {messagingUiEnabled && <Link aria-current={activeTab === "messages" ? "page" : undefined} className={button("sm", activeTab === "messages" ? "primary" : "quiet")} href={href({ tab: "messages" })}>문자</Link>}
          </nav>

          <section className="mt-5 flex min-h-0 flex-1 flex-col">
            {/* 기본정보는 4행뿐이라 720px 칸에서 아래 385px 가 빈다(1440×900 실측). 메모를 남은
                높이로 펴 그 자리를 채운다 — 미용실이 가장 자주 읽고 고치는 칸이고, 이미 있는
                데이터다. 빈 자리에 장식을 넣는 게 아니라 원래 짧게 잘려 있던 칸을 제 크기로 되돌린다.
                `h-full`(백분율)은 flex 아이템 안에서 195px 로 접혔다 — 위 `flex-col` + 여기 `flex-1` 로 받는다. */}
            {activeTab === "profile" && <div className="flex min-h-0 flex-1 flex-col">
              <h3 className="font-bold">기본 정보</h3>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm"><dt className="text-[var(--muted)]">성별</dt><dd>{{ female: "여성", male: "남성" }[text(selected, "gender", "")] ?? "미지정"}</dd><dt className="text-[var(--muted)]">첫 방문날짜</dt><dd className="tabular-nums">{joinedDate(selected)}</dd>{messagingUiEnabled && <><dt className="text-[var(--muted)]">문자 수신</dt><dd>{value(selected).smsOptIn === false ? "거부" : "동의"}</dd></>}</dl>
              <h3 className="mt-5 font-bold">메모</h3>
              {/* 긴 메모는 이 칸이 아니라 `aside` 가 스크롤한다(60행 주입 실측: 상세 720px 고정, 목록 안 밀림).
                  스크롤 상자를 두 겹으로 두면 어느 쪽이 움직일지 사용자가 알 수 없다. */}
              <p className="mt-2 min-h-0 flex-1 whitespace-pre-wrap rounded-[var(--radius-card)] bg-[var(--background)] p-4 text-sm">{text(selected, "memo", "").trim() || <span className="text-[var(--muted)]">메모가 없습니다. 고객 정보 변경에서 남길 수 있습니다.</span>}</p>
            </div>}
            {activeTab === "bookings" && <><h3 className="font-bold">예약 이력</h3>{listItems(selectedBookings, "예약 이력이 없습니다.", (record) => { const at = seoulClockOrEmpty(text(record, "startsAt")); return <>{at.date} {at.time} · {text(record, "service")} · {text(record, "status")}</>; })}</>}
            {activeTab === "ledger" && <><h3 className="font-bold">시술·결제 이력</h3>{paymentLedger.length ? <ul className="mt-2 divide-y divide-[var(--border)]">{paymentLedger.map((entry) => <li className="py-2 text-sm tabular-nums" key={entry.id}>{entry.occurredAt.slice(0, 10)} · {typeof entry.details.serviceMajor === "string" ? entry.details.serviceMajor : "결제"} · ₩{entry.amountWon.toLocaleString("ko-KR")}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--muted)]">시술·결제 이력이 없습니다.</p>}</>}
            {activeTab === "points" && <><h3 className="font-bold">포인트 이력</h3>{pointLedger.length ? <ul className="mt-2">{pointLedger.map((entry) => <li className="text-sm tabular-nums" key={entry.id}>{entry.occurredAt.slice(0, 10)} · {entry.pointsWon.toLocaleString("ko-KR")}P{typeof entry.details.reason === "string" && entry.details.reason ? <span className="ml-2 text-xs text-[var(--muted)]">{entry.details.reason}</span> : null}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--muted)]">포인트 변동 이력이 없습니다.</p>}
              {/* 되돌릴 수 없는 조정이라 사유가 필수다. 사유칸이 곧 확인 절차 — 별도 confirm 다이얼로그를 두지 않는다. */}
              <form action={adjustCustomerPoints} className="mt-4 grid grid-cols-[120px_1fr_auto] items-end gap-2 border-t border-[var(--border)] pt-4"><input name="customerId" type="hidden" value={selected.id} /><Field label="조정 포인트"><input className={input} name="pointsWon" placeholder="-500" required step="1" type="number" /></Field><Field label="조정 사유 (필수)"><input className={input} maxLength={150} name="reason" required /></Field><SubmitButton size="md" tone="secondary">포인트 조정</SubmitButton></form></>}
            {messagingUiEnabled && activeTab === "messages" && <><h3 className="font-bold">문자 발송 이력</h3>{listItems(selectedMessages, "문자 발송 이력이 없습니다.", (record) => <>{text(record, "channel")} · {text(record, "status")}</>)}<Link className={button("sm", "quiet", "mt-3")} href={`/messages?customer=${selected.id}`}>문자 발송으로 이동</Link></>}
          </section>
        </div> : <p className="p-8 text-center text-sm text-[var(--muted)]">{query ? "검색과 일치하는 고객이 없습니다." : "등록된 고객이 없습니다. 고객 등록으로 첫 고객을 추가하세요."}</p>}
      </aside>
    </div>
  </main>;
}
