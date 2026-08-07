# 산출물 F — 서버 매출 집계 설계

원칙 (사용자 사양 §14, PRODUCT.md "서버가 진실이다"): **서버가 모든 금액 계산을 소유한다.** KPI · 세 차트 · 상세 표 · CSV · 인쇄가 **같은 집계 결과**를 소비한다. 프론트는 독립적으로 거래를 합산하지 않는다.

---

## F1. 타입

```ts
// lib/revenue-aggregate.ts (신규)

export type RevenueGranularity = "daily" | "monthly" | "yearly";

/** 축 위 한 구간. 데이터가 없어도 구간은 존재한다. */
export type RevenueAggregatePoint = {
  /** daily: "2026-08-04" · monthly: "2026-08" · yearly: "2026" */
  readonly key: string;
  /** 축 라벨. daily: "4" · monthly: "8월" · yearly: "2026" */
  readonly label: string;
  /** 총 매출 = SUM(gross_won). 데이터 없음이면 null (0과 구분) */
  readonly gross: number | null;
  /** 실결제 = SUM(amount_won), 지출 제외 */
  readonly netPaid: number | null;
  /** 샵 수익 = SUM(profit_won) */
  readonly profit: number | null;
  /** 거래 건수. 데이터 없음이면 0 */
  readonly count: number;
  readonly state: RevenuePointState;
  /** 직전 구간 대비 %. 계산 불가면 null */
  readonly deltaPrevious: number | null;
  /** 전년 동일 구간 대비 %. daily에는 없음 */
  readonly deltaYearOverYear: number | null;
  /** 이 구간에 정정/환불 행이 있는가 */
  readonly hasCorrection: boolean;
};

/** §18 상태 구분 */
export type RevenuePointState =
  | "actual"      // 거래 있음
  | "zero"        // 거래 0건이나 기간은 지났음 = 실제 0원
  | "missing"     // 데이터 없음
  | "future"      // 미래 기간
  | "in-progress" // 진행 중 (오늘/이번 달/올해)
  | "error";      // 집계 실패

/** 선택 기간 전체 요약. KPI와 정산 표의 유일한 출처. */
export type RevenueSummary = {
  readonly period: { readonly start: string; readonly end: string; readonly label: string };
  readonly gross: number;
  readonly discount: number;
  readonly points: number;
  readonly netPaid: number;
  readonly refunds: number;
  readonly vat: number;
  readonly fee: number;
  readonly expense: number;
  readonly profit: number;
  readonly count: number;
  /** 직전 동일 길이 기간 대비 % */
  readonly deltaPrevious: number | null;
};

export type RevenueAggregate = {
  readonly granularity: RevenueGranularity;
  readonly points: readonly RevenueAggregatePoint[];
  readonly summary: RevenueSummary;
};
```

**`gross: number | null`이 핵심이다.** `null` = 데이터 없음, `0` = 실제 0원. 현행 구조는 이 구분이 불가능하다 (A2-4).

---

## F2. 인덱스

```sql
CREATE INDEX IF NOT EXISTS ledger_occurred_at ON ledger(occurred_at);
```

`lib/salon-store.ts`의 `CREATE TABLE` 블록 뒤에 추가. `IF NOT EXISTS`이므로 기존 DB에도 안전하게 적용된다. 마이그레이션 파일 불필요.

근거: A4-1 — 현재 `occurred_at`에 인덱스가 없고, 도입할 집계 쿼리는 전부 `occurred_at` 범위 술어를 쓴다.

---

## F3. 쿼리

`lib/salon-store.ts`에 메서드 추가. **시간대 규약을 SQL 한 곳에 고정한다** (C3의 UTC/서울 혼용 결함 회피):

**시간대 규약 (정정됨 — `Measured`):**

`lib/seoul-date.ts:seoulBusinessDate`는 단순 서울 캘린더 날짜가 **아니다.** 서울 시각이 09:00 미만이면 하루를 뺀다 (영업일 경계).

```ts
return isoDate(year, month, day, hour < 9 ? -1 : 0);
```

서울 = UTC+9이고 영업일이 서울 09:00에 시작하므로 **+9시간 이동과 −9시간 컷오프가 서로 상쇄된다.** 즉 영업일 = `occurred_at`의 UTC 캘린더 날짜다.

```
서울 08:59 (= UTC 전날 23:59) → 영업일 = 전날    = UTC 날짜 ✓
서울 09:00 (= UTC 당일 00:00) → 영업일 = 당일    = UTC 날짜 ✓
```

따라서 올바른 SQLite 식은 `date(occurred_at, '+9 hours')`가 **아니라** 다음이다:

