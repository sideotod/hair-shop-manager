import { ShellFrame } from "../../components/shell-frame";
import { createSalonStore } from "../../lib/salon-store";

/**
 * 공통 셸은 여기서 **한 번만** 마운트된다.
 * 페이지가 각자 `<AppShell>` 을 호출하던 구조가 제목/활성 메뉴 불일치와
 * 페이지 전환마다 셸 전체를 다시 보내는 비용의 원인이었다.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const store = createSalonStore();
  // 고객 탐색은 헤더 검색폼(`/customers`)이 전부 맡는다. 헤더 최근 고객 목록이 사라져
  // 셸 경로마다 돌던 `listRecent("customers", 8)` 조회도 같이 없앴다.
  try { return <ShellFrame settings={store.getSettings()}>{children}</ShellFrame>; }
  finally { store.close(); }
}
