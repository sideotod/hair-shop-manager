"use client";

import { useEffect, useRef } from "react";

/**
 * 페이지 본문 안에서 모달을 렌더하면서도 배경을 `inert` 로 만든다.
 *
 * 셸이 라우트 레이아웃으로 올라간 뒤로 페이지는 더 이상 셸에 `overlay` prop 을 넘길 수 없다.
 * 그렇다고 배경 전체(`[data-app-shell-background]`)에 `inert` 를 걸면 그 안에 있는 모달까지 죽는다.
 * 그래서 모달에서 위로 올라가며 "형제들만" 비활성화한다. 모달 자신의 조상 사슬은 건드리지 않는다.
 *
 * SSR 마크업은 그대로 인라인이라 JS 없이도 모달이 보이고 닫기 링크가 동작한다.
 */
export function ModalHost({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const disabled: HTMLElement[] = [];
    for (let current: HTMLElement | null = node; current; current = current.parentElement) {
      const parent: HTMLElement | null = current.parentElement;
      if (!parent) break;
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== current && sibling instanceof HTMLElement && !sibling.inert) {
          sibling.inert = true;
          disabled.push(sibling);
        }
      }
      if (parent.hasAttribute("data-app-shell-token-scope")) break;
    }
    return () => { for (const element of disabled) element.inert = false; };
  }, []);

  return <div aria-label={label} data-app-overlay ref={ref} role="presentation">{children}</div>;
}
