# 산출물 G — 단계적 구현 계획

원칙: 각 단계는 **독립적으로 배포 가능**하고, 기존 기능을 깨지 않으며, 테스트를 남긴다. `impeccable`은 맨 마지막이며 승인된 IA를 재논의하지 않는다.

---

## G1. 기반 — 서버 집계 (코드 변경 있음, UI 변경 없음)

| 파일 | 변경 |
|---|---|
| `lib/salon-store.ts` | `CREATE INDEX IF NOT EXISTS ledger_occurred_at ON ledger(occurred_at)` 추가. `aggregateLedger()`, `summarizeLedger()`, `listLedgerRange()` 메서드 추가 |
| `lib/revenue-aggregate.ts` | **신규.** F1 타입 + `buildAggregate()` 축 채우기 + 델타 계산 |
| `components/sales/revenue-query.ts` | `view=year` 추가, `revenueRangeExclusive()` 추가, A3-4 커서 버그 수정 |
| `lib/revenue-aggregate.test.ts` | **신규.** 축 채우기, 상태 판정, 델타 경계(0으로 나누기, null) |

기존 `lib/revenue-data.ts`와 `RevenueAnalytics`는 **건드리지 않는다.** 화면은 아직 이전 경로를 쓴다.

검증: `npx vitest run` 전부 통과. UI 무변경이므로 Playwright 불필요.

---

## G2. 월별 차트 (§11.1)

| 파일 | 변경 |
|---|---|
| `components/sales/revenue-month-chart.tsx` | **신규.** 12개 세로 막대, MoM/YoY, 상태 라벨, sr-only 미러 테이블 |
| `app/sales/page.tsx` | `view=year`일 때 `aggregateLedger(..., "month")` 호출 후 렌더 |
| `components/sales/sales-controls.tsx` | 뷰 목록에 "연도" 추가 → A1-1 불일치 해소 |
| `components/sales/revenue-dashboard.tsx` | 탭 목록을 `sales-controls`와 동일하게 정렬 |

- 12개월 순서 고정, 금액 정렬 금지 (테스트)
- `deltaPrevious === null`일 때 "신규" 렌더, `Infinity` 출력 없음 (테스트)
- 막대 클릭 → `/sales?view=month&cursor=YYYY-MM-01`

검증: 단위 테스트 + Playwright 1440/1280 스크린샷.

---

## G3. 일별 차트 (§11.2) — 최우선 결함 수정

| 파일 | 변경 |
|---|---|
| `components/sales/revenue-day-chart.tsx` | **신규.** 1일~말일 전체 축, 선 차트, 상태 구분, sr-only 미러 |
| `components/sales/revenue-dashboard.tsx` | `:384-395` 목록을 이 차트로 교체. 전폭 1행으로 승격 (E1) |

**검증 필수 항목:**
- 2026-08 렌더 시 축이 **31점** (현행 3점 — A2-4)
- 8/4·8/5는 `zero`, 8/6은 `in-progress`, 8/7~8/31은 `future`
- 카드 헤더 총액 === 모든 점 합계
- 점 클릭 → `/sales/transactions?view=day&cursor=YYYY-MM-DD`

이 단계가 사용자가 지적한 "가장 보고 싶은 것이 가장 안 보인다"의 직접 해소다.

---

## G4. 연도별 차트 (§11.3)

| 파일 | 변경 |
|---|---|
| `components/sales/revenue-year-chart.tsx` | **신규.** 데이터 있는 연도만, 오름차순, YoY, 진행 중 라벨 |
| `app/sales/page.tsx` | 연도 뷰 배선 |

- 2020~2026 = 7개 막대 (실측)
- 2026은 "진행 중 · 8월까지", YoY **미표시**
- 막대 클릭 → 해당 연도 월별

---

## G5. KPI · 정산 · 카드 정리

