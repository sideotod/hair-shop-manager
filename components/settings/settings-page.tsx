import Link from "next/link";

import { logoutOwner } from "../../app/auth-actions";
import {
  changeOwnerPassword,
  saveNotice,
  saveShopSettings,
} from "../../app/settings-actions";
import type {
  AuditEvent,
  JsonObject,
  JsonValue,
  SalonRecord,
} from "../../lib/salon-domain";
import { naverMailMetadata } from "../../lib/naver-mail";
import { messagingUiEnabled } from "../../lib/feature-flags";
import { resolveSettingsSection, settingsSections } from "../../lib/navigation";
import { settingsErrorMessage } from "../../lib/settings";
import { control, rowLink } from "../button";
import { SubmitButton } from "../submit-button";
import { card, surface } from "../surface";
import { typeScale } from "../type";
import { NaverMailReplacementGuide } from "../bookings/naver-mail-connection";
import { Services } from "./catalog-sections";
import { SettingsSectionTabs } from "./settings-section-tabs";

// 구역 목록은 사이드바가 그린다 (`components/app-shell.tsx:80`). 화면 안에 같은 목록을 또 두면
// 어느 쪽이 진짜인지 알 수 없다 — 예전에는 그래서 사이드바 쪽을 접었고, 이번에는 레일을 없앴다.
const field = `${control} w-full`;

type Props = {
  settings: JsonObject;
  notices: readonly SalonRecord<JsonValue>[];
  auditEvents: readonly AuditEvent[];
  section?: string;
  error?: string;
  notice?: string;
  /** 시술 가격 구역이 읽는 `catalog-items`. 다른 구역은 쓰지 않으므로 없으면 빈 목록이다. */
  catalog?: readonly SalonRecord<JsonValue>[];
  editCatalogId?: string;
  /**
   * 숨은 폼 id 의 씨앗. **서버 컴포넌트에서 요청당 1회** 만들어 내려보낸다.
   * 렌더 중 `randomUUID()` 를 부르면 같은 요청의 재렌더마다 마크업이 달라져 캐시가 무의미해진다.
   */
  requestKey?: string;
};

function string(settings: JsonObject, key: string, fallback = "") {
  return typeof settings[key] === "string" ? settings[key] : fallback;
}
function number(settings: JsonObject, key: string, fallback = 0) {
  return typeof settings[key] === "number" ? settings[key] : fallback;
}
function bool(settings: JsonObject, key: string, fallback = false) {
  return typeof settings[key] === "boolean" ? settings[key] : fallback;
}
function object(record: SalonRecord<JsonValue>) {
  return typeof record.value === "object" &&
    record.value !== null &&
    !Array.isArray(record.value)
    ? (record.value as JsonObject)
    : {};
}
function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[var(--muted)]">
      <span>{label}</span>
      {children}
    </label>
  );
}
function ReturnTo({ section }: { section: string }) {
  return (
    <>
      <input
        name="returnTo"
        type="hidden"
        value={`/settings?section=${section}`}
      />
      <input name="section" type="hidden" value={section} />
    </>
  );
}
function SaveButton({ children = "저장" }: { children?: React.ReactNode }) {
  return <SubmitButton>{children}</SubmitButton>;
}

/**
 * 계정 설정은 표면 하나다. 카드 두 장이 세로로 떠 있으면 서로 남남처럼 보이는데,
 * 실제로는 같은 계정의 정보와 자물쇠다.
 *
 * 다만 **폼은 계속 둘이다.** 액션이 다르고(`saveShopSettings` / `changeOwnerPassword`),
 * 하나로 합치면 매장명을 고칠 때마다 비밀번호 세 칸이 같이 전송된다. 합친 것은 표면뿐이다.
 *
 * 설정은 넓은 데스크톱 작업영역을 쓴다. 상단 탭이 위치를 말하고, 본문은 한 번에 여러 항목을 편집한다.
 */