```ts
/** occurred_at(UTC ISO) → 영업일. seoulBusinessDate와 항등. */
const SEOUL_DATE = "substr(occurred_at, 1, 10)";
```

이 항등성은 실 ledger 5,576행 전부 + 경계 시각 합성 케이스로 검증했다 (`Measured`, 2026-08-06). `date()` 대신 `substr()`을 쓰면 `occurred_at` 인덱스의 접두 비교가 그대로 살아 있고 함수 호출도 없다.

```ts
aggregateLedger(start: string, endExclusive: string, unit: "day" | "month" | "year") {
  const expr = unit === "day"   ? SEOUL_DATE
             : unit === "month" ? "substr(occurred_at, 1, 7)"
             :                    "substr(occurred_at, 1, 4)";
  return this.db.prepare(`
    SELECT ${expr} AS key,
           SUM(gross_won)   AS gross,
           SUM(CASE WHEN kind != 'expense' THEN amount_won ELSE 0 END) AS net_paid,
           SUM(profit_won)  AS profit,
           COUNT(*)         AS count,
           SUM(CASE WHEN kind IN ('refund','correction') THEN 1 ELSE 0 END) AS corrections
    FROM ledger
    WHERE occurred_at >= ? AND occurred_at < ?
    GROUP BY key ORDER BY key
  `).all(start, endExclusive);
}
```

`endExclusive` — 반열린 구간 `[start, end)`. 현행 `revenueRange`의 `end` 포함 비교(`record.date <= range.end`)와 달리 경계 중복이 구조적으로 불가능하다.

정산 요약도 같은 술어로 한 번에:

```ts
summarizeLedger(start, endExclusive) {
  return this.db.prepare(`
    SELECT SUM(gross_won) gross, SUM(discount_won) discount,
           SUM(vat_won) vat, SUM(fee_won) fee, SUM(expense_won) expense,
           SUM(profit_won) profit, COUNT(*) count,
           SUM(CASE WHEN kind != 'expense' THEN amount_won ELSE 0 END) net_paid,
           SUM(CASE WHEN kind = 'refund'  THEN amount_won ELSE 0 END) refunds
    FROM ledger WHERE occurred_at >= ? AND occurred_at < ?
  `).get(start, endExclusive);
}
```

**측정 근거:** 동등 쿼리가 월별 5.2ms / 280 bytes, 일별 3.0ms, 연도별 4.2ms (D5). 현행 인프로세스 누적 경로는 998.1ms / 1,788,664 bytes.

---

## F4. 축 채우기

SQL은 **데이터가 있는 구간만** 반환한다. 축 전체를 만드는 것은 TS 쪽 책임이다.

```ts
// lib/revenue-aggregate.ts
export function buildAggregate(
  rows: readonly AggregateRow[],
  granularity: RevenueGranularity,
  axis: readonly string[],   // 채워진 전체 축 키 목록
  today: string,             // seoulBusinessDate()
): RevenueAggregate
```

축 생성 규칙:

| 단위 | 축 | 근거 |
|---|---|---|
| daily | 선택 월 1일 ~ 말일 **전부** | §11.2 — 없는 날짜를 만들지 않고 있는 날짜를 빼지 않는다 |
| monthly | 선택 연도 1월 ~ 12월 **전부** | §11.1 — 12개 고정 |
| yearly | **데이터가 있는 연도만**, 오름차순 | §11.3 — 빈 연도를 0으로 채우지 않는다 |

상태 판정:

```ts
function pointState(key: string, row: AggregateRow | undefined, today: string, unit): RevenuePointState {
  if (key > todayKey(today, unit)) return "future";
  if (key === todayKey(today, unit)) return "in-progress";
  return row ? "actual" : "zero";   // 기간이 지났는데 행이 없으면 실제 0원
}
```

**`"missing"`은 언제 쓰는가:** 과거 구간인데 원장이 아직 입력하지 않은 경우와 진짜 0원 영업일을 구분할 방법이 현재 데이터에 없다. `Requires verification`. 확정 전까지 과거 무거래 구간은 `"zero"`로 표기하고, UI에는 "거래 없음"으로 라벨한다. `"missing"` 상태는 타입에 남겨두되 사용하지 않는다.

델타:

```ts
delta(current, previous) =
  previous === null ? null      // 비교 대상 없음
  : previous === 0  ? null      // 0으로 나눌 수 없음 → UI에서 "신규"
  : Math.round(((current - previous) / previous) * 1000) / 10;
```

`Infinity` / `NaN`을 절대 반환하지 않는다.

---

## F5. snapshot 우회

현행 `app/sales/page.tsx:18`이 `store.snapshot()`을 부른다. 이는 audit_events 6,435행 / 2.08MB를 포함한다 (A4-2). 매출 화면은 이를 쓰지 않는다.