| 파일 | 변경 | 해소 |
|---|---|---|
| `revenue-dashboard.tsx:367-371` | `settlement.find(name)` 문자열 결합 → `summary.gross` 등 명시 필드 | A3-8 |
| KPI 스트립 | 총 매출에만 전기간 대비 델타 추가 | E6 |
| 정산 표 | 9행 유지, KPI와 중복되는 시각적 강조만 축소 | A1-4 |
| "결제 수단" / "시술 카테고리" | 항목 1개일 때 100% 막대 대신 안내 텍스트 폴백 | A2-1, A2-2 |
| `:217` CSV | `useMemo` | A4-5 |
| `app/sales/page.tsx:18` | `snapshot()` → 필요한 것만 조회 | A4-2 |
| `revenue-dashboard.tsx` 상세 표 | `listLedgerRange` 사용 | A4-3 |

---

## G6. 테스트

```
lib/revenue-aggregate.test.ts
  ✓ daily 축이 그 달 전체 일수 (2월 28/29, 4월 30, 8월 31)
  ✓ monthly 축이 항상 12개, 1→12월 순서
  ✓ yearly 축은 데이터 있는 연도만, 오름차순
  ✓ 과거 무거래 구간 = "zero", 오늘 = "in-progress", 미래 = "future"
  ✓ 이전 값 0일 때 델타 null (Infinity 아님)
  ✓ 이전 값 없을 때 델타 null (NaN 아님)
  ✓ sum(points.gross ?? 0) === summary.gross            ← 항등식
  ✓ 월별 12개 합 === 그 해 연도별 값                     ← 항등식
  ✓ 일별 합 === 그 달 월별 값                            ← 항등식
  ✓ SQLite substr(occurred_at,1,10) === seoulBusinessDate() (실 ledger 전 행 + 경계 합성)
  ✓ revenueRange 포함 구간 === revenueRangeExclusive 반열린 구간 (같은 집합)

components/sales/revenue-day-chart.test.tsx
  ✓ 2026-08 렌더 시 31개 x축 라벨
  ✓ 거래 없는 과거 날짜에 "거래 없음", 미래에 점 없음
  ✓ 오늘 점에 "진행 중" 텍스트 라벨 (색 아님)
  ✓ sr-only 테이블이 모든 점을 포함

components/sales/revenue-month-chart.test.tsx
  ✓ 금액 내림차순으로 재정렬되지 않음
  ✓ MoM 부호와 라벨

components/sales/revenue-query.test.ts (기존 확장)
  ✓ ?view=total 단독(커서 없음)이 total로 해석됨      ← A3-4 회귀 테스트
```

`lib/function-coverage.test.ts`는 손대지 않는다. 263행 계약이 그대로 통과해야 한다.

---

## G7. 인쇄 (A5-3)

| 파일 | 변경 |
|---|---|
| `app/globals.css` | `@media print` 블록에 매출 규칙 추가 — 사이드바·버튼·탭 숨김, 차트를 sr-only 테이블로 대체 |
| `revenue-dashboard.tsx` | 인쇄 제외 요소에 `.no-print` 부여 |

현재 `window.print()`는 사이드바까지 그대로 인쇄한다. FUNCTION.md "매출 내역 인쇄" / "계정/매출 출력"이 실효를 갖게 된다.

---

## G8. Playwright 검증

각 UI 단계(G2·G3·G4·G5·G7) 후:

| 뷰포트 | 확인 |
|---|---|
| 1440×900 | 오버플로, 정렬, 차트 가독성, 포커스 링, 키보드 탐색 |
| 1280×800 | 주 차트 전폭 유지, 하단 2열 유지, 가로 스크롤 없음 |

상태 확인: 데이터 없는 달, 미래 달, 진행 중 달, 정정 있는 날, `prefers-reduced-motion`.

**한 라운드에 3개 이슈 그룹까지만 수정** (CLAUDE.md §9).

---

## G9. 재측정

D8의 표를 동일 조건(`next build` + :3100 + 인증 + 3회 중앙값)으로 다시 채운다.

```
                              현행              목표
/sales?view=month             413ms / 75KB      < 300ms
/sales?view=total            1843ms / 3934KB    < 400ms / < 200KB
/sales 누적 DOM 노드          10,381            < 2,000
buildRevenueAnalytics(total)  998.1ms           제거
```

**측정 전에 "빨라졌다"고 말하지 않는다.**

---

