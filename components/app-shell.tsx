import Link from "next/link";

import { logoutOwner } from "../app/auth-actions";
import { activeNavigationItem, matchNavigationItem, navigationItems } from "../lib/navigation";
import type { JsonObject, JsonValue, SalonRecord } from "../lib/salon-domain";
import { resolveVisualTokens } from "../lib/visual-tokens";

const groupOrder = ["운영", "정산", "관리"] as const;
const menuGroups = groupOrder.map((label) => ({ label, items: navigationItems.filter((item) => item.group === label) }));
const settingsSections = [
  ["owner", "매장 · 원장 계정"], ["customer", "고객 정책"], ["payment", "결제 정책"],
  ["booking", "예약"], ["messages", "문자 자동화"], ["integrations", "외부 연동"], ["help", "도움말 · 공지"],
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
  /**
   * 현재 경로. 헤더 제목과 활성 메뉴는 **오직 여기서만** 파생된다.
   * 페이지가 제목을 넘기던 구조가 "사이드바와 헤더가 서로 다른 화면을 가리키는" 버그의 원인이었다.
   */
  pathname: string;
  customers?: readonly SalonRecord<JsonValue>[];
  smsRemaining?: number;
  shopName?: string;
  ownerName?: string;
  settings?: JsonObject;
  today?: Date;
};

function customerName(customer: SalonRecord<JsonValue>) {
  if (typeof customer.value !== "object" || customer.value === null || Array.isArray(customer.value)) return customer.id;
  const value = customer.value as { name?: JsonValue };
  return typeof value.name === "string" ? value.name : customer.id;
}

