"use client";

import { useEffect } from "react";

import { button } from "../button";

export function triggerCustomerPrint(target: Pick<Window, "print"> = window) {
  target.print();
}

/**
 * 인쇄 표는 `?print=1` 일 때만 서버가 그린다. 858명 × 3칸을 매 응답에 실으면 /customers 가 507KB 였다.
 * 버튼은 인쇄 양식 폼의 submit 이라 고른 양식이 그대로 따라간다. 표가 붙은 뒤 이 컴포넌트가 인쇄창을 연다.
 */
export function CustomerPrintButton({ printing = false }: { printing?: boolean }) {
  useEffect(() => {
    if (!printing) return;
    // 인쇄창을 띄운 뒤 주소에서 깃발을 지운다. 새로고침이나 뒤로가기로 돌아와도 인쇄창이 다시 뜨지 않는다.
    const url = new URL(window.location.href);
    url.searchParams.delete("print");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    triggerCustomerPrint();
  }, [printing]);
  return <button className={button("md", "secondary", "no-print")} name="print" type="submit" value="1">현재 양식 인쇄</button>;
}
