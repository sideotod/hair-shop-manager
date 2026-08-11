"use client";

import { useEffect, useRef } from "react";

/** 배경을 `inert` 로 만든 뒤 첫 초점을 받을 요소. 닫기 버튼이 있으면 그쪽이 먼저다. */
function firstFocusable(node: HTMLElement) {
  return node.querySelector<HTMLElement>("[data-dialog-close]")
    ?? node.querySelector<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])');
}

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

    // 배경이 죽어도 초점은 열기 전 위치에 남는다. 옮겨 주지 않으면 키보드 사용자는
    // 아무것도 없는 곳에 서 있게 된다. 이미 모달 안에 들어와 있으면(자체 포커스를
    // 가진 드로어) 그대로 둔다.
    const restore = node.ownerDocument.activeElement;
    if (!node.contains(restore)) firstFocusable(node)?.focus();

    // Escape 는 닫기 링크를 누른 것과 같다. 닫기 경로는 링크가 이미 알고 있다.
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const close = node.querySelector<HTMLElement>("[data-dialog-close]");
      if (close) { event.preventDefault(); close.click(); }
    };
    node.ownerDocument.addEventListener("keydown", escape);

    return () => {
      node.ownerDocument.removeEventListener("keydown", escape);
      for (const element of disabled) element.inert = false;
      if (restore instanceof HTMLElement && restore.isConnected) restore.focus();
    };
  }, []);

  // `role="presentation"` 은 의미를 지우는 역할이라 `aria-label` 을 함께 쓸 수 없다 —
  // 지운 의미에 이름을 붙이는 셈이라 보조 기술이 라벨을 버린다. `group` 은 이름을 받는다.
  return <div aria-label={label} data-app-overlay ref={ref} role="group">{children}</div>;
}
