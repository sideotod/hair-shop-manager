export type NavigationItem = {
  id: string;
  path: string;
  /** 사이드바 표기 */
  label: string;
  /** 헤더 제목 */
  title: string;
  group?: "운영" | "정산" | "관리";
  /** 사이드바에 자기 항목이 없는 하위 경로는 부모를 활성으로 만든다. */
  parentId?: string;
};

export const navigationItems: readonly NavigationItem[] = [
  { id: "dashboard", path: "/", label: "운영 현황", title: "오늘", group: "운영" },
  { id: "customers", path: "/customers", label: "고객", title: "고객 관리", group: "운영" },
  { id: "bookings", path: "/bookings", label: "예약", title: "원장 예약", group: "운영" },
  { id: "sales", path: "/sales", label: "매출·결제", title: "매출·결제", group: "정산" },
  { id: "messages", path: "/messages", label: "문자", title: "문자 발송", group: "정산" },
  { id: "operations", path: "/operations", label: "운영 설정", title: "운영 설정", group: "관리" },
  { id: "settings", path: "/settings", label: "설정", title: "매장 설정", group: "관리" },
  { id: "sales-transactions", path: "/sales/transactions", label: "거래 기록", title: "거래 기록", parentId: "sales" },
];

const byId = new Map(navigationItems.map((item) => [item.id, item]));
const root = navigationItems.find((item) => item.path === "/")!;

/**
 * 세그먼트 경계에서만 일치하는 최장 경로 매칭.
 * `startsWith` 단독 사용 금지 — `/salesperson` 이 `/sales` 로 잡히면 안 된다.
 */
export function matchNavigationItem(pathname: string): NavigationItem {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  let best = root;
  for (const item of navigationItems) {
    if (item.path === "/") continue;
    if (path !== item.path && !path.startsWith(`${item.path}/`)) continue;
    if (item.path.length > best.path.length) best = item;
  }
  return best;
}

/** 사이드바에서 강조할 항목. 하위 경로는 `parentId` 를 따라 올라간다. */
export function activeNavigationItem(pathname: string): NavigationItem {
  const item = matchNavigationItem(pathname);
  return item.parentId ? byId.get(item.parentId) ?? item : item;
}

/** 모달 키만 지운 현재 URL. 손 조립하면 파라미터가 조용히 사라진다. */
export function closeHref(pathname: string, params: URLSearchParams, ...remove: string[]): string {
  const query = withoutParams(params, ...remove).toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** `remove` 키만 지운 사본. 원본은 건드리지 않는다. */
export function withoutParams(params: URLSearchParams, ...remove: string[]): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of remove) next.delete(key);
  return next;
}

/** Next.js 의 `searchParams` 레코드를 `URLSearchParams` 로. 배열 값(중복 키)도 전부 보존한다. */
export function toSearchParams(record: Record<string, string | string[] | undefined> = {}): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") params.append(key, value);
    else if (Array.isArray(value)) for (const item of value) params.append(key, item);
  }
  return params;
}
