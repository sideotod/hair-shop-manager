/**
 * 프로그램 전체 활자 스케일 단일 정의.
 *
 * 이전에는 화면마다 크기를 손으로 적었고 실측 결과 **22가지**가 섞여 있었다
 * (9 · 9.5 · 10 · 10.5 · 11 · 11.5 · 12 · 12.5 · 13 · 13.5 · 14 · text-sm · text-lg
 *  · 17 · 19 · text-xl · 21 · 22 · text-2xl · 26 · 29 …).
 *
 * 두 가지 문제가 있었다.
 *
 * 1. **같은 역할이 화면마다 다른 크기였다.** 카드 제목이 설정·예약·운영에서는 `text-lg`(18px),
 *    고객에서는 `text-xl`(20px), 대시보드에서는 13.5px 였다. 같은 위계의 제목이
 *    화면을 옮길 때마다 7px 씩 뛴다.
 * 2. **0.5px 단계가 45곳 있었다.** 13px 본문 옆에서 10.5px 와 11px 은 구분되지 않는다.
 *    정보를 주지 않으면서 값만 늘려 다음 사람이 "무엇을 골라야 하나"를 매번 다시 정하게 만든다.
 *
 * 크기는 "역할"로 고른다. 화면이 아니라 기능이 크기를 정한다.
 *
 *   display  28px  화면에서 가장 큰 수치 하나 (오늘 매출)
 *   metric   22px  차트 합계
 *   figure   17px  KPI 카드 수치
 *   title    19px  화면 제목 · 모달 제목 · 상세 패널 제목
 *   section  15px  카드 제목
 *   (본문)   13px  `globals.css` 의 `body` 기본값. 클래스를 붙이지 않는다.
 *   label    12px  입력 라벨 · 표 보조 칸
 *   meta     11px  부연 · 축 라벨 · 목록 부제
 *   micro    10px  배지 · 그룹 라벨
 *
 * 굵기도 여기서 고정한다. 이전에는 `font-bold`(700)와 `font-semibold`(600)가
 * 같은 역할에 섞여 있었다(제목 20곳 bold, 6곳 semibold). 한글 본문 서체(IBM Plex Sans KR)는
 * 조밀한 운영 화면에서 700이 번져 보인다. 제목은 600으로 통일한다.
 *
 * 스케일 밖(문서화된 예외):
 *   - 사이드바 워드마크 21px — 셸의 브랜드 각인이지 본문 활자가 아니다 (`app-shell.tsx`).
 *   - 버튼 글자 크기 — 높이와 함께 움직이므로 `button.ts` 가 소유한다.
 */
export const typeScale = {
  display: "text-[28px] font-medium leading-none tracking-[-0.02em]",
  metric: "text-[22px] font-semibold leading-none tracking-[-0.015em]",
  figure: "text-[17px] font-semibold leading-none tracking-[-0.015em]",
  title: "text-[19px] font-semibold tracking-[-0.01em]",
  section: "text-[15px] font-semibold tracking-[-0.005em]",
  label: "text-[12px] font-medium",
  meta: "text-[11px]",
  micro: "text-[10px] font-semibold tracking-[0.04em]",
} as const;