function AccountRow({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(200px,240px)_minmax(0,1fr)] items-start gap-8 p-5">
      <div>
        <h3 className={typeScale.section}>{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
          {description}
        </p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Owner({ settings }: { settings: JsonObject }) {
  return (
    <section
      aria-labelledby="account-title"
      className={`${surface} divide-y divide-[var(--border)]`}
    >
      <div className="px-5 pb-4 pt-5">
        <h2 className={typeScale.section} id="account-title">
          계정 설정
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          매장 정보와 로그인 자물쇠를 한자리에서 관리합니다. 저장은 각 줄에서
          따로 이뤄집니다.
        </p>
      </div>
      <form action={saveShopSettings} aria-label="매장과 사용자 정보">
        <ReturnTo section="owner" />
        <AccountRow
          description="표시 이름을 바꿔도 감사 이력의 처리자는 항상 정확히 사용자으로 기록됩니다."
          title="매장 · 사용자 정보"
        >
          <div className="grid grid-cols-3 gap-4">
            <Field label="매장명">
              <input
                className={field}
                defaultValue={string(settings, "shopName", "헤어해요")}
                name="shopName"
                required
              />
            </Field>
            <Field label="매장 전화번호">
              <input
                className={field}
                defaultValue={string(settings, "shopPhone")}
                name="shopPhone"
                type="tel"
              />
            </Field>
            <Field label="사용자 표시 이름">
              <input
                className={field}
                defaultValue={string(settings, "ownerName", "서원")}
                name="ownerName"
                required
              />
            </Field>
          </div>
          <div className="mt-5">
            <SaveButton />
          </div>
        </AccountRow>
      </form>
      <form action={changeOwnerPassword} aria-label="사용자 비밀번호 변경">
        <ReturnTo section="owner" />
        <AccountRow
          description="평문 비밀번호는 저장하거나 감사 이력에 기록하지 않습니다."
          title="비밀번호 변경"
        >
          <div className="grid grid-cols-3 gap-4">
            <Field label="현재 비밀번호">
              <input
                autoComplete="current-password"
                className={field}
                name="currentPassword"
                required
                type="password"
              />
            </Field>
            <Field label="새 비밀번호">
              <input
                aria-describedby="password-rule"
                autoComplete="new-password"
                className={field}
                name="newPassword"
                required
                type="password"
              />
            </Field>
            <Field label="새 비밀번호 확인">
              <input
                aria-describedby="password-rule"
                autoComplete="new-password"
                className={field}
                name="confirmPassword"
                required
                type="password"
              />
            </Field>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]" id="password-rule">
            길이 제한은 없습니다. 저장은 scrypt 해시로만 이뤄집니다.
          </p>
          <div className="mt-5">
            <SaveButton>비밀번호 변경</SaveButton>
          </div>
        </AccountRow>
      </form>
      {/* 사이드바 매장 카드에서 옮겨왔다. 계정을 여닫는 일이라 계정 설정이 제자리다.
        저장 버튼과 같은 `primary` 를 주면 위 두 줄의 저장과 섞인다 — 저장이 아니라 나가는 동작이다.
        `<form>` 을 유지한다. 링크로 바꾸면 GET 으로 세션이 끊겨 브라우저 선반입에도 로그아웃된다. */}
      <form action={logoutOwner}>
        <AccountRow
          description="이 컴퓨터의 세션만 끝냅니다. 저장한 설정과 기록은 그대로 남습니다."
          title="로그아웃"
        >
          <SubmitButton size="md" tone="secondary">
            로그아웃
          </SubmitButton>
        </AccountRow>
      </form>
    </section>
  );
}

function Customer({ settings }: { settings: JsonObject }) {
  const hidden = new Set(
    Array.isArray(settings.hiddenMenus)
      ? settings.hiddenMenus.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  );
  const menuOptions = [
    ["/customers", "고객"],
    ["/bookings", "예약"],
    ["/sales", "매출·결제"],
    ...(messagingUiEnabled ? [["/messages", "문자"]] : []),
  ];
  return (
    <form
      action={saveShopSettings}
      aria-label="고객 정책 설정"
      className={card}
    >
      <ReturnTo section="customer" />
      <h2 className={typeScale.section}>고객 정책</h2>
      <div className="mt-5 grid grid-cols-3 gap-4">
        <Field label="기본 성별">
          <select
            className={field}
            defaultValue={string(settings, "defaultGender", "unspecified")}
            name="defaultGender"
          >
            <option value="unspecified">미지정</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </Field>
        <Field label="포인트 적립률(%)">
          <input
            className={field}
            defaultValue={number(settings, "pointEarnRate", 1)}
            max="100"
            min="0"
            name="pointEarnRate"
            step="0.01"
            type="number"
          />
        </Field>
        <Field label="파워 고객 포인트 기준">
          <input
            className={field}
            defaultValue={number(settings, "powerCustomerMinPoints", 10000)}
            min="0"
            name="powerCustomerMinPoints"
            type="number"
          />
        </Field>
        <Field label="고객 상세 이동">
          <select
            className={field}
            defaultValue={string(settings, "customerOpenMode", "same-window")}
            name="customerOpenMode"
          >
            <option value="same-window">현재 창</option>
            <option value="new-window">새 창</option>
          </select>
        </Field>
        <Field label="고객 표시 방식">
          <select
            className={field}
            defaultValue={string(
              settings,
              "customerDisplayMode",
              "comfortable",
            )}
            name="customerDisplayMode"
          >
            <option value="comfortable">여유롭게</option>
            <option value="compact">조밀하게</option>
          </select>
        </Field>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        적립률은 결제 등록 화면의 포인트 적립 칸을 미리 채웁니다. 사용자가 그
        자리에서 고칠 수 있습니다.
      </p>
      {messagingUiEnabled && (
        <fieldset className="mt-5">
          <legend className="text-sm font-bold">기본 동의와 기능</legend>
          <div className="mt-3 flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2">
              <input
                defaultChecked={bool(settings, "smsEnabled", true)}
                name="smsEnabled"
                type="checkbox"
              />
              SMS 기능 사용
            </label>
            <label className="flex items-center gap-2">
              <input
                defaultChecked={bool(settings, "defaultSmsOptIn", true)}
                name="defaultSmsOptIn"
                type="checkbox"
              />
              신규 고객 SMS 기본 동의
            </label>
          </div>
        </fieldset>
      )}
      <fieldset className="mt-5">
        <legend className="text-sm font-bold">사이드 메뉴 숨김</legend>
        <p className="mt-1 text-xs text-[var(--muted)]">
          메뉴만 숨기며 서버의 사용자 전용 경로 보호는 그대로 유지됩니다.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          {menuOptions.map(([href, label]) => (
            <label className="flex items-center gap-2" key={href}>
              <input
                defaultChecked={hidden.has(href)}
                name="hiddenMenus"
                type="checkbox"
                value={href}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-6">
        <SaveButton />
      </div>
    </form>
  );
}

function Payment({ settings }: { settings: JsonObject }) {
  return (
    <form
      action={saveShopSettings}
      aria-label="결제 정책 설정"
      className={card}
    >
      <ReturnTo section="payment" />
      <h2 className={typeScale.section}>결제 정책</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        서버 거래 원장의 VAT 방식과 카드 수수료 기본값입니다.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <Field label="VAT 처리">
          <select
            className={field}
            defaultValue={string(settings, "vatMode", "included")}
            name="vatMode"
          >
            <option value="included">포함</option>
            <option value="separate">별도</option>
          </select>
        </Field>
        <Field label="카드 수수료(%)">
          <input
            className={field}
            defaultValue={number(settings, "cardFeeRate", 3)}
            max="100"
            min="0"
            name="cardFeeRate"
            step="0.01"
            type="number"
          />
        </Field>
      </div>
      <div className="mt-5 rounded-[var(--radius-card)] bg-[var(--background)] p-4 text-sm">
        <strong>선불 결제 대체 흐름</strong>
        <p className="mt-1 text-[var(--muted)]">
          별도 잔액 관리자를 만들지 않습니다. 선불 결제와 정정은 불변 결제
          원장에서 처리합니다.
        </p>
        <Link className={`${rowLink} mt-3 -ml-2 text-sm`} href="/sales">
          매출·결제로 이동
        </Link>
      </div>
      <div className="mt-6">
        <SaveButton />
      </div>
    </form>
  );
}

function Booking({ settings }: { settings: JsonObject }) {
  // 전일·당일 알림은 예약 화면 폼이 유일한 writer 였다. 그 폼을 지우면서 여기로 옮겼다 (설계 §5.3) —
  // `lib/settings.ts` 의 `section === "booking"` 분기가 세 체크박스를 같은 방식으로 읽는다.
  return (
    <form
      action={saveShopSettings}
      aria-label="예약 정책 설정"
      className={card}
    >
      <ReturnTo section="booking" />
      <h2 className={typeScale.section}>예약</h2>
      <div className="mt-5 grid grid-cols-4 gap-4">
        <Field label="영업 시작">
          <input
            className={field}
            defaultValue={string(settings, "bookingOpen", "09:30")}
            name="bookingOpen"
            type="time"
          />
        </Field>
        <Field label="영업 종료">
          <input
            className={field}
            defaultValue={string(settings, "bookingClose", "21:00")}
            name="bookingClose"
            type="time"
          />
        </Field>
        <Field label="예약 단위(분)">
          <select
            className={field}
            defaultValue={String(number(settings, "bookingSlotMinutes", 30))}
            name="bookingSlotMinutes"
          >
            <option value="10">10분</option>
            <option value="15">15분</option>
            <option value="20">20분</option>
            <option value="30">30분</option>
            <option value="60">60분</option>
          </select>
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            defaultChecked={bool(settings, "bookingAllowOverlap")}
            name="bookingAllowOverlap"
            type="checkbox"
          />
          예약 중복 허용
        </label>
        <Field label="예약 방문일 추가 문구">
          <input
            className={field}
            defaultValue={string(settings, "reminderText")}
            maxLength={150}
            name="reminderText"
          />
        </Field>
      </div>
      <fieldset className="mt-5">
        <legend className="text-sm font-bold">예약 알림</legend>
        <div className="mt-3 flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input
              defaultChecked={bool(settings, "reminderDayBefore")}
              name="reminderDayBefore"
              type="checkbox"
            />
            예약 전일 알림
          </label>
          <label className="flex items-center gap-2">
            <input
              defaultChecked={bool(settings, "reminderDayOf")}
              name="reminderDayOf"
              type="checkbox"
            />
            예약 당일 알림
          </label>
        </div>
      </fieldset>
      <div className="mt-6">
        <SaveButton />
      </div>
    </form>
  );
}

// `문자 자동화` 구역은 지웠다. 저장하는 값이 하나도 없고 `/messages#automation` 로 보내기만 했다 —
// 사이드바에 문자 메뉴가 이미 있으므로 설정 안의 같은 링크는 한 번 더 도는 길이었을 뿐이다.
// 문자 기능 자체는 그대로다 (`components/messages/messages-page.tsx`).

function Integrations({ settings }: { settings: JsonObject }) {
  const metadata = naverMailMetadata(settings);
  return (
    <section className={card} aria-labelledby="integration-title">
      <h2 className={typeScale.section} id="integration-title">
        외부 연동
      </h2>
      <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] p-5">
        <div className="flex items-center justify-between">
          <strong>네이버 예약 메일</strong>
          <span className="inline-flex h-[26px] items-center rounded-full bg-[var(--background)] px-3 text-[11px] font-medium">
            상태: {metadata.connected ? "연결됨" : "연결 안 됨"}
          </span>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {metadata.connected
            ? `${metadata.email} · 마지막 UID ${metadata.lastSyncUid || "초기 동기화 전"} · ${metadata.lastSyncAt || "초기 동기화 전"}`
            : "네이버 예약 메일을 Windows Credential Manager로 안전하게 연결합니다."}
        </p>
        <Link className={`${rowLink} mt-4 -ml-2 text-sm`} href="/bookings">
          예약 메일 연결 및 동기화
        </Link>
      </div>
      <NaverMailReplacementGuide />
    </section>
  );
}

function Help({
  settings,
  notices,
  auditEvents,
}: Pick<Props, "settings" | "notices" | "auditEvents">) {
  return (
    <div className="space-y-5">
      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className={typeScale.section}>도움말 · FAQ</h2>
          <a className={`${rowLink} -mr-2 text-sm`} href="#terms">
            서비스 이용약관
          </a>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <article className="rounded-[var(--radius-card)] bg-[var(--background)] p-4">
            <h3 className="font-bold">결제 정정은 어디서 하나요?</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              매출·결제의 거래 기록에서 정정 또는 환불을 선택합니다.
            </p>
          </article>
          {messagingUiEnabled && (
            <article className="rounded-[var(--radius-card)] bg-[var(--background)] p-4">
              <h3 className="font-bold">문자가 실제 발송되나요?</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                아니요. 현재 문자 흐름은 저장 전용 dry-run이며 실제 전달을
                표시하지 않습니다.
              </p>
            </article>
          )}
          <article className="rounded-[var(--radius-card)] bg-[var(--background)] p-4">
            <h3 className="font-bold">숨긴 메뉴의 경로도 열리나요?</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              사용자 세션이 있으면 직접 접근할 수 있습니다. 메뉴 숨김은 권한
              해제가 아닙니다.
            </p>
          </article>
          <article className="rounded-[var(--radius-card)] bg-[var(--background)] p-4">
            <h3 className="font-bold">이용 안내</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              고객·예약·결제 데이터는 사용자 계정으로 처리되며 변경 이력은 감사
              로그에 남습니다.
            </p>
          </article>
        </div>
      </section>
      <section className={card} id="terms">
        <h2 className={typeScale.section}>서비스 이용약관</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
          <li>
            본 서비스는 사용자 1인 계정 운영을 전제로 하며 계정과 비밀번호
            관리는 사용자 책임입니다.
          </li>
          <li>
            고객·예약·재무 데이터는 매장 운영 목적으로만 입력하고 필요한 동의와
            정확성을 사용자가 확인합니다.
          </li>
          <li>
            결제 기록은 서버의 불변 거래 원장에 보관하며 정정·환불은 원본 삭제
            대신 감사 가능한 보정 기록으로 남깁니다.
          </li>
          {messagingUiEnabled && (
            <li>
              SMS는 공급자 연결 전까지 dry-run 저장만 제공하며 실제 전달
              성공이나 배송 이력을 보장하지 않습니다.
            </li>
          )}
          <li>
            네이버 예약 연결과 동기화는 별도 자격 증명 및 연동 검증 후 사용할 수
            있습니다.
          </li>
        </ul>
      </section>
      <form
        action={saveShopSettings}
        aria-label="지원 연락처 설정"
        className={card}
      >
        <ReturnTo section="help" />
        <h2 className={typeScale.section}>지원 연락처</h2>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Field label="지원 전화">
            <input
              className={field}
              defaultValue={string(settings, "helpPhone")}
              name="helpPhone"
              type="tel"
            />
          </Field>
          <Field label="지원 이메일">
            <input
              className={field}
              defaultValue={string(settings, "helpEmail")}
              name="helpEmail"
              type="email"
            />
          </Field>
        </div>
        <div className="mt-5">
          <SaveButton />
        </div>
      </form>
      <section className={card} id="notices">
        <h2 className={typeScale.section}>공지사항</h2>
        {notices.length ? (
          <ul className="mt-4 space-y-3">
            {notices.map((record) => {
              const value = object(record);
              return (
                <li
                  className="rounded-[var(--radius-card)] border border-[var(--border)] p-4"
                  id={record.id}
                  key={record.id}
                >
                  <strong>{String(value.title ?? record.id)}</strong>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {String(value.body ?? "")}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">
            공지사항이 없습니다.
          </p>
        )}
        <form
          action={saveNotice}
          aria-label="공지사항 등록"
          className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3"
        >
          <ReturnTo section="help" />
          <Field label="공지 제목">
            <input className={field} maxLength={80} name="title" required />
          </Field>
          <Field label="공지 내용">
            <input className={field} maxLength={500} name="body" required />
          </Field>
          <div className="self-end">
            <SaveButton>공지 등록</SaveButton>
          </div>
        </form>
      </section>
      <section className={card}>
        <h2 className={typeScale.section}>설정 변경 이력</h2>
        {auditEvents.length ? (
          <ol className="mt-4 divide-y divide-[var(--border)]">
            {auditEvents
              .slice(-10)
              .reverse()
              .map((event) => (
                <li
                  className="grid grid-cols-[180px_1fr_140px] gap-3 py-3 text-sm"
                  key={event.id}
                >
                  <strong>{event.actor}</strong>
                  <span>{event.action}</span>
                  <time
                    className="text-[var(--muted)]"
                    dateTime={event.occurredAt}
                  >
                    {new Date(event.occurredAt).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </time>
                </li>
              ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">
            변경 이력이 없습니다.
          </p>
        )}
      </section>
    </div>
  );
}

export function SettingsPage({
  settings,
  notices,
  auditEvents,
  section,
  error,
  notice,
  catalog = [],
  editCatalogId,
  requestKey = "settings",
}: Props) {
  const active = resolveSettingsSection(section);
  // 구역 이름은 각 구역이 자기 카드 머리에 이미 적는다. 화면 위에 한 번 더 적으면 같은 글자가
  // 세로로 두 번 나온다(실측). 여기가 어디인지는 헤더 제목과 사이드바 활성 표시가 말한다.
  // 좌측 레일(240px + 여백 20px)이 사이드바로 갔다. 그 자리를 그냥 카드 폭에 얹으면 입력 한 칸이
  // 440px 가 된다(1440 실측) — 전화번호 한 줄에 쓸 폭이 아니다. 본문은 1180px 에서 멈추고
  // 남는 폭은 여백으로 둔다. 표가 넓은 구역(시술 가격)은 그 안에서 알아서 채운다.
  return (
    <main className="min-w-[1032px] px-7 pb-6 pt-5">
      <div className="mx-auto w-full max-w-[1180px]">
        <SettingsSectionTabs active={active} />
        <div data-settings-detail className="w-full max-w-[1180px]">
          {/* `role="alert"` 만 남긴다. `aria-live` 를 같이 붙이면 같은 문장을 두 번 읽는다. */}
          {error && (
            <p
              className="mb-5 rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"
              role="alert"
            >
              입력 내용을 수정하세요: {settingsErrorMessage(new Error(error))}
            </p>
          )}
          {notice && (
            <p
              className="mb-5 rounded-[var(--radius-card)] border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]"
              role="status"
            >
              {notice}
            </p>
          )}
          {active === "owner" ? (
            <Owner settings={settings} />
          ) : active === "customer" ? (
            <Customer settings={settings} />
          ) : active === "payment" ? (
            <Payment settings={settings} />
          ) : active === "booking" ? (
            <Booking settings={settings} />
          ) : active === "services" ? (
            <Services
              catalog={catalog}
              editCatalogId={editCatalogId}
              requestKey={requestKey}
            />
          ) : active === "integrations" ? (
            <Integrations settings={settings} />
          ) : (
            <Help
              auditEvents={auditEvents}
              notices={notices}
              settings={settings}
            />
          )}
        </div>
      </div>
    </main>
  );
}
