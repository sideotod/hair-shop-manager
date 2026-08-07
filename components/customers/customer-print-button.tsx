"use client";

import { button } from "../button";

export function triggerCustomerPrint(target: Pick<Window, "print"> = window) {
  target.print();
}

export function CustomerPrintButton() {
  return <button className={button("md", "secondary", "no-print")} onClick={() => triggerCustomerPrint()} type="button">현재 양식 인쇄</button>;
}
