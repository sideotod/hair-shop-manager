# 매출 분석 구현 계획

작성 2026-08-12 · 스펙: [`docs/design/salon-sales-analytics-redesign-spec.md`](../design/salon-sales-analytics-redesign-spec.md)

---

## 정확히 수정할 파일

| 파일 | 성격 | 내용 |
|---|---|---|
| `lib/salon-domain.ts` | 수정 | `LedgerWeekdayRow` · `LedgerHourRow` · `LedgerCustomerMix` 타입 추가, `SalonStore` 에 메서드 3개 선언 |
| `lib/salon-store.ts` | 수정 | `weekdayLedger` · `hourLedger` · `customerMixLedger` 구현 (SQL 집계) |
| `lib/salon-briefing.ts` | **신규** | 문장 생성 · 방문 분포 · 고객 구성. 순수 함수만 |
| `lib/salon-briefing.test.ts` | **신규** | 위의 규칙을 고정하는 테스트 |
| `app/(shell)/sales/page.tsx` | 수정 | 서버에서 briefing 조립, 부분 기간 비교 계산 |
| `components/sales/revenue-dashboard.tsx` | 수정 | 브리핑 머리글 · KPI 5→4 · 패턴 카드 2 · 고객 카드 1 |
| `components/sales/revenue-dashboard.test.tsx` | 수정 | 브리핑 렌더 검증 추가 |
| `app/globals.css` | 수정 | Playwright 산출물 폴더를 Tailwind 소스에서 제외 |
| `scripts/seed-analytics-dummy.sql` / `.mjs` | **신규** | 비어 있는 분석 칸을 채우는 더미 (금액 불변) |

**건드리지 않는 것**: SQL 스키마, `lib/revenue-aggregate.ts` 의 `delta()`,
`components/sales/revenue-query.ts`, 차트 컴포넌트 두 개, 예약·고객·문자·운영 화면.

## 생성할 component

전부 `revenue-dashboard.tsx` 안의 파일 지역 컴포넌트다. 새 파일을 만들지 않는다 —
이 셋은 이 화면 밖에서 쓰이지 않고, 밖으로 빼면 prop 타입만 늘고 읽을 곳이 흩어진다.

- `BriefingHeadline` — 문장 + 근거 한 줄
- `PatternCard` — 요일/시간 공용. 문장 먼저, 막대는 근거
- `CustomerCard` — 누가 왔나 5행 표

## API

새 라우트 없음. RSC 서버 컴포넌트가 직접 store 를 읽는다.
`RevenueDashboard` 의 prop 에 `briefing?: RevenueBriefing` 하나만 추가한다 (optional —
없으면 기존 화면 그대로 선다).

## Transformation

```
SQL 집계 (store)                     순수 변환 (salon-briefing)        화면
────────────────────────────────────────────────────────────────────────────
summarizeLedger(period)         →   revenueBriefing()              →  문장 + KPI
summarizeLedger(previous 잘린것) →   (deltaPrevious 로 주입)
weekdayLedger(period)           →   weekdayPattern() + headline    →  요일 카드
hourLedger(period)              →   hourPattern() + headline       →  시간 카드
customerMixLedger(period)       →   customerBriefing()             →  고객 카드
```

프런트는 어느 단계에서도 원장 행을 다시 합산하지 않는다.

## 부분 기간 비교 (핵심 로직)

```ts
const inProgress = businessToday >= period.start && businessToday < period.endExclusive;
const elapsedDays = inProgress ? dayAxis(period.start, businessToday).length + 1 : 0;
const previousComparable = previous && inProgress
  ? { start: previous.start, endExclusive: minDate(shiftDays(previous.start, elapsedDays), previous.endExclusive) }
  : previous;
```

`minDate` 로 자르는 이유: 8월 31일에 8월을 볼 때 `elapsedDays = 31` 이면 7월 창이
7/1~8/1 이 되어 지난달 밖으로 새어 나간다. 원래 끝을 넘지 못하게 막는다.

## 검증 순서

1. `tsc --noEmit`
2. `vitest run` (전체)
3. Playwright: 1440 · 1280 · 768 · 375 오버플로
4. Playwright: 진행 중인 달 / 지난 달 / 빈 기간(2019-01) 세 상태
5. Playwright: Tab 40스톱 포커스 링
6. Playwright: `prefers-reduced-motion`
7. Playwright: 사이드바·기간 버튼이 full reload 없이 전환되는지
8. impeccable 패스 후 3~7 재실행

## 롤백

`briefing` prop 이 optional 이므로, 서버에서 넘기지 않으면 이전 화면 구조로 돌아간다.
KPI 4칸과 카드 3장만 되돌리면 되고, store 메서드 3개는 남아도 해가 없다.
