"use client";

export function CustomerPrintButton() {
  return <button className="no-print rounded-[8px] border border-[var(--border)] py-2 text-sm font-bold" onClick={() => window.print()} type="button">현재 양식 인쇄</button>;
}
