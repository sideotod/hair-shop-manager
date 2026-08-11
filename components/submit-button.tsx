"use client";

import { useFormStatus } from "react-dom";

import { button, type ButtonSize, type ButtonTone } from "./button";

/**
 * 서버 액션 폼의 제출 버튼.
 *
 * 지금까지 제출 뒤 화면이 도는 동안 아무 표시가 없었다. 원장은 저장이 먹었는지 알 수 없어
 * 같은 버튼을 다시 눌렀고, 그러면 원장(ledger)에 같은 행이 두 번 들어간다.
 *
 * 스켈레톤·스피너는 쓰지 않는다. `useFormStatus` 의 `pending` 만으로
 * 보조 기술에는 `aria-busy`, 눈에는 흐려진 버튼, 두 번째 클릭에는 `disabled` 로 답한다.
 * 라벨은 바꾸지 않는다 — 글자가 바뀌면 버튼 폭이 흔들린다.
 *
 * 부모 `<form>` 안에서만 동작한다. 폼 밖에서는 `pending` 이 항상 `false` 다.
 */
export function SubmitButton({ children, extra = "", size = "lg", tone = "primary", ...rest }: { children: React.ReactNode; extra?: string; size?: ButtonSize; tone?: ButtonTone } & Omit<React.ComponentPropsWithoutRef<"button">, "children" | "className" | "disabled" | "type">) {
  const { pending } = useFormStatus();
  return <button {...rest} aria-busy={pending || undefined} className={button(size, tone, `disabled:cursor-progress disabled:opacity-60${extra ? ` ${extra}` : ""}`)} disabled={pending} type="submit">{children}</button>;
}
