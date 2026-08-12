# 매출 분석 데이터 인벤토리

작성 2026-08-12 · 대상 `/sales` 매출 분석 화면

이 문서는 **화면을 만들기 전에** "무엇을 정직하게 보여줄 수 있는가"를 확정하기 위한 것이다.
근거는 전부 실제 DB(`.data/hairhaeyo.sqlite`)를 직접 조회한 값이다. 추정하지 않았다.

---

## 0. 사실 확인 방법

이 저장소에는 `.sql` 마이그레이션 파일이 없다. 스키마 정본은 `lib/salon-store.ts` 의 인라인 DDL
(`createSchema()`)이고, 실제 데이터는 SQLite 파일 하나다. 따라서 "DB Source" 열은 **테이블·컬럼**
또는 **`details` JSON 키**를 가리킨다.

측정 시점 원장: `ledger` 5,576행 (전부 `kind='payment'`), 2020-02-18 ~ 2026-08-03.
고객: `records(kind='customers')` 858행. 다른 `kind` 는 없다.

---

## 1. 스키마 (실측)

```sql
ledger(id, request_key, kind, occurred_at, correction_of, customer_id,
       gross_won, amount_won, discount_won, vat_won, fee_won, expense_won,
       incentive_won, points_won, coupon_won, profit_won, details)
records(kind, id, payload, created_at, updated_at, archived_at)
settings(id, payload, updated_at)
audit_events(id, occurred_at, actor, action, kind, record_id, payload)
```

`details` (payment 행)에 실제로 들어 있는 키:
`source · sourceMemberCode · customerName · operator · serviceRaw · serviceMajor ·
gender · visitType · vatMode · paymentMethods · pointsEarnedWon · sourceRow · sourceNote`

---

## 2. Metric Inventory

`UI 가능 여부` 는 세 가지다.

- **A** — DB에 그대로 있다. 그대로 읽으면 된다.
- **B** — 없지만 있는 값으로 **정확히** 계산된다.
- **C** — 계산할 수 없다. 화면에 만들지 않는다 (백로그로 보낸다).

