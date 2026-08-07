# 산출물 A — 현행 감사 보고서

조사일 2026-08-06. 코드 수정 없음. 근거 등급: `Observed`(코드/화면 직접 확인) · `Measured`(계측값) · `Inferred`(관찰에서 도출) · `Hypothesis`(미검증 추정) · `Requires verification`(확인 필요).

계측 환경: `next build` + 프로덕션 서버 :3100, 인증 세션, Playwright 1440×900 / 1280×800, 실제 `.data/hairhaeyo.sqlite`.

---

## A0. 데이터 실측 요약 (Measured)

| 항목 | 값 |
|---|---|
| customers 레코드 | 858 |
| ledger 행 | 5,576 — **전부 `kind='payment'`** |
| refund / correction / expense 행 | **0건** |
| audit_events 행 | 6,435 (JSON 2,079,962 bytes) |
| occurred_at 범위 | 2020-02-18 ~ 2026-08-03 |
| 데이터 존재 일자 수 | 1,662 |
| 모든 ledger 행 시각부 | 정확히 `12:00:00.000Z` |
| 연도별 총액 | 2020 43.2M · 2021 61.6M · 2022 45.8M · 2023 33.6M · 2024 35.6M · 2025 46.2M · 2026 25.7M |
| 2026년 8월 행 | 11건 (8/1, 8/2, 8/3만 존재) |

`Inferred` — 환불·정정·지출이 0건이므로 정산 표의 환불/지출 행은 실데이터에서 항상 0이다. 관련 코드 결함(§A3-4)은 실재하나 현재 데이터에서는 잠복 상태다.

---

## A1. 정보 구조(IA)와 반복 작업 동선

| # | 문제 | 근거 | 등급 |
|---|---|---|---|
| A1-1 | **뷰 탭이 두 곳에서 다르게 렌더링된다.** `revenue-dashboard.tsx:329`는 `["day","week","month","total"]` 4개, `sales-controls.tsx:27`은 `["day","month","total"]` 3개. 같은 화면군에서 "주별"이 있다 없다 한다. | 파일 직접 확인 | Observed |
| A1-2 | 매출 화면의 1차 네비(매출 분석/결제 등록/지출·정산)와 2차 네비(일별/주별/월별/누적)가 **시각적으로 같은 위계**로 보인다. 스크린샷 1280에서 두 줄 모두 같은 pill 형태·같은 크기. | `baseline-sales-1280.png` | Observed |
| A1-3 | 원장의 반복 작업 진입점(결제 등록)이 화면 상단 2차 탭에 묻혀 있다. 첫 화면 진입 시 가장 큰 시각 요소는 KPI 5칸이고, 다음 행동 유도 요소는 없다. | 스크린샷 | Observed |
| A1-4 | 매출 화면에 **동일 숫자가 두 번** 나온다. KPI 스트립(총 매출/실결제/VAT/지출/샵 수익)과 하단 "정산" 표가 같은 5개 값을 반복. `revenue-dashboard.tsx:367-371`이 `analytics.settlement` 배열에서 문자열 키로 뽑아 KPI를 만든다. | 코드 + 스크린샷 | Observed |
| A1-5 | 사이드바 영업시간 표기 "09:00–20:00"이 `lib/booking.ts:46-47`의 실제 기본값 "09:30"/"21:00"과 불일치. | 스크린샷 + 코드 | Observed |
| A1-6 | 거래 드릴다운(`/sales/transactions`)이 별도 라우트라 차트 클릭 시 전체 페이지 전환이 일어난다. | `app/sales/transactions/page.tsx` | Observed |

---

## A2. 차트·시각화 (§10 대조)

사용자가 제거 대상으로 지목한 항목을 **실제 코드와 대조한 결과**:

| 사용자 지목 | 현행 실태 | 등급 |
|---|---|---|
| 남녀 비율 차트 | **존재하지 않는다.** `gender` 필드는 `RevenueTransaction`에 있으나(`revenue-analytics.ts`) 어떤 차트도 이를 쓰지 않는다. | Observed |
| 총 매출 막대 1개 차트 | 단일 막대 전용 차트는 없다. 다만 아래 두 카드가 **사실상 단일값 차트로 렌더링되고 있다**. | Observed |

실제로 관측된 단일값 차트:

