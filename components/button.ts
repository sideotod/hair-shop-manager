/**
 * 프로그램 전체 버튼 크기 · 색 단일 정의.
 *
 * 이전에는 화면마다 `px-` · `py-` · `text-` 조합을 손으로 적었고 실측 결과 13가지가 섞여 있었다
 * (`px-4 py-3 text-sm`, `px-4 py-2 text-sm`, `px-3 py-2 text-sm`, `px-3 py-2 text-xs`,
 *  `px-5 py-3 text-sm`, `px-3.5 py-2 text-[12.5px]`, `px-3 py-1 text-xs`, `px-3 py-1.5 text-xs` …).
 * 같은 역할의 버튼이 화면마다 다른 높이로 나와 줄 정렬이 어긋났다.
 *
 * 크기는 "역할"로 고른다. 화면이 아니라 기능이 크기를 정한다.
 *
 *   lg  본문 주요 동작 · 폼 제출          44px  (14px 글자)
 *   md  탭·필터·페이저·모달 닫기          40px  (14px 글자, 입력창 h-10 과 같은 높이)
 *   sm  목록 행 안의 보조 동작            32px  (12px 글자)
 *   xs  카드 안의 조밀한 칩              26px  (11px 글자)
 *
 * 모든 tone 이 `border` 를 갖는다. 활성 상태에서 테두리가 붙었다 사라지면 폭이 1px 씩 흔들리기 때문이다.
 * 활성 표시는 색·배경·테두리 색만 바꾸고 크기와 위치는 절대 바꾸지 않는다.
 *
 * 사이드바 내비게이션(`app-shell.tsx`)은 이 스케일 밖이다. 본문 버튼이 아니라 셸의 일부다.
 */
export type ButtonSize = "lg" | "md" | "sm" | "xs";
export type ButtonTone = "primary" | "secondary" | "quiet" | "warning";

/**
 * 키보드 포커스 링 단일 정의.
 *
 * 실측: 포커스 표시가 있는 곳은 설정 화면과 차트뿐이었고, 셸 검색창은 아예 `outline-none` 이었다.
 * 마우스 없이 화면을 도는 원장은 지금 자기가 어디 있는지 볼 수 없다.
 * `focus-visible` 만 쓴다 — 마우스 클릭에는 링이 뜨지 않는다.
 */
export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

/** 어두운 사이드바 위. `--brand` 는 사이드바 배경과 대비가 낮아 링이 사라진다. */
export const focusRingOnDark = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// 높이는 `py-` 가 아니라 `h-` 로 못박는다. `py-` 만 쓰면 flex·grid 줄 안에서 stretch 되어
// 같은 `md` 가 단독 38px, 입력창 옆 40px 로 갈라졌다(실측). 고정 높이는 stretch 를 이긴다.
// `md` 를 40px 로 맞춘 이유: 화면 전체 입력창이 `h-10`(40px)이라 필터·조회 줄이 정확히 정렬된다.
const sizes: Record<ButtonSize, string> = {
  lg: "h-11 px-4 text-sm font-semibold",
  md: "h-10 px-3.5 text-sm font-medium",
  sm: "h-8 px-3 text-xs font-medium",
  xs: "h-[26px] px-2.5 text-[11px] font-medium",
};

const tones: Record<ButtonTone, string> = {
  primary: "border-[var(--brand)] bg-[var(--brand)] text-white",
  secondary: "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
  quiet: "border-transparent bg-[var(--background)] text-[var(--foreground)]",
  warning: "border-[var(--warning)] bg-[var(--surface)] text-[var(--warning)]",
};

/** 버튼·링크 공통 클래스. `extra` 는 여백·정렬처럼 크기와 무관한 것만 넣는다. */
export function button(size: ButtonSize, tone: ButtonTone = "secondary", extra = "") {
  // `shrink-0`: 세로 flex 안에서 `h-` 가 눌려 40px 버튼이 22px 로 찌그러졌다(실측, /customers 고객 정책 저장).
  return `inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] border transition-colors ${focusRing} ${sizes[size]} ${tones[tone]}${extra ? ` ${extra}` : ""}`;
}
