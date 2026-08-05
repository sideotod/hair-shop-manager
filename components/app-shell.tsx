import Link from "next/link";

import { logoutOwner } from "../app/auth-actions";
import type { JsonObject, JsonValue, SalonRecord } from "../lib/salon-domain";
import { resolveVisualTokens } from "../lib/visual-tokens";
import { SalesControls } from "./sales/sales-controls";
import { revenueRange, type RevenueQuery } from "./sales/revenue-query";

const menu = [
  ["운영 현황", "/"],
  ["고객", "/customers"],
  ["예약", "/bookings"],
  ["매출·결제", "/sales"],
  ["문자", "/messages"],
  ["운영 설정", "/operations"],
  ["설정", "/settings"],
] as const;
const menuGroups = [
  { label: "운영", items: menu.slice(0, 3) },
  { label: "정산", items: menu.slice(3, 5) },
  { label: "관리", items: menu.slice(5) },
] as const;
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
  customers?: readonly SalonRecord<JsonValue>[];
  smsRemaining?: number;
  shopName?: string;
  ownerName?: string;
  settings?: JsonObject;
  activeHref?: string;
  overlay?: React.ReactNode;
  contentClassName?: string;
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
  shopName = "헤어해요",
  ownerName = "서원",
  settings = {},
  activeHref = "/",
  overlay,
  contentClassName = "overflow-auto overscroll-contain",
  today = new Date(),
}: AppShellProps) {
  const setting = (key: string, fallback: string) => typeof settings[key] === "string" ? settings[key] : fallback;
  const resolvedShopName = setting("shopName", shopName);
  const resolvedOwnerName = setting("ownerName", ownerName);
  const resolvedSmsRemaining = typeof settings.smsRemaining === "number" ? settings.smsRemaining : smsRemaining;
  const hiddenMenus = new Set(Array.isArray(settings.hiddenMenus) ? settings.hiddenMenus.filter((value): value is string => typeof value === "string") : []);
  const visibleGroups = menuGroups.map(({ label, items }) => ({ label, items: items.filter(([, href]) => !hiddenMenus.has(href)) })).filter(({ items }) => items.length > 0);
  const customerTarget = settings.customerOpenMode === "new-window" ? "_blank" : undefined;
  const ownerLabel = resolvedOwnerName === "원장" ? "원장님" : `${resolvedOwnerName} 원장님`;
  const dateLabel = new Intl.DateTimeFormat("ko-KR", { dateStyle: "full", timeZone: "Asia/Seoul" }).format(today);
  const resolvedVisualTokens = resolveVisualTokens(settings);
  const workspace = settings.salesWorkspace;
  const workspaceQuery = workspace && typeof workspace === "object" && !Array.isArray(workspace) ? (workspace as { query?: RevenueQuery; tab?: unknown }) : null;
  const salesControls = workspaceQuery?.query && (workspaceQuery.tab === "payment" || workspaceQuery.tab === "expenses") ? <SalesControls label={revenueRange(workspaceQuery.query).label} query={workspaceQuery.query} tab={workspaceQuery.tab} /> : null;
  const visualTokens = {
    "--background": resolvedVisualTokens.backgroundColor,
    "--foreground": resolvedVisualTokens.foregroundColor,
    "--brand": resolvedVisualTokens.brandColor,
    "--sidebar": resolvedVisualTokens.sidebarColor,
  } as React.CSSProperties;

  return (
    <div data-app-shell-token-scope style={visualTokens}>
      <div data-app-shell-background {...(overlay ? { inert: true, "aria-hidden": true } : {})} className="grid h-screen min-h-screen w-full grid-cols-[232px_minmax(0,1fr)] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <aside className="flex h-screen min-h-0 flex-col bg-[var(--sidebar)] px-5 pb-[22px] pt-[26px] text-white">
          <div>
            <strong className="wordmark block text-[21px] leading-none tracking-[0.16em]">HAIRHAEYO</strong>
            <span className="mt-1.5 block text-[10px] font-medium tracking-[0.08em] text-white/70">헤어해요 · SALON MANAGEMENT</span>
          </div>

          <nav aria-label="주요 메뉴" className="mt-[26px] space-y-1">
            {visibleGroups.map(({ label: groupLabel, items }) => <section className="mb-[18px] last:mb-0" key={groupLabel}><p className="px-3 pb-2 pt-0 font-mono text-[9px] font-medium tracking-[0.16em] text-white/40">{groupLabel}</p>{items.map(([label, href]) => href === "/settings" ? (
              <details className="group" key={href} open={activeHref === "/settings"}>
                <summary className={`flex cursor-pointer list-none items-center gap-2.5 rounded-[8px] px-3 py-[9px] text-[13px] ${activeHref === "/settings" ? "bg-white/10 font-semibold text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}><span aria-hidden="true" className={`h-[13px] w-0.5 rounded-[1px] ${activeHref === "/settings" ? "bg-[var(--accent)]" : "bg-transparent"}`} /><span className="flex-1">{label}</span></summary>
                <div className="ml-5 mt-1 space-y-0.5 border-l border-white/15 pl-2">{settingsSections.map(([section, sectionLabel]) => <Link className="block rounded-[4px] px-2.5 py-1.5 text-[11px] text-white/55 hover:bg-white/5 hover:text-white" href={`/settings?section=${section}`} key={section}>{sectionLabel}</Link>)}</div>
              </details>
            ) : <Link className={`flex items-center gap-2.5 rounded-[8px] px-3 py-[9px] text-[13px] transition-colors ${href === activeHref ? "bg-white/10 font-semibold text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`} href={href} key={href}><span aria-hidden="true" className={`h-[13px] w-0.5 rounded-[1px] ${href === activeHref ? "bg-[var(--accent)]" : "bg-transparent"}`} />{label}</Link>)}</section>)}
          </nav>

          <div className="mt-auto rounded-[6px] border border-white/5 bg-white/[0.06] px-[13px] py-3">
            <strong className="block text-[13px] font-medium">{resolvedShopName}</strong>
            <span className="mt-1 block font-mono text-[10px] text-white/50">● 영업중 {setting("bookingOpen", "09:00")}–{setting("bookingClose", "20:00")}</span>
            <form action={logoutOwner} className="mt-3"><button className="text-[11px] text-white/50 hover:text-white" type="submit">로그아웃</button></form>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <header className="flex h-[72px] shrink-0 items-center gap-5 border-b border-[var(--border)] bg-white px-7 text-[13px]">
            <div className="flex shrink-0 flex-col gap-0.5"><strong className="text-[19px] font-semibold tracking-[-0.01em]">오늘</strong><span className="font-mono text-[10.5px] text-[var(--muted)]">{dateLabel}</span></div>
            <div className="h-px min-w-0 flex-1" />
            <form action="/customers" className="flex h-10 w-[340px] shrink-0 items-center gap-2 rounded-[4px] bg-[var(--background)] px-3" method="get" role="search">
              <select aria-label="고객 검색 기준" className="h-7 w-[76px] rounded-[5px] border border-[var(--border)] bg-white px-2 text-[10.5px] text-[var(--brand)]" name="mode">
                {searchModes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input aria-label="고객 검색어" className="h-7 min-w-0 flex-1 bg-transparent px-1 text-[12px] outline-none" name="query" placeholder="고객 검색" />
              <button className="sr-only" type="submit">검색</button>
            </form>
            {customers.length > 0 && (
              <details className="relative shrink-0">
                <summary className="cursor-pointer list-none text-[var(--brand)]">고객 바로가기</summary>
                <ul aria-label="고객 검색 결과 바로가기" className="absolute right-0 z-20 mt-3 w-52 rounded-[10px] border border-[var(--border)] bg-white p-2 shadow-lg">
                  {customers.map((customer) => (
                    <li key={customer.id}><Link className={`block rounded-md px-3 hover:bg-[var(--brand-soft)] ${settings.customerDisplayMode === "compact" ? "py-1" : "py-2"}`} href={`/customers?customer=${customer.id}`} target={customerTarget}>{customerName(customer)}</Link></li>
                  ))}
                </ul>
              </details>
            )}
            <Link className="shrink-0 text-[11px] text-[var(--muted)]" href="/settings?section=help">도움말</Link>
            <span className="shrink-0 rounded-[6px] bg-[var(--brand-soft)] px-2.5 py-1.5 font-mono text-[11.5px] font-medium text-[var(--brand)]">SMS {resolvedSmsRemaining.toLocaleString("ko-KR")}</span>
            <Link aria-label={ownerLabel} className="flex shrink-0 items-center gap-2 font-medium" href="/settings?section=owner"><span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-[var(--sidebar)] text-[10px] text-white">서</span><span className="text-[12px]">{resolvedOwnerName}</span></Link>
          </header>
          <div className={`min-h-0 flex-1 ${contentClassName}`}>{salesControls}{children}</div>
        </div>
      </div>
      {overlay}
    </div>
  );
}