| # | 문제 | 근거 | 등급 |
|---|---|---|---|
| A2-1 | "시술 카테고리" 카드가 **행 1개**만 그린다 — `미분류 11건 · ₩362,000 · 100%`. 100% 막대 하나는 정보량 0. 원인: 실데이터의 `serviceMajor`가 전부 비어 `"기타"`/`"미분류"`로 폴백(`revenue-data.ts:24`). | 스크린샷 + 코드 | Observed |
| A2-2 | "결제 수단" 카드도 **행 1개** — `기타 100% ₩362,000`. 원인: `details.paymentMethods`가 마이그레이션 데이터에 없어 `paymentAmounts()`가 빈 객체를 반환(`revenue-data.ts:14,25`). | 스크린샷 + 코드 | Observed |
| A2-3 | **"일별 추이"는 차트가 아니다.** `revenue-dashboard.tsx:384-395`는 `analytics.trend`를 그대로 도는 `<button>` 목록이다. 축도, 선도, 막대도 없다. | 코드 | Observed |
| A2-4 | **달력 축이 없다.** `revenue-data.ts:69` `const dates = [...new Set(transactions.map(r => r.date))].sort()` — 데이터가 있는 날짜만 축이 된다. 2026-08 뷰는 8/1·8/2·8/3 3점만 표시하고 8/4·8/5·8/6은 **사라진다**. 실제 0원과 데이터 없음이 구분 불가능하다. 사용자 사양 §11.2 정면 위반. | 코드 + 실측(monthTrendPoints=3) | Measured |
| A2-5 | 월별 차트(1~12월)와 연도별 차트가 **아예 없다**. 사양 §11.1·§11.3 미구현. | 코드 | Observed |
| A2-6 | 진행 중 기간 표시가 없다. DESIGN.md §3.4가 이미 "미확정 일자는 별도 색이 아니라 '진행 중' 라벨로 구분한다"고 규정했으나 구현에 존재하지 않는다. | DESIGN.md + 코드 | Observed |
| A2-7 | 하드코딩 색상. `revenue-dashboard.tsx:100` `barFills = ["#0d3a33", "rgba(47,107,79,...)"...]` — 토큰 우회. | 코드 | Observed |

---

## A3. 매출 계산·데이터 정합성

| # | 문제 | 근거 | 등급 |
|---|---|---|---|
| A3-1 | **프론트가 돈 계산을 한다.** `buildRevenueAnalytics`(`lib/revenue-data.ts:65-90`)가 5,576행 전체를 in-process로 합산한다. 사양 §14가 요구하는 "서버 권위 집계"가 없다. | 코드 | Observed |
| A3-2 | 같은 스캔을 3번 한다. `revenue-data.ts:66-68`이 `filterRevenueTransactions`를 조회범위·오늘일·오늘월에 대해 각각 호출, 매번 전체 배열 순회. | 코드 | Observed |
| A3-3 | `trend` 계산이 O(날짜수 × 행수). `revenue-data.ts:82`가 각 날짜마다 `transactions.filter(...)`를 **두 번** 돈다. 누적 뷰에서 1,662 × 5,576 × 2. | 코드 | Observed |
| A3-4 | `revenue-query.ts:68` — **유효한 `view`가 유효한 `cursor` 없이는 조용히 버려진다.** `?view=total` 단독 요청이 월별 뷰로 렌더링된다. | 코드 + HTTP 실측 | Observed |
| A3-5 | 누적 뷰 범위가 `0000-01-01`~`9999-12-31` 하드코딩(`revenue-query.ts`). | 코드 | Observed |
| A3-6 | `gross`가 `grossWon ?? amountWon` 폴백(`revenue-data.ts:27`). 총매출과 실결제가 구조적으로 같아질 수 있다. 실제 화면에서 총매출 ₩362,000 = 실결제 ₩362,000. | 코드 + 스크린샷 | Observed |
| A3-7 | 커서 산술은 UTC(`setUTCDate`/`setUTCMonth`), 거래일 판정은 서울 기준(`seoulBusinessDate`). 두 시간 규약이 한 경로에 섞여 있다. 현재 데이터는 전부 `12:00:00Z`라 경계 오류가 드러나지 않는다. | 코드 + 데이터 실측 | Observed(코드) / Hypothesis(실사용 영향) |
| A3-8 | 정산 표와 KPI가 문자열 키(`"총 매출"`)로 결합되어 있다(`revenue-dashboard.tsx:367-371`). 라벨을 바꾸면 KPI가 0이 된다. | 코드 | Observed |

---

## A4. 성능 (요약 — 상세는 산출물 D)

