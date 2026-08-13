import {
  connectNaverMail,
  disconnectNaverMail,
  importInitialNaverBookings,
  syncNewNaverBookings,
} from "../../app/naver-mail-actions";
import { button, control, rowLink } from "../button";
import { naverMailMetadata } from "../../lib/naver-mail";
import type { JsonObject, JsonValue, SalonRecord } from "../../lib/salon-domain";
import { SubmitButton } from "../submit-button";

const input = control;

function value(record: SalonRecord<JsonValue>): JsonObject {
  return record.value && typeof record.value === "object" && !Array.isArray(record.value) ? record.value as JsonObject : {};
}

function text(record: SalonRecord<JsonValue>, key: string) {
  const field = value(record)[key];
  return typeof field === "string" ? field : "";
}

const naverLinks = [
  ["스마트플레이스 회원 가입·설정 참고 자료", "https://smartplace.naver.com/"],
  ["네이버 고객센터", "https://help.naver.com/"],
  ["네이버 Pay 고객센터", "https://help.pay.naver.com/"],
  ["네이버 예약 공식 페이지", "https://booking.naver.com/"],
] as const;

export function NaverMailReplacementGuide() {
  return <section aria-labelledby="naver-mail-replacement-title" className="mt-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4">
    <h4 className="text-sm font-bold" id="naver-mail-replacement-title">네이버 예약 메일 대체 안내</h4>
    <p className="mt-2 text-sm text-[var(--muted)]">스마트플레이스 회원 가입과 예약 알림 메일 수신을 먼저 설정하세요. 기존 네이버 예약 코드 입력은 네이버 메일 주소와 애플리케이션 비밀번호로 대체합니다.</p>
    <p className="mt-2 text-sm text-[var(--muted)]">네이버 메일 주소 = 네이버 계정, 매장 = Hairhaeyo 단일 매장, 담당자 = 사용자 1인으로 매핑합니다. 예약 ID·고객 연락처·메모는 신뢰된 예약 메일에서 로컬 예약으로 저장합니다.</p>
    <details className="mt-3 rounded-[var(--radius-card)] bg-[var(--background)] p-3 text-sm"><summary className="cursor-pointer font-bold">예약 연동 FAQ</summary><p className="mt-2 text-[var(--muted)]">Hairhaeyo는 네이버 예약 직접 API·코드 연동을 제공하지 않습니다. 사용자가 승인한 예약 알림 메일 읽기 방식만 사용하며, 비밀번호는 Windows Credential Manager에만 저장합니다.</p></details>
    <nav aria-label="네이버 예약 공식 도움말" className="mt-3 -ml-2 flex flex-wrap gap-x-2 gap-y-1 text-sm">{naverLinks.map(([label, href]) => <a aria-label={`${label} 새 창`} className={`${rowLink} text-sm`} href={href} key={href} rel="noopener noreferrer" target="_blank">{label}</a>)}</nav>
  </section>;
}

export function NaverMailConnection({ settings, history }: { settings: JsonObject; history: readonly SalonRecord<JsonValue>[] }) {
  const metadata = naverMailMetadata(settings);
  return <section aria-labelledby="naver-mail-title" className="mt-6 border-t border-[var(--border)] pt-5">
    <div className="flex items-start justify-between gap-6">
      <div><h3 className="font-bold" id="naver-mail-title">네이버 예약 메일 연동</h3><p className="mt-1 text-sm text-[var(--muted)]">네이버 예약 알림 메일을 읽어 로컬 예약으로 저장합니다. 메일 발송 기능은 사용하지 않습니다.</p></div>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${metadata.connected ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--background)] text-[var(--muted)]"}`}>상태: {metadata.connected ? "연결됨" : "연결 안 됨"}</span>
    </div>
    <NaverMailReplacementGuide />
    <ol className="mt-4 grid grid-cols-4 gap-2 text-xs">
      {["1. 네이버 예약 메일 연동 클릭", "2. 연동 방식·개인정보 안내", "3. 네이버 메일 주소 입력", "4. 애플리케이션 비밀번호 입력", "5. 연결 테스트", "6. 예약 관련 메일 자동 탐색", "7. 초기 예약 데이터 불러오기", "8. 앱 실행 시 신규 메일 동기화"].map((step) => <li className="rounded-[var(--radius-card)] bg-[var(--background)] p-3" key={step}>{step}</li>)}
    </ol>
    <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--background)] p-4 text-xs leading-5 text-[var(--muted)]">
      애플리케이션 비밀번호는 Windows Credential Manager에만 저장됩니다. SQLite, 화면, URL, 로그, 감사 이력에는 저장하지 않습니다. 네이버 메일의 예약 신청·확정·변경·취소만 읽습니다.
    </div>
    {metadata.connected ? <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-4">
      <dl className="grid grid-cols-3 gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-4 text-sm"><div><dt className="text-xs text-[var(--muted)]">메일 주소</dt><dd className="mt-1 font-medium">{metadata.email}</dd></div><div><dt className="text-xs text-[var(--muted)]">마지막 UID</dt><dd className="mt-1 font-medium tabular-nums">{metadata.lastSyncUid || "초기 동기화 전"}</dd></div><div><dt className="text-xs text-[var(--muted)]">마지막 동기화</dt><dd className="mt-1 font-medium tabular-nums">{metadata.lastSyncAt || "초기 동기화 전"}</dd></div></dl>
      <div className="flex gap-2"><form action={importInitialNaverBookings}><SubmitButton size="md" tone="secondary">초기 예약 불러오기</SubmitButton></form><form action={syncNewNaverBookings}><SubmitButton size="md">신규 메일 동기화</SubmitButton></form><form action={disconnectNaverMail}><SubmitButton size="md" tone="warning">연결 해제</SubmitButton></form></div>
    </div> : <form action={connectNaverMail} className="mt-4 grid grid-cols-[1fr_1fr_auto] items-end gap-3" aria-label="네이버 예약 메일 연결">
      <label className="grid gap-1 text-xs font-medium text-[var(--muted)]"><span>네이버 메일 주소</span><input className={input} name="email" placeholder="example@naver.com" required type="email" /></label>
      <label className="grid gap-1 text-xs font-medium text-[var(--muted)]"><span>애플리케이션 비밀번호</span><input autoComplete="new-password" className={input} name="applicationPassword" required type="password" /></label>
      <SubmitButton size="md">연결 테스트 및 저장</SubmitButton>
    </form>}
    <div className="mt-5"><h4 className="text-sm font-bold">동기화·재시도 이력</h4>{history.length ? <ul className="mt-2 space-y-2">{history.slice(-6).reverse().map((entry) => <li className="rounded-[var(--radius-control)] bg-[var(--background)] px-3 py-2 text-xs" key={entry.id}>상태: {text(entry, "status")} · 결과: {text(entry, "result")} · {text(entry, "attemptedAt")}{text(entry, "message") ? ` · ${text(entry, "message")}` : ""}{typeof value(entry).changed === "number" ? ` · ${value(entry).changed}건` : ""}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--muted)]">동기화 이력이 없습니다.</p>}</div>
  </section>;
}