```ts
// app/sales/page.tsx
const aggregate = buildAggregate(store.aggregateLedger(...), ...);
const summary   = store.summarizeLedger(...);
const settings  = store.getSettings();          // snapshot() 대신
const customers = store.list("customers");      // 결제 폼 진입 시에만
```

거래 상세 표는 **선택 기간의 거래만** 가져온다:

```ts
listLedgerRange(start: string, endExclusive: string) {
  return this.db.prepare(
    "SELECT * FROM ledger WHERE occurred_at >= ? AND occurred_at < ? ORDER BY occurred_at, rowid"
  ).all(start, endExclusive);
}
```

이것이 `occurred_at` 인덱스가 필요한 두 번째 이유다.

---

## F6. 소비자 통일 (§14)

| 소비자 | 출처 | 프론트 계산 |
|---|---|---|
| KPI 스트립 | `RevenueSummary` 필드 직접 | 없음 |
| 월별 차트 | `RevenueAggregate(monthly)` | 없음 |
| 일별 차트 | `RevenueAggregate(daily)` | 없음 |
| 연도별 차트 | `RevenueAggregate(yearly)` | 없음 |
| 정산 표 | `RevenueSummary` 필드 직접 | 없음 |
| 결제 수단 / 시술 카테고리 카드 | 별도 `GROUP BY`, 선택 기간 거래만 | 없음 |
| 거래 상세 표 | `listLedgerRange` | 없음 |
| CSV | 상세 표와 **동일 배열**, `useMemo` | 직렬화만 |
| 인쇄 | 같은 DOM에 `@media print` | 없음 |

**항등식:** `sum(points.map(p => p.gross ?? 0)) === summary.gross`. 두 값이 다른 쿼리에서 나오므로 반드시 테스트한다 (산출물 G §G6).

CSV는 현행 `revenue-dashboard.tsx:217`의 매 렌더 data URL 생성을 `useMemo`로 감싼다 (A4-5). 상세 표가 선택 기간으로 제한되므로 최악의 경우도 5,576행이 아니라 한 달치다.

---

## F7. 범위 계산

```ts
// components/sales/revenue-query.ts 확장
export type RevenueView = "day" | "week" | "month" | "year" | "total";

/** [start, endExclusive) — 반열린 구간. 서울 날짜 기준. */
export function revenueRangeExclusive(query: RevenueQuery): {
  start: string; endExclusive: string; label: string;
};
```

현행 `revenueRange`는 호환을 위해 남긴다 (`/sales/transactions`가 쓴다). 새 경로는 `revenueRangeExclusive`를 쓴다.

`view=total`의 `0000-01-01`~`9999-12-31` 하드코딩(A3-5)은 `SELECT MIN/MAX(occurred_at) FROM ledger`로 교체. 실측 범위는 2020-02-18 ~ 2026-08-03.

`revenue-query.ts:68`의 "커서 없으면 view 무시" 버그(A3-4)도 함께 수정:

```ts
// 현행: view와 cursor가 둘 다 유효해야 채택
// 수정: view는 유효하면 채택, cursor만 개별 폴백
const safeView = view && views.has(view) ? view : defaults.view;
const safeCursor = isDate(cursor) ? cursor : currentSeoulDate;
```

---

## F8. 캐싱

**하지 않는다.** 측정된 쿼리 시간이 3~5ms다. 캐시 무효화 복잡도가 이득보다 크다.

`Requires verification` — 원장 수년 후 ledger가 5만 행을 넘으면 재측정한다. 인덱스가 있으므로 범위 쿼리는 선형이 아니다.

---

## F9. 리스크

| 리스크 | 완화 |
|---|---|
| ~~SQLite `date(occurred_at, '+9 hours')`가 TS `seoulBusinessDate`와 다른 날짜를 낼 수 있다~~ **해소됨** | `substr(occurred_at,1,10)`이 `seoulBusinessDate`와 항등임을 실 ledger 전 행 + 경계 합성 케이스로 검증 (`Measured` 2026-08-06). 회귀 테스트는 G6에 유지 |
| `revenueRange`(포함) → `revenueRangeExclusive`(반열림) 전환 중 경계 거래 누락 | 두 함수가 같은 집합을 선택하는지 테스트. 기존 함수는 남긴다 |
| `snapshot()` 우회 시 settings/customers 누락 | 각 라우트가 실제로 쓰는 것만 명시적으로 조회. 타입이 강제 |
| `gross: null` 도입으로 기존 소비자 깨짐 | 새 타입은 신규 파일. 기존 `RevenueAnalytics`는 그대로 두고 단계적 전환 (산출물 G) |