## G10. 정리 (`lib/revenue-data.ts` 폐기)

G1~G5 완료 후, `buildRevenueAnalytics`의 마지막 소비자가 사라지면 제거한다. **그 전에는 제거하지 않는다** — `/sales/transactions`가 `filterRevenueSelection` / `buildRevenueTransactions`를 쓴다.

---

## G11. impeccable (마지막)

승인된 IA·차트 유형·데이터 정의를 **재논의하지 않는다.** 화장 수준만:

- `rounded-[14px]` → `--radius-card` (A5-1)
- `barFills` 하드코딩 hex 제거 (A2-7)
- `:261` 장식용 골드 `│` 제거 (A5-2)
- 간격·타이포 리듬 정합
- 사이드바 영업시간 "09:00–20:00" vs 실제 기본값 불일치 (A1-5)

---

## G12. 범위 밖 (별건)

| 항목 | 근거 |
|---|---|
| `/customers` DOM 10,920 노드 / tabbable 2,625 | A4-6. 매출과 다른 문제(DOM 중심). 별도 과제 |
| `/` tabbable 887 | A4-7 |
| `lib/auth.ts:5` 하드코딩 데모 비밀번호 | A6-1. 프로덕션 빌드에서 비활성이나 보안 정책과 충돌. 사용자 결정 필요 |
| 마이그레이션 데이터의 빈 `serviceMajor` / `paymentMethods` | C5-2. 데이터 보정 과제 |

---

## G13. 순서 요약

```
G1 서버 집계 기반 (UI 무변경)
G3 일별 차트          ← 최우선. 사라지는 날짜 문제 직접 해소
G2 월별 차트
G4 연도별 차트
G5 KPI·정산·카드 정리 + snapshot 우회
G7 인쇄
G6 테스트 (각 단계마다 동반)
G8 Playwright (각 UI 단계 후)
G9 재측정
G10 revenue-data.ts 폐기
G11 impeccable
```

사용자 사양 §22는 월별 → 일별 순이나, **일별을 먼저 한다.** 근거: 일별이 유일하게 확인된 데이터 소실 결함(A2-4 — 8/4·8/5·8/6이 화면에서 사라짐)이고, 금액 신뢰성 문제는 신규 차트 추가보다 우선한다. 두 단계는 같은 G1 기반을 공유하므로 순서를 바꿔도 재작업이 없다.

---

## G14. 실행 결과 (2026-08-06)

| 단계 | 상태 | 결과 |
| --- | --- | --- |
| G1 서버 집계 | 완료 | `lib/revenue-aggregate.ts` + `salon-store` 범위 조회 |
| G3 일별 차트 | 완료 | §11.2. 실제 0원과 데이터 없음 구분, 월 합계 = 차트 합계 확인 |
| G2 월별 차트 | 완료 | §11.1. 1→12월 고정, MoM·YoY |
| G4 연도별 차트 | 완료 | §11.3. 데이터 있는 해만, 2026 "진행 중" |
| G5 KPI·정산 정리 | 완료 | `summary` 명시 필드 사용. 분석 경로에서 `snapshot()` 제거 |
| G7 인쇄 | 완료 | `@media print` + `[data-revenue-print]` |
| G6 테스트 | 완료 | 37개 파일 / 257개 테스트 통과, `tsc --noEmit` 무오류 |
| G8 Playwright | 완료 | 1440·1280 양쪽. §14 항등식 재확인 (D9) |
| G9 재측정 | 완료 | **D8 목표 4개 전부 달성 — D9 참조** |
| G10 정리 | 부분 완료 | 아래 참조 |
| G11 impeccable | 완료 | 아래 참조 |

### G9 결과 (Measured)

D8 표 4행 전부 목표 달성. 상세·방법론은 `D-performance-baseline.md` §D9.
합산 시간을 실제로 줄인 것은 페이로드 축소가 아니라 `lib/revenue-data.ts`의 단일 패스 `Map` 그룹핑이다.
두 변경 모두 필요했고 어느 한쪽만으로는 목표에 못 미쳤다.

### G10 결과 — 완전 제거가 아니라 `snapshot()` 의존 제거

