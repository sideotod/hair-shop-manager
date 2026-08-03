import Link from "next/link";

import { logoutOwner } from "../app/auth-actions";
import type { JsonValue, SalonRecord } from "../lib/salon-domain";

const menu = [
  ["오늘", "/"],
  ["고객", "/customers"],
  ["예약", "/bookings"],
  ["매출·결제", "/sales"],
  ["문자", "/messages"],
  ["운영 설정", "/operations"],
  ["설정", "/settings"],
] as const;

const searchModes = [
  ["phone-or-name", "핸드폰 뒷번호/고객명"],
  ["nickname", "닉네임"],
  ["phone", "전화번호 뒷번호"],
  ["group", "그룹명"],
  ["memo", "메모"],
  ["address", "주소"],
  ["motive", "방문동기"],
  ["email", "이메일"],
  ["point-card", "포인트 카드"],
  ["family", "패밀리번호"],
] as const;

type AppShellProps = {
  children: React.ReactNode;
  customers?: readonly SalonRecord<JsonValue>[];
  smsRemaining?: number;
  shopName?: string;
  ownerName?: string;
  activeHref?: string;
  overlay?: React.ReactNode;
  today?: Date;
};

function customerName(customer: SalonRecord<JsonValue>) {
  if (typeof customer.value !== "object" || customer.value === null || Array.isArray(customer.value)) return customer.id;
  const value = customer.value as { name?: JsonValue };
  return typeof value.name === "string" ? value.name : customer.id;
}

export function AppShell({
  children,
  customers = [],
  smsRemaining = 0,
  shopName = "수원 본점",
  ownerName = "원장",
  activeHref = "/",
  overlay,
  today = new Date(),
}: AppShellProps) {
  const ownerLabel = ownerName === "원장" ? "원장님" : `${ownerName} 원장님`;
  const dateLabel = new Intl.DateTimeFormat("ko-KR", { dateStyle: "full", timeZone: "Asia/Seoul" }).format(today);

  return (
    <>
      <div data-app-shell-background {...(overlay ? { inert: true, "aria-hidden": true } : {})} className="grid min-h-screen grid-cols-[232px_minmax(0,1fr)] bg-[var(--background)]">
        <aside className="sticky top-0 flex h-screen flex-col bg-[var(--sidebar)] px-6 py-7 text-white">
          <div>
            <strong className="block text-[22px] leading-none tracking-[-0.02em]">HAIRHAEYO</strong>
            <span className="mt-1 block text-[10px] font-medium text-[var(--rose)]">헤어해요 · SALON MANAGEMENT</span>
          </div>

          <nav aria-label="주요 메뉴" className="mt-10 space-y-2">
            {menu.map(([label, href]) => (
              <Link
                className={`block rounded-[10px] px-4 py-3 text-sm ${href === activeHref ? "bg-[var(--brand)] font-bold text-white" : "text-[#d8cdd4] hover:bg-white/5 hover:text-white"}`}
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-[14px] bg-[#382d35] px-4 py-3">
            <strong className="block text-[13px] font-medium">{shopName}</strong>
            <span className="mt-1 block text-[11px] text-[#bfb1ba]">영업중 · 09:30–21:00</span>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="flex min-h-20 items-center gap-5 border-b border-[var(--border)] bg-white px-7 text-[13px]">
            <strong className="shrink-0 font-medium">{dateLabel}</strong>
            <form action="/customers" className="flex min-w-0 flex-1 items-center gap-2" method="get" role="search">
              <select aria-label="고객 검색 기준" className="h-10 w-44 rounded-[9px] border border-[var(--border)] bg-white px-3" name="mode">
                {searchModes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input aria-label="고객 검색어" className="h-10 min-w-0 flex-1 rounded-[9px] border border-[var(--border)] px-3" name="query" placeholder="고객 검색" />
              <button className="h-10 rounded-[9px] bg-[var(--brand)] px-4 font-medium text-white" type="submit">검색</button>
            </form>
            {customers.length > 0 && (
              <details className="relative shrink-0">
                <summary className="cursor-pointer list-none text-[var(--brand)]">고객 바로가기</summary>
                <ul aria-label="고객 검색 결과 바로가기" className="absolute right-0 z-20 mt-3 w-52 rounded-[10px] border border-[var(--border)] bg-white p-2 shadow-lg">
                  {customers.map((customer) => (
                    <li key={customer.id}><Link className="block rounded-md px-3 py-2 hover:bg-[var(--brand-soft)]" href={`/customers?customer=${customer.id}`}>{customerName(customer)}</Link></li>
                  ))}
                </ul>
              </details>
            )}
            <Link className="shrink-0 text-[var(--muted)]" href="/settings?section=help">도움말</Link>
            <span className="shrink-0 rounded-full bg-[var(--brand-soft)] px-3 py-2 font-medium text-[var(--brand)]">SMS 잔여 {smsRemaining.toLocaleString("ko-KR")}건</span>
            <Link className="shrink-0 font-medium" href="/settings?section=owner">{ownerLabel}</Link>
            <form action={logoutOwner}><button className="shrink-0 text-[var(--muted)]" type="submit">로그아웃</button></form>
          </header>
          {children}
        </div>
      </div>
      {overlay}
    </>
  );
}