| # | 문제 | 근거 | 등급 |
|---|---|---|---|
| A4-1 | **`ledger.occurred_at`에 인덱스가 없다.** `lib/salon-store.ts:192`의 유일한 비자동 인덱스는 `ledger_one_reversal_per_original`. `listLedger()`(`:404`)는 `SELECT * FROM ledger ORDER BY occurred_at, rowid` — 술어 없는 전체 스캔 + 정렬. | 스키마 직접 확인 | Observed |
| A4-2 | `snapshot()`(`:424-433`)이 **audit_events 6,435행 / 2.08MB를 포함한 전체 DB**를 반환한다. `app/sales/page.tsx:18`이 매 요청마다 호출. 매출 화면은 audit_events를 쓰지 않는다. | 코드 + 실측 | Measured |
| A4-3 | 누적 뷰 프로덕션 응답 **1,843ms / 3,934KB**, DOM load 4,525ms 중 **TTFB 3,665ms**, DOM 노드 10,381, tabbable 1,697. | HTTP + Navigation Timing | Measured |
| A4-4 | 동일 월별 집계를 SQL `GROUP BY substr(occurred_at,1,7)`로 하면 **5.2ms / 280 bytes**. 현행 in-process 경로는 누적 998.1ms / 1,788,664 bytes. 약 200배 차이. | 벤치 | Measured |
| A4-5 | **CSV data URL을 매 렌더 직렬화한다.** `revenue-dashboard.tsx:217` — 메모 없음. 누적 뷰에서 5,576행 CSV를 렌더마다 생성·URI 인코딩. | 코드 | Observed |
| A4-6 | `/customers` DOM 노드 10,920 / tabbable 2,625, load 1,539ms. 858 고객 × 전 행 렌더. 매출과 **별개**의 DOM 문제. | Measured |
| A4-7 | `/` (운영 현황) tabbable **887개**. 키보드 사용자가 사이드바를 통과하는 데만 다수의 탭이 필요. | Measured |

**병목 판정 (Measured, 기존 Hypothesis에서 격상):** 느린 경로에서 TTFB가 전체 로드의 대부분을 차지한다(누적 3,665/4,525ms, 고객 745/1,539ms). 따라서 병목은 **서버 집계 + 페이로드**이지 클라이언트 차트 렌더링이 아니다. → `/sales`에 대한 가상화는 이 데이터로는 정당화되지 않는다. `/customers`는 별건으로 DOM 중심 문제다.

---

## A5. 접근성·디자인 시스템

| # | 문제 | 근거 | 등급 |
|---|---|---|---|
| A5-1 | `revenue-dashboard.tsx:23` `rounded-[14px]` — 승인된 반경 4종(`--radius-chip 4` / `--radius-control 9` / `--radius-card 12`) 밖의 값. | 코드 | Observed |
| A5-2 | `revenue-dashboard.tsx:261` `<span aria-hidden className="text-[var(--accent)]">│</span>` — 장식용 골드. DESIGN.md §4.1은 화면당 골드 의미 **2개**(now-line, 정정 마커)로 제한. 이것은 세 번째 용도. | 코드 + DESIGN.md | Observed |
| A5-3 | `revenue-dashboard.tsx:290` `window.print()`에 **매출 전용 인쇄 스타일시트가 없다.** `app/globals.css:127-152` 인쇄 블록은 `.customer-print`만 다룬다. 매출 화면에는 `.no-print` 클래스조차 없어 사이드바·버튼이 그대로 인쇄된다. FUNCTION.md "매출 내역 인쇄"·"계정/매출 출력"이 커버리지상 구현으로 표기되어 있으나 실효성이 없다. | 코드 + grep | Observed |
| A5-4 | 차트 클릭 대상이 `<button>`이라 키보드 접근은 되지만, "일별 추이" 목록은 시각적 차트가 아니라 **어떤 값이 큰지 스캔이 불가능**하다. | 스크린샷 | Observed |
| A5-5 | 좋은 점 — `DataTable`의 sr-only 미러 테이블(`revenue-dashboard.tsx:157-177`)은 스크린리더 대안 텍스트를 정확히 제공한다. **재설계에서 반드시 보존한다.** | 코드 | Observed |
| A5-6 | 좋은 점 — `usePrefersReducedMotion`(`:42-53`)이 `useSyncExternalStore` 서버 스냅샷 `true`로 구현되어 SSR에서 모션 없음이 기본. **보존한다.** | 코드 | Observed |

---

## A6. 보안 (범위 외이나 기록)

| # | 문제 | 근거 | 등급 |
|---|---|---|---|
| A6-1 | `lib/auth.ts:5` `export const DEMO_OWNER_PASSWORD = "952200";` — 트리에 하드코딩된 자격증명. `:34`가 `NODE_ENV !== "production"`으로 게이트하므로 프로덕션 빌드에서는 비활성이다. 위험은 낮으나 PRODUCT.md의 "로그인 자격증명 하드코딩 금지" 원칙과 충돌한다. | 코드 | Observed |

---

## A7. 우선순위

```
P0  A2-4 달력 축 없음 (숫자가 사라진다 — 금액 신뢰성 문제)
P0  A3-1 프론트 집계 (§14 위반, A4의 근본 원인)
P0  A4-1/A4-2 인덱스 없음 + 전체 스냅샷 (TTFB 3.6초의 근본 원인)
P1  A2-5 월별·연도별 차트 미존재
P1  A1-1 탭 목록 불일치
P1  A5-3 인쇄 실효성 없음
P2  A2-1/A2-2 단일값 차트
P2  A1-4 KPI/정산 중복
P2  A3-4 view 무시 버그
P3  A5-1/A5-2 반경·골드 토큰 위반 (impeccable 단계)
P3  A4-6 /customers DOM (별도 과제)
```
