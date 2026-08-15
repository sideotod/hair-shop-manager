import Link from "next/link";

import { settingsSections } from "../../lib/navigation";
import { button } from "../button";

export function SettingsSectionTabs({ active }: { active: string }) {
  const activeIndex = Math.max(0, settingsSections.findIndex(([key]) => key === active));
  return <nav aria-label="설정 세부 메뉴" className="relative mb-5 grid grid-cols-7 rounded-[var(--radius-control)] bg-[var(--background)] p-1">
    <span aria-hidden="true" data-settings-active-indicator className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-8px)/7)] rounded-[calc(var(--radius-control)-4px)] bg-[var(--surface)] transition-transform duration-200 ease-out motion-reduce:transition-none" style={{ transform: `translateX(${activeIndex * 100}%)` }} />
    {settingsSections.map(([key, label]) => <Link aria-current={key === active ? "page" : undefined} className={button("sm", "quiet", `relative z-10 w-full justify-center rounded-[calc(var(--radius-control)-4px)] bg-transparent text-center text-[11px] ${key === active ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`)} href={`/settings?section=${key}`} key={key}>{label}</Link>)}
  </nav>;
}