`app/sales/transactions/page.tsx`가 마지막 `store.snapshot()` 호출자였다. 기간 조회로 교체했다:

```ts
const period = revenueRangeExclusive(query, store.ledgerBounds());
const matched = filterRevenueSelection(buildRevenueTransactions(store.listLedgerRange(period.start, period.endExclusive), store.list("customers")), …);
```

**`lib/revenue-data.ts`는 남긴다.** 세 곳(`app/sales/page.tsx`, `transactions/page.tsx`,
`revenue-csv/route.ts`)이 여전히 `buildRevenueTransactions` / `filterRevenueSelection`을 쓴다 —
이들은 원장 행을 표시용 행으로 옮기는 매핑이지 금액 산출이 아니다. §14가 금지하는 것은 프런트의 독립
합산이고, 그 부분(`buildRevenueAnalytics`의 합산)은 이미 서버 집계가 대체했다. 매핑까지 SQL로 옮기면
이득 없이 표시 로직만 흩어진다. "폐기"의 실질 목표는 달성됐다.

### G10에서 발견한 추가 병목 — 처리 완료

`/sales/transactions?view=total`이 5,576행을 표 하나에 실어 2,319ms / 19,700KB였다 (D2가 놓친 경로 —
D9-1 참조). 측정 후 `ROW_LIMIT = 300` 적용, **424ms / 1,126KB**. 잘린 사실은 세 곳에 표시한다.
회귀가 아니라 기존 결함이다.

### G11 결과 — 화장 수준만 (Measured)

| 항목 | 변경 | 검증 |
| --- | --- | --- |
| A2-7 `barFills` 하드코딩 hex | `#0d3a33` → `var(--brand)`, `rgba(47,107,79,α)` → `color-mix(in srgb, var(--success) N%, transparent)` | 브라우저에서 계산값 동일: `rgb(13, 58, 51)`, `color(srgb 0.184314 0.419608 0.309804 / 0.8)` = 기존 `rgba(47,107,79,0.8)`. 픽셀 변화 없음 |
| A5-2 장식용 골드 `│` | 제거 | `document.body.textContent.includes('│') === false` |
| A1-5 사이드바 영업시간 | `09:00–20:00` → `09:30–21:00` (`lib/booking.ts:46-47` 실제 기본값) | 렌더 확인: `● 영업중 09:30–21:00` |
| A5-1 `rounded-[14px]` | 해당 없음 — 코드베이스에 잔존 사용 0건 | `grep -rn "rounded-\[14px\]"` 무결과 |

골드 `│`를 지운 근거: DESIGN.md §4.1은 골드가 화면당 두 의미(진행 중 표시, 정정 표시)만 지도록 규정한다.
각주 앞 장식은 셋째 의미였다.

`barFills`가 실제 막대로 렌더되는 장면은 확인하지 못했다. 현재 DB의 모든 기간에서 시술 유형이
`미분류` 하나뿐이라 A2-2 폴백("이 기간의 유일한 유형입니다")이 대신 그려진다 — 이는 C5-2 마이그레이션
데이터 공백이지 이번 변경의 결함이 아니다. 대신 동일한 CSS 값을 브라우저에서 직접 계산시켜 대조했다.

회귀 없음 (G11 후 재측정): `/sales?view=month` 54ms / 112KB, `?view=total` 264ms / 200KB,
`/sales/transactions?view=total` 505ms / 1,126KB — 모두 D9 수치의 실행 편차 범위.
1440·1280 양쪽 `overflowX: false`, 테스트 37파일 / 257개 통과, `tsc --noEmit` 무오류.

### 남은 것

- G11 impeccable — `barFills` 하드코딩 hex(A2-7), 장식용 골드 `│`(A5-2), `rounded-[14px]`(A5-1), 사이드바 영업시간(A1-5) → 완료
- `/sales/transactions?view=total` 잔여 1,126KB의 RSC 페이로드 (Hypothesis, D9-1)
- `docs/function-coverage-matrix.md`의 CSV·인쇄 행을 `app/sales/revenue-csv/route.ts`로 재지정 (충실도 문제, 테스트는 통과 중)