| Metric | DB Source | Definition | Granularity | Nullable | UI 가능 여부 |
|---|---|---|---|---|---|
| 총 매출 | `ledger.gross_won` | `SUM(gross_won)`. 환불·정정은 부호가 뒤집힌 행이라 단순 합이 곧 순액이다 | 일·월·연·임의 기간 | 아니오 (0) | **A** |
| 실결제 | `ledger.amount_won` | `SUM(amount_won)` where `kind != 'expense'` | 〃 | 아니오 | **A** |
| 할인 | `ledger.discount_won` | `SUM(discount_won)` | 〃 | 아니오 | **A** — 단 실측 전 구간 합계 **0** |
| 포인트 사용 | `details.pointsUsedWon` → 없으면 `-points_won` | `lib/salon-store.ts:summarizeLedger` 와 `lib/revenue-data.ts:pointsUsed` 가 같은 규칙 | 〃 | 아니오 | **A** |
| VAT | `ledger.vat_won` | `SUM(vat_won)` | 〃 | 아니오 | **A** — 실측 합계 **0** (`vatMode` 가 행마다 달라 매출의 분해가 아니라 정산 한 줄로만 쓴다) |
| 결제 수수료 | `ledger.fee_won` | `SUM(fee_won)` | 〃 | 아니오 | **A** |
| 지출 | `ledger.expense_won` | `SUM(expense_won)` | 〃 | 아니오 | **A** — 실측 `kind='expense'` 행 **0개** |
| 샵 수익 | `ledger.profit_won` | `SUM(profit_won)` = 실결제 − VAT − 수수료 − 지출 (`lib/finance.ts:calculatePayment`) | 〃 | 아니오 | **A** |
| 결제 건수 | `ledger` | `COUNT(*)` | 〃 | 아니오 | **A** |
| 직전 기간 대비 | 위 값 2회 조회 | `(현재 − 직전) / 직전`. 직전이 `null` 또는 `0` 이면 **`null`** (`lib/revenue-aggregate.ts:delta`) | 〃 | **예** | **B** |
| 전년 동기 대비 | 〃 | 월·연 단위만. 일 단위는 계산하지 않는다 | 월·연 | 예 | **B** |
| 객단가 | `gross_won`, `COUNT(*)` | `SUM(gross_won) / COUNT(*)`. 건수 0이면 `null` | 〃 | 예 | **B** |
| 방문 수 | `ledger` | `COUNT(*)` where `kind != 'expense'` | 〃 | 아니오 | **B** |
| 다녀간 고객 수 | `ledger.customer_id` | `COUNT(DISTINCT customer_id)` | 〃 | 아니오 | **B** |
| 신규 고객 | `ledger.customer_id`, `occurred_at` | 고객별 `MIN(occurred_at)` 이 기간 안에 드는 수. **원장 전체**에서 처음이어야 한다 | 〃 | 아니오 | **B** |
| 재방문 고객 비중 | 위 두 값 | `(다녀간 − 신규) / 다녀간`. **코호트 재방문율이 아니다** | 〃 | 예 | **B** |
| 1인당 방문 횟수 | 〃 | `방문 수 / 다녀간 고객 수` | 〃 | 예 | **B** |
| 요일별 방문 | `occurred_at` | `strftime('%w', occurred_at)` 로 묶음. 서울 영업일 = UTC 달력일 (아래 §3) | 요일 | 아니오 | **B** |
| 시간대별 방문 | `occurred_at` | `strftime('%H', occurred_at, '+9 hours')` | 시각 | 아니오 | **B** — 단 원본은 전부 `12:00` (§4) |
| 결제 수단별 매출 | `details.paymentMethods` | 키별 금액 합 | 〃 | 예 | **B** — 원본은 전부 `other` (§4) |
| 시술별 매출 | `details.serviceMajor` | 값별 `SUM(gross_won)` | 〃 | 예 | **B** — 원본은 전부 `미분류` (§4) |
| 성별 매출 | `details.gender` | 값별 합. 실측 female 5,175 · male 287 · **null 114 (2.0%)** | 〃 | 예 | **B** — 미상 비중을 반드시 함께 표기해야 한다 |
| 담당자별 매출 | `details.operator` | 실측 서승애 5,462 · null 114. **사실상 1인 샵** | 〃 | 예 | **C (무의미)** |
| 연령대 | `records.customers.birthday` | — | — | — | **C** — 858명 전원 빈 문자열 |
| 예약 건수 / 노쇼 / 예약→방문 전환 | — | — | — | — | **C** — `records` 에 `bookings` kind 자체가 없다 |
| 시술 원가 · 재료비 | — | — | — | — | **C** — 원가 컬럼 없음. **이익률·순이익을 계산할 수 없다** |
| 선불권 잔액 / 이연 매출 | `paymentMethods.prepaid` | — | — | — | **C** — 잔액 원장이 없어 결제 시점과 매출 인식 시점을 구분할 수 없다 |
| 환불액 | `ledger.kind='refund'` | `SUM(amount_won)` where `kind='refund'` | 〃 | 아니오 | **A (경로는 있음)** — 실측 행 **0개** |
| 고객 등급별 매출 | `records.customers.grade` | — | — | — | **C** — 858명 중 **1명**만 채워져 있다 |

---

## 3. 시간 규약 (틀리면 하루가 밀린다)

- `occurred_at` 은 **참 시각 ISO(UTC)** 다.
- 서울은 UTC+9, 영업일은 서울 09:00 시작. 두 오프셋이 상쇄되어 **`substr(occurred_at,1,10)` 이 곧 영업일**이다
  (`lib/salon-store.ts:aggregateLedger` 주석과 동일).
