"use client";

import { useActionState, useEffect, useRef } from "react";
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

/**
 * 실패해도 입력이 살아남는 서버 액션 폼.
 *
 * 지금까지 저장이 튕기면 액션이 `?error=` 로 **리다이렉트**했다. 리다이렉트는 폼을 처음부터
 * 다시 그린다 — 결제 화면에서는 33칸이 통째로 비워졌고 열어둔 `<details>` 는 도로 접혔으며,
 * 예약 화면에서는 등록 창 자체가 사라졌다. 원장은 틀린 한 칸을 고치는 게 아니라 처음부터
 * 다시 쳐야 했다.
 *
 * 실패는 이동이 아니다. 액션이 오류 문구를 **반환**하면 화면은 그 자리에 그대로 있고
 * 브라우저가 들고 있는 입력값도 그대로다. 성공만 이동한다(`redirect`).
 *
 * 문구가 뜨면 포커스를 그 문구로 옮긴다. 지금까지 제출 뒤 포커스는 `BODY` 에 있었다 —
 * 키보드만 쓰는 원장은 저장이 튕겼다는 사실을 Tab 을 다시 27번 눌러야 알 수 있었다.
 * `tabIndex={-1}` 은 포커스를 받되 Tab 순서에는 끼지 않는다.
 */
export function ActionForm({ action, children, error, errorClassName, errorPrefix = "", ...rest }: {
  action: (state: string | undefined, formData: FormData) => Promise<string | undefined>;
  children: React.ReactNode;
  /** 다른 폼이 `?error=` 로 남긴 문구. 이 폼이 방금 돌려준 문구가 우선한다. */
  error?: string;
  errorClassName: string;
  errorPrefix?: string;
} & Omit<React.ComponentPropsWithoutRef<"form">, "action" | "children">) {
  const [state, formAction] = useActionState(action, undefined);
  const alert = useRef<HTMLParagraphElement>(null);
  const message = state ?? error;
  useEffect(() => { if (message) alert.current?.focus(); }, [message]);
  return <form {...rest} action={formAction}>
    {message && <p className={errorClassName} ref={alert} role="alert" tabIndex={-1}>{errorPrefix}{message}</p>}
    {children}
  </form>;
}

/**
 * 저장에 성공했다고 알리는 배너. 다섯 화면이 같은 마크업을 복사해 쓰고 있었다.
 *
 * 성공은 리다이렉트다 — 화면이 처음부터 다시 그려지고 스크롤이 맨 위로 돌아간다.
 * 그래서 배너는 방금 누른 버튼에서 멀리 떨어진 곳에 뜬다(결제 화면 실측 326px).
 * 포커스는 `BODY` 에 남아 있어 키보드만 쓰는 원장은 저장이 먹었는지 알 방법이 없었고,
 * 실패 배너만 포커스를 가져가는 비대칭이 생겼다.
 *
 * 픽셀을 옮겨서는 두 요구(폼 머리에 두기 · 버튼 곁에 두기)를 동시에 만족시킬 수 없다.
 * 대신 포커스를 배너로 옮긴다. 브라우저가 배너를 화면 안으로 끌어오고 보조 기술이 문구를
 * 읽는다. `role="status"` 는 그대로 둔다 — 성공은 방해하지 않는 알림이다.
 * `tabIndex={-1}` 이라 Tab 순서에는 끼지 않는다.
 */
export function NoticeBanner({ children, className }: { children: React.ReactNode; className: string }) {
  const banner = useRef<HTMLParagraphElement>(null);
  useEffect(() => { banner.current?.focus(); }, []);
  return <p className={className} ref={banner} role="status" tabIndex={-1}>{children}</p>;
}
