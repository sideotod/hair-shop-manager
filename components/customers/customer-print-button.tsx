"use client";

export function triggerCustomerPrint(target: Pick<Window, "print"> = window) {
  target.print();
}

export function CustomerPrintButton() {
  return <button className="no-print rounded-[8px] border border-[var(--border)] py-2 text-sm font-bold" onClick={() => triggerCustomerPrint()} type="button">현재 양식 인쇄</button>;
}