export function AppShell({
  children,
  pathname,
  customers = [],
  smsRemaining = 0,
  shopName = "헤어해요",
  ownerName = "서원",
  settings = {},
  today = new Date(),
}: AppShellProps) {
  const title = matchNavigationItem(pathname).title;
  const activeHref = activeNavigationItem(pathname).path;
  const setting = (key: string, fallback: string) => typeof settings[key] === "string" ? settings[key] : fallback;
  const resolvedShopName = setting("shopName", shopName);
  const resolvedOwnerName = setting("ownerName", ownerName);
  const resolvedSmsRemaining = typeof settings.smsRemaining === "number" ? settings.smsRemaining : smsRemaining;
  const hiddenMenus = new Set(Array.isArray(settings.hiddenMenus) ? settings.hiddenMenus.filter((value): value is string => typeof value === "string") : []);
  const visibleGroups = menuGroups.map(({ label, items }) => ({ label, items: items.filter((item) => !hiddenMenus.has(item.path)) })).filter(({ items }) => items.length > 0);
  const customerTarget = settings.customerOpenMode === "new-window" ? "_blank" : undefined;
  const ownerLabel = resolvedOwnerName === "원장" ? "원장님" : `${resolvedOwnerName} 원장님`;
  const dateLabel = new Intl.DateTimeFormat("ko-KR", { dateStyle: "full", timeZone: "Asia/Seoul" }).format(today);
  const resolvedVisualTokens = resolveVisualTokens(settings);
  const visualTokens = {
    "--background": resolvedVisualTokens.backgroundColor,
    "--foreground": resolvedVisualTokens.foregroundColor,
    "--brand": resolvedVisualTokens.brandColor,
    "--sidebar": resolvedVisualTokens.sidebarColor,
  } as React.CSSProperties;

  return (
    <div data-app-shell-token-scope style={visualTokens}>
      <div data-app-shell-background className="grid h-screen min-h-screen w-full grid-cols-[232px_minmax(0,1fr)] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <aside className="flex h-screen min-h-0 flex-col bg-[var(--sidebar)] px-5 pb-[22px] pt-[26px] text-white">
          <div>
            <strong className="wordmark block text-[21px] leading-none tracking-[3.4px]">HAIRHAEYO</strong>
            <span className="mt-1.5 block text-[9.5px] font-medium tracking-[2.6px] text-[var(--accent)]">SALON LEDGER</span>
          </div>

          <nav aria-label="주요 메뉴" className="mt-[26px] space-y-1">
            {visibleGroups.map(({ label: groupLabel, items }) => <section className="mb-[18px] last:mb-0" key={groupLabel}><p className="px-3 pb-2 pt-0 font-mono text-[9px] font-medium tracking-[0.16em] text-white/40">{groupLabel}</p>{items.map(({ label, path }) => path === "/settings" ? (
              <details className="group" key={path} open={activeHref === "/settings"}>
                <summary className={`flex cursor-pointer list-none items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-[9px] text-[13px] ${activeHref === "/settings" ? "bg-[var(--surface)]/10 font-semibold text-white" : "text-white/60 hover:bg-[var(--surface)]/5 hover:text-white"}`}><span aria-hidden="true" className={`h-[13px] w-0.5 rounded-[1px] ${activeHref === "/settings" ? "bg-[var(--accent)]" : "bg-transparent"}`} /><span className="flex-1">{label}</span></summary>
                <div className="ml-5 mt-1 space-y-0.5 border-l border-white/15 pl-2">{settingsSections.map(([section, sectionLabel]) => <Link className="block rounded-[var(--radius-chip)] px-2.5 py-1.5 text-[11px] text-white/55 hover:bg-[var(--surface)]/5 hover:text-white" href={`/settings?section=${section}`} key={section}>{sectionLabel}</Link>)}</div>
              </details>
            ) : <Link aria-current={path === activeHref ? "page" : undefined} className={`flex items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-[9px] text-[13px] transition-colors ${path === activeHref ? "bg-[var(--surface)]/10 font-semibold text-white" : "text-white/60 hover:bg-[var(--surface)]/5 hover:text-white"}`} href={path} key={path}><span aria-hidden="true" className={`h-[13px] w-0.5 rounded-[1px] ${path === activeHref ? "bg-[var(--accent)]" : "bg-transparent"}`} />{label}</Link>)}</section>)}
          </nav>

          <div className="mt-auto rounded-[var(--radius-card)] bg-[var(--surface)]/[0.06] px-[13px] py-3">
            <strong className="block text-[13px] font-medium">{resolvedShopName}</strong>
            <span className="mt-1 block font-mono text-[10px] text-white/50">● 영업중 {setting("bookingOpen", "09:30")}–{setting("bookingClose", "21:00")}</span>
            <form action={logoutOwner} className="mt-3"><button className="text-[11px] text-white/50 hover:text-white" type="submit">로그아웃</button></form>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <header className="flex h-[72px] shrink-0 items-center gap-5 border-b border-[var(--border)] bg-[var(--surface)] px-7 text-[13px]">
            <div className="flex shrink-0 flex-col gap-0.5"><strong className="text-[19px] font-semibold tracking-[-0.01em]">{title}</strong><span className="font-mono text-[10.5px] text-[var(--muted)]">{dateLabel}</span></div>
            <div className="h-px min-w-0 flex-1" />
            <form action="/customers" className="flex h-10 w-[340px] shrink-0 items-center gap-2 rounded-[var(--radius-chip)] bg-[var(--background)] px-3" method="get" role="search">
              <select aria-label="고객 검색 기준" className="h-7 w-[76px] rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2 text-[10.5px] text-[var(--brand)]" name="mode">
                {searchModes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input aria-label="고객 검색어" className="h-7 min-w-0 flex-1 bg-transparent px-1 text-[12px] outline-none" name="query" placeholder="고객 검색" />
              <button className="sr-only" type="submit">검색</button>
            </form>
            {customers.length > 0 && (
              <details className="relative shrink-0">
                <summary className="cursor-pointer list-none text-[var(--brand)]">고객 바로가기</summary>
                <ul aria-label="고객 검색 결과 바로가기" className="absolute right-0 z-20 mt-3 w-52 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
                  {customers.map((customer) => (
                    <li key={customer.id}><Link className={`block rounded-[var(--radius-control)] px-3 hover:bg-[var(--brand-soft)] ${settings.customerDisplayMode === "compact" ? "py-1" : "py-2"}`} href={`/customers?customer=${customer.id}`} target={customerTarget}>{customerName(customer)}</Link></li>
                  ))}
                </ul>
              </details>
            )}
            <Link className="shrink-0 text-[11px] text-[var(--muted)]" href="/settings?section=help">도움말</Link>
            <span className="shrink-0 rounded-[var(--radius-control)] bg-[var(--brand-soft)] px-2.5 py-1.5 font-mono text-[11.5px] font-medium text-[var(--brand)]">SMS {resolvedSmsRemaining.toLocaleString("ko-KR")}</span>
            <Link aria-label={ownerLabel} className="flex shrink-0 items-center gap-2 font-medium" href="/settings?section=owner"><span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-[var(--sidebar)] text-[10px] text-white">서</span><span className="text-[12px]">{resolvedOwnerName}</span></Link>
          </header>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain" data-app-content>{children}</div>
        </div>
      </div>
    </div>
  );
}