- 그래서 날짜 묶기는 문자열 앞자리로 하고, **시간대 묶기만** `'+9 hours'` 를 더한다.
- 기간은 반열린 `[start, endExclusive)`. 화면 표시는 포함 끝(`revenueRange`)이므로 두 값을 섞으면 하루가 늘어 보인다.

---

## 4. 결정적 제약 — 원본 데이터가 비어 있다

가져온 원장(`source: hairnury`)은 **금액만 진짜고 분석용 칸이 비어 있다.**

| 칸 | 실측 |
|---|---|
| `details.serviceMajor` | 5,576행 **전부** `"미분류"` |
| `details.serviceRaw` | 5,576행 **전부** 빈 문자열 |
| `details.paymentMethods` | 5,576행 **전부** `{"other": …}` |
| `occurred_at` 의 시각 | 5,576행 **전부** `12:00` |
| `customers.birthday` | 858명 **전부** 빈 문자열 |
| `customers.grade` | 858명 중 1명 |
| `details.visitType` | `repeat` 5,462 · null 114 → **신규가 0으로 보인다** |

여기서 두 가지 판단이 나온다.

1. **`visitType` 필드를 쓰지 않는다.** 그대로 쓰면 "신규 고객 0명"이 영원히 찍힌다.
   신규는 고객별 `MIN(occurred_at)` 으로 다시 센다. 검증: 2026-07 = 방문 89 · 고객 72 · 신규 4.
2. **시술·결제수단·시간대는 더미로 채운다** (`scripts/seed-analytics-dummy.sql`).
   금액은 한 원도 건드리지 않는다. 시술은 금액대로 나눠 커트가 펌 값을 받지 않게 했다.
   더미 DB 는 커밋하지 않는다 — 스크립트만 공유하고 각자 한 번 돌린다.

---

## 5. 실측 표본 (2026-07)

| 항목 | 값 |
|---|---|
| 결제 건수 | 89 |
| 총 매출 | ₩3,262,000 |
| 다녀간 고객 | 72명 |
| 신규 (원장 전체 최초) | 4명 |
| 요일 분포 (일~토) | 10 · 7 · **0** · 16 · 12 · 23 · 21 |
| 객단가 | ₩36,652 |

화요일 0건은 결측이 아니라 **정기 휴무**다. 요일 축에서 화요일을 빼면 그 사실이 사라진다.

---

## 6. 화면에서 지킬 규칙 (인벤토리에서 바로 따라 나오는 것)

1. **이익 / 순이익 / 마진율을 쓰지 않는다.** 원가 데이터가 없다. 우리가 아는 것은 `profit_won`
   (= 실결제 − VAT − 수수료 − 지출)뿐이고, 이름은 "샵 수익"으로 고정한다.
2. **"재방문율"이라는 말을 쓰지 않는다.** 코호트 추적이 아니다. "재방문 고객 비중"으로 쓴다.
3. **직전 기간이 0이면 증감을 표시하지 않는다.** `+∞%` 가 나올 경로 자체를 만들지 않는다.
4. **진행 중인 기간은 비교하지 않는다.** 8월 12일에 8월 전체와 7월 전체를 견주면 항상 "크게 줄었다"가
   나온다 — 달력이 만든 착시다.
5. **성별을 보여준다면 미상 2.0% 를 함께 밝힌다.**
6. **예약 관련 지표를 만들지 않는다.** `bookings` 데이터가 이 DB에 없다.
7. **담당자별 분석을 만들지 않는다.** 1인 샵이다.

---

## 7. 백로그 (C군 — 데이터가 생기면 가능)

- 시술 원가 입력 → 시술별 마진, 진짜 순이익
- 예약 테이블 연결 → 예약 대비 방문율, 노쇼율
- 생년월일 수집 → 연령대 분석
- 선불권 잔액 원장 → 이연 매출 구분
- 담당자 2인 이상 → 담당자별 생산성

이들은 **SQL 스키마 변경**이 필요하므로 이번 작업 범위 밖이다.
