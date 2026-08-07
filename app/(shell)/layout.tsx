import { ShellFrame } from "../../components/shell-frame";
import { createSalonStore } from "../../lib/salon-store";

/**
 * 공통 셸은 여기서 **한 번만** 마운트된다.
 * 페이지가 각자 `<AppShell>` 을 호출하던 구조가 제목/활성 메뉴 불일치와
 * 페이지 전환마다 셸 전체를 다시 보내는 비용의 원인이었다.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const store = createSalonStore();
  // 셸에는 설정과 고객 목록만 필요하다. `snapshot()` 은 감사 로그 전량까지 읽는다.
  try { return <ShellFrame customers={store.list("customers")} settings={store.getSettings()}>{children}</ShellFrame>; }
  finally { store.close(); }
}
