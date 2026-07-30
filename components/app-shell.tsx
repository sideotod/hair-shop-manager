import Link from "next/link";

const menu = [
  ["오늘 현황", "/"],
  ["고객 관리", "/customers"],
  ["예약 관리", "/bookings"],
  ["매출 · 결제", "/sales"],
  ["문자 발송", "/messages"],
  ["상품 · 쿠폰", "/products"],
  ["직원 · 설정", "/settings"],
] as const;

export function AppShell({ children, activeHref = "/" }: { children: React.ReactNode; activeHref?: string }) {
  return (
    <div className="grid min-h-screen min-w-[1280px] grid-cols-[232px_1fr] bg-[var(--background)]">
      <aside className="sticky top-0 flex h-screen flex-col bg-[var(--sidebar)] px-6 py-7 text-white">
        <div>
          <strong className="block text-[22px] leading-none tracking-[-0.02em]">HAIRHAEYO</strong>
          <span className="mt-1 block text-[10px] font-medium text-[var(--rose)]">헤어해요 · SALON MANAGEMENT</span>
        </div>

        <nav aria-label="주요 메뉴" className="mt-10 space-y-2">
          {menu.map(([label, href]) => (
            <Link
              className={`block rounded-[10px] px-4 py-3 text-sm ${
                href === activeHref
                  ? "bg-[var(--brand)] font-bold text-white"
                  : "text-[#d8cdd4] hover:bg-white/5 hover:text-white"
              }`}
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-[14px] bg-[#382d35] px-4 py-3">
          <strong className="block text-[13px] font-medium">청담 본점</strong>
          <span className="mt-1 block text-[11px] text-[#bfb1ba]">영업중 · 09:30–21:00</span>
        </div>
      </aside>

      <div>
        <header className="flex h-[72px] items-center justify-between bg-white px-7 text-[13px]">
          <strong className="font-medium">2026년 7월 30일 목요일</strong>
          <div className="flex items-center gap-3">
            <button className="text-[var(--muted)]" type="button">도움말</button>
            <span aria-hidden="true" className="size-8 rounded-full bg-[var(--brand-soft)]" />
            <strong className="font-medium">이창민 매니저</strong>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
