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
  { id: "bookings", path: "/bookings", label: "예약", title: "사용자 예약", group: "운영" },
  // 결제 등록·지출/정산 탭을 내리면서 이름이 좁아졌다. 이 화면이 하는 일은 매출을 읽는 것이다 —
  // 결제는 예약 행·고객 상세에서 열리는 작업이고, 거래 기록은 아래 하위 항목이 맡는다.
  { id: "sales", path: "/sales", label: "매출", title: "매출 분석", group: "정산" },
  { id: "messages", path: "/messages", label: "문자", title: "문자 발송", group: "정산" },
  // `/operations` 는 이름일 뿐 갈래가 아니었다 — 지출은 원장(`/sales`), 시술·메모는 설정(`/settings`)으로 갈라졌다 (설계 §5.2).
  { id: "settings", path: "/settings", label: "설정", title: "매장 설정", group: "관리" },
  { id: "sales-transactions", path: "/sales/transactions", label: "거래 기록", title: "거래 기록", parentId: "sales" },
];

/**
 * 설정 구역 목록. 사이드바(`components/app-shell.tsx:78`)와 설정 화면이 **같은 한 벌**을 본다 —
 * 두 벌이던 시절에 화면 안 레일에는 있고 사이드바에는 없는 구역이 생겼다.
 * 키는 URL 에 그대로 나가므로 바꾸지 않는다. 헤더 바로가기(`?section=owner`)와 예약 화면
 * (`?section=booking`)이 이 키로 깊게 들어온다.
 */
export const settingsSections = [
  ["owner", "계정 설정"],
  ["customer", "고객 정책"],
  ["payment", "결제 정책"],
  ["booking", "예약"],
  ["services", "시술 가격"],
  ["integrations", "외부 연동"],
  ["help", "도움말 · 공지"],
] as const;

/** 모르는 `?section=` 은 첫 구역으로 떨어뜨린다. 사이드바와 본문이 서로 다른 구역을 고르면 안 된다. */
export function resolveSettingsSection(section?: string): string {
  return settingsSections.some(([key]) => key === section) ? section! : settingsSections[0][0];
}

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

/**
 * 한 메뉴의 하위 항목. 사이드바는 부모가 활성일 때만 이걸 편다.
 *
 * 늘 펼쳐 두면 자주 가지 않는 곳이 매일 가는 곳과 같은 무게로 서 있게 되고,
 * 설정 7줄까지 더해지면 사이드바가 화면 높이를 넘긴다(1280×800 실측).
 * 설정 구역(`settingsSections`)과 같은 규칙이다 — 두 벌로 만들지 않는다.
 */
export function childNavigationItems(parentId: string): readonly NavigationItem[] {
  return navigationItems.filter((item) => item.parentId === parentId);
}

/** 모달 키만 지운 현재 URL. 손 조립하면 파라미터가 조용히 사라진다. */
export function closeHref(pathname: string, params: URLSearchParams, ...remove: string[]): string {
  const query = withoutParams(params, ...remove).toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * 결제를 마친 뒤 돌아갈 수 있는 곳. **앞이 고정된 허용 목록이다 — 열린 리다이렉트를 만들지 않는다.**
 *
 * 판정이 두 곳에서 필요하다: 라우트가 폼에 심을 때(`app/(shell)/sales/page.tsx`)와 서버 액션이
 * 실제로 이동할 때(`app/payment-actions.ts`). 정규식을 두 벌 적으면 언젠가 갈라져서
 * "폼은 받아줬는데 저장하면 다른 데로 가는" 상태가 된다. 한 벌만 둔다.
 *
 * `/` 는 넣지 않는다. `/^\/(?:\?|$)/` 를 앞이 고정된 대안들 옆에 놓으면 실수하기 쉽고,
 * 대시보드에서 온 결제는 `/bookings?date=<오늘>` 로 보내면 충분하다 (설계 §4.2).
 */
const paymentReturn = /^(?:\/sales(?:\/transactions)?|\/customers|\/bookings)(?:\?|$)/;
export function paymentReturnTo(requested: unknown, fallback: string): string {
  return typeof requested === "string" && paymentReturn.test(requested) ? requested : fallback;
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
