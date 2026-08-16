"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "./app-shell";
import type { JsonObject } from "../lib/salon-domain";

/**
 * 레이아웃은 서버 컴포넌트라 경로를 읽을 수 없다.
 * 현재 경로만 주입하는 얇은 경계. 본문(`children`)은 서버에서 렌더된 그대로 통과한다.
 */
export function ShellFrame({ children, settings }: {
  children: React.ReactNode;
  settings: JsonObject;
}) {
  return <AppShell pathname={usePathname() ?? "/"} settings={settings}>{children}</AppShell>;
}
