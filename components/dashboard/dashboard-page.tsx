import { AppShell } from "../app-shell";

const metrics = [
  { label: "오늘 매출", value: "₩4,280,000", meta: "어제보다 12.4% ↑", tone: "text-[var(--success)]" },
  { label: "오늘 예약", value: "38건", meta: "대기 4 · 완료 21", tone: "text-[var(--brand)]" },
  { label: "신규 고객", value: "9명", meta: "재방문 예정 6명", tone: "text-[var(--rose)]" },
  { label: "확인 필요", value: "3건", meta: "노쇼 1 · 미수금 2", tone: "text-[var(--warning)]" },
] as const;

const bookings = [
  ["09:30", "윤가영", "첫 방문 상담 · 컷", "하린 실장", "방문", "success"],
  ["10:30", "김민지", "프리미엄 컬러 + 클리닉", "서윤 원장", "시술중", "brand"],
  ["11:00", "박서준", "남성 펌", "도현 디자이너", "예약", "brand"],
  ["13:30", "한예린", "두피 스케일링", "하린 실장", "대기", "warning"],
  ["15:00", "정유나", "레이어드 컷", "서윤 원장", "예약", "brand"],
  ["17:30", "오지훈", "다운펌 + 컷", "도현 디자이너", "예약", "brand"],
] as const;

const staff = [
  ["서윤 원장", "₩1,680,000", "8 / 10"],
  ["하린 실장", "₩1,120,000", "7 / 9"],
  ["도현 디자이너", "₩860,000", "6 / 8"],
  ["민아 디자이너", "₩620,000", "4 / 7"],
] as const;

const alerts = [
  ["미수금", "김소연 · ₩120,000", "bg-[var(--danger)]"],
  ["노쇼", "최재민 · 14:00 예약", "bg-[var(--warning)]"],
  ["재고 부족", "케라틴 클리닉 3개", "bg-[var(--rose)]"],
  ["생일 고객", "이번 주 12명", "bg-[var(--success)]"],
] as const;

const card = "rounded-[14px] border border-[var(--border)] bg-white";

export function DashboardPage() {
  return (
    <AppShell activeHref="/">
      <main className="px-10 pb-14 pt-9">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.03em]">오늘 현황</h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">예약 흐름과 매출, 직원 상태를 한 화면에서 확인합니다.</p>
          </div>
          <button className="h-10 rounded-[10px] bg-[var(--brand)] px-7 text-sm font-medium text-white" type="button">
            예약 등록
          </button>
        </div>

        <section aria-label="오늘 핵심 지표" className="mt-10 grid grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <article className={`${card} min-h-32 px-5 py-4`} key={metric.label}>
              <h2 className="text-[13px] font-medium text-[var(--muted)]">{metric.label}</h2>
              <p className="mt-3 text-[27px] font-bold leading-none tabular-nums">{metric.value}</p>
              <p className={`mt-3 text-xs font-medium ${metric.tone}`}>{metric.meta}</p>
            </article>
          ))}
        </section>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_390px] gap-5">
          <section className={`${card} min-h-[676px] px-6 py-5`}>
            <div className="flex items-center justify-between">
              <h2 className="text-[19px] font-bold">오늘 예약</h2>
              <span className="text-xs font-medium text-[var(--muted)]">전체 38</span>
            </div>

            <ol className="mt-6 divide-y divide-[var(--border)]">
              {bookings.map(([time, customer, service, designer, status, tone]) => (
                <li className="grid min-h-[88px] grid-cols-[72px_1fr_170px_84px] items-center" key={`${time}-${customer}`}>
                  <time className="text-[13px] font-bold text-[var(--brand)]">{time}</time>
                  <div>
                    <strong className="block text-[15px] font-medium">{customer}</strong>
                    <span className="mt-1 block text-xs text-[var(--muted)]">{service}</span>
                  </div>
                  <span className="text-[13px]">{designer}</span>
                  <span className={`justify-self-start rounded-full px-3 py-1 text-[11px] font-medium ${
                    tone === "success"
                      ? "bg-[#e8f0eb] text-[var(--success)]"
                      : tone === "warning"
                        ? "bg-[#f6eedc] text-[var(--warning)]"
                        : "bg-[var(--brand-soft)] text-[var(--brand)]"
                  }`}>
                    {status}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <div className="space-y-5">
            <section className={`${card} h-80 px-5 py-5`}>
              <h2 className="text-lg font-bold">디자이너 현황</h2>
              <ul className="mt-6 space-y-7">
                {staff.map(([name, sales, progress]) => (
                  <li className="grid grid-cols-[1fr_120px_48px] text-[13px]" key={name}>
                    <strong className="font-medium">{name}</strong>
                    <strong className="font-bold tabular-nums">{sales}</strong>
                    <span className="text-right text-xs text-[var(--muted)]">{progress}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={`${card} h-[336px] px-5 py-5`}>
              <h2 className="text-lg font-bold">확인 필요</h2>
              <ul className="mt-7 space-y-7">
                {alerts.map(([label, detail, dot]) => (
                  <li className="grid grid-cols-[10px_76px_1fr] items-center text-[13px]" key={label}>
                    <span aria-hidden="true" className={`size-2 rounded-full ${dot}`} />
                    <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
                    <strong className="font-medium">{detail}</strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
