import Link from "next/link";

// 로그아웃은 여기서 나갔다 (`components/settings/settings-page.tsx` 계정 설정). `logoutOwner` 도 같이 갔다.
import { focusRing, focusRingOnDark } from "./button";

import { activeNavigationItem, matchNavigationItem, navigationItems } from "../lib/navigation";
import type { JsonObject } from "../lib/salon-domain";
import { resolveVisualTokens } from "../lib/visual-tokens";
import { typeScale } from "./type";

const sidebarItems = navigationItems.filter((item) => item.group && item.path !== "/messages");

type AppShellProps = {
  children: React.ReactNode;
  /**
   * 현재 경로. 헤더 제목과 활성 메뉴는 **오직 여기서만** 파생된다.
   * 페이지가 제목을 넘기던 구조가 "사이드바와 헤더가 서로 다른 화면을 가리키는" 버그의 원인이었다.
   */
  pathname: string;
  shopName?: string;
  ownerName?: string;
  settings?: JsonObject;
};

export function AppShell({
  children,
  pathname,
  shopName = "헤어해요",
  ownerName = "서원",
  settings = {},
}: AppShellProps) {
  const title = matchNavigationItem(pathname).title;
  const activeHref = activeNavigationItem(pathname).path;
  const setting = (key: string, fallback: string) => typeof settings[key] === "string" ? settings[key] : fallback;
  const resolvedOwnerName = setting("ownerName", ownerName);
  const ownerLabel = resolvedOwnerName === "사용자" ? "사용자님" : `${resolvedOwnerName} 사용자님`;
  const resolvedVisualTokens = resolveVisualTokens(settings);
  const visualTokens = {
    "--background": resolvedVisualTokens.backgroundColor,
    "--foreground": resolvedVisualTokens.foregroundColor,
    "--brand": resolvedVisualTokens.brandColor,
    "--sidebar": resolvedVisualTokens.sidebarColor,
  } as React.CSSProperties;

  return (
    <div data-app-shell-token-scope style={visualTokens}>
      {/* 최소 폭은 1440px 의 125% 확대(= CSS 1152px)에 맞춘다. PRODUCT.md 가 확대 지원을 요구하는데
          1264 로 잡아두면 확대하는 순간 창 전체가 가로로 스크롤됐다(실측).
          좁아지면 사이드바를 200px 로 줄이고, 그래도 모자란 표는 본문 스크롤러 안에서 가로로 흐른다. */}
      <div data-app-shell-background className="grid h-screen min-h-screen w-full min-w-[1152px] grid-cols-[200px_minmax(0,1fr)] overflow-hidden bg-[var(--background)] text-[var(--foreground)] min-[1264px]:grid-cols-[232px_minmax(0,1fr)]">
        <aside data-app-sidebar className="flex h-screen min-h-0 flex-col bg-[var(--sidebar)] px-5 pb-[22px] pt-[26px] text-white">
          <div>
            <strong className="wordmark block text-[21px] leading-none tracking-[3.4px]">HAIRHAEYO</strong>
          </div>

          <nav aria-label="주요 메뉴" className="mt-[26px] space-y-1">
            {sidebarItems.map(({ label, path }) => <Link aria-current={path === activeHref ? "page" : undefined} className={`flex items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-[9px] text-[13px] transition-colors ${focusRingOnDark} ${path === activeHref ? "bg-[var(--surface)]/10 font-semibold text-white" : "text-white/60 hover:bg-[var(--surface)]/5 hover:text-white"}`} href={path} key={path}><span aria-hidden="true" className={`h-[13px] w-0.5 rounded-[1px] ${path === activeHref ? "bg-[var(--accent)]" : "bg-transparent"}`} />{label}</Link>)}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <header className="flex h-[72px] shrink-0 items-center gap-5 border-b border-[var(--border)] bg-[var(--surface)] px-7 text-[13px]">
            {/* 헤더는 세 가지만 든다: 여기가 어디인지(제목), 고객을 찾는 칸, 내 계정.
                날짜·최근 고객·도움말·SMS 잔량은 각각 본문·검색칸·사이드바 설정·문자 화면에 이미 있다. */}
            <h1 className={`shrink-0 ${typeScale.title}`}>{title}</h1>
            <div className="h-px min-w-0 flex-1" />
            {/* 검색 기준 드롭다운은 없앴다. 8개 중 6개(닉네임·메모·주소·이메일·포인트카드·패밀리번호)가
                삭제된 속성을 읽어 아무것도 찾지 못했고, 남은 둘은 `/customers` 가 입력만 보고 알아서 가른다 —
                숫자면 번호 뒷자리, 아니면 이름. 고를 것이 없으면 고르게 하지 않는다. */}
            <form action="/customers" className="flex h-10 w-[340px] shrink-0 items-center gap-2 rounded-[var(--radius-chip)] bg-[var(--background)] px-3" data-header-search method="get" role="search">
              {/* 입력 포커스는 클릭 영역 전체에 표시해, 테두리와 검색창 크기를 일치시킨다. */}
              <input aria-label="고객 검색어" className="h-full min-w-0 flex-1 rounded-[var(--radius-control)] bg-transparent px-1 text-[12px]" data-header-search-input name="query" placeholder="고객명 또는 휴대전화 뒷자리" />
              {/* `not-sr-only` 이 `padding:0` 을 되돌려 붙인다. 크기는 `focus:` 쪽에서 다시 줘야
                  포커스로 드러난 버튼이 23×19.5px 짜리 글자 덩어리로 나오지 않는다(실측). */}
              <button className={`sr-only rounded-[var(--radius-control)] bg-[var(--brand)] text-[11px] text-white focus:not-sr-only focus:inline-flex focus:h-8 focus:items-center focus:px-2.5 ${focusRing}`} type="submit">검색</button>
            </form>
            <Link aria-label={ownerLabel} className={`flex h-8 shrink-0 items-center gap-2 rounded-[var(--radius-control)] px-1 font-medium ${focusRing}`} href="/settings?section=owner"><span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-[var(--sidebar)] text-[10px] text-white">서</span><span className="text-[12px]">{resolvedOwnerName}</span></Link>
          </header>
          {/* `scrollbar-gutter: stable` — 스크롤바가 생기는 화면(/sales, /messages)만 본문 폭이 15px 좁아져
              오른쪽 끝이 화면마다 1412px ↔ 1397px 로 튀었다. 자리를 항상 비워 두면 폭이 고정된다. */}
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-gutter:stable]" data-app-content>{children}</div>
        </div>
      </div>
    </div>
  );
}
