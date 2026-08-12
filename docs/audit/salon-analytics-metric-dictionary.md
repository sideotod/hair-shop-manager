# Salon Analytics Metric Dictionary

> Audit date: 2026-08-13 KST · Scope: `/sales` · FUNCTION.md trace: §3.2 매출 조회, §3.5 지출/조정
>
> A label is not treated as a definition; the SQLite query and ledger fields are the source of truth. The three imported analysis dimensions now carry a server-side availability gate rather than being treated as valid fallback categories.

| UI metric | Actual source | Actual definition | Screen label | Accuracy | Audit note |
| --- | --- | --- | --- | --- | --- |
| 총 매출 | `ledger.gross_won` | `SUM(gross_won)` for the selected half-open time range; a refund/correction stores negative values | 총 매출 | Verified | 2026-08-01~12: ₩362,000; matches SQLite. |
| 실결제 | `ledger.amount_won` | `SUM(amount_won)` excluding `kind='expense'` | 실결제 | Verified | Same current result because source rows have no discount or points use. |
| 샵 수익 | `ledger.profit_won` | `SUM(profit_won)`; payment creation calculates `netPaid - VAT - fee - expense` | 샵 수익 | Verified, bounded | This is not accounting profit or net profit: treatment/product cost is absent. |
| 할인·포인트·VAT·수수료·지출 | corresponding ledger columns / `details.pointsUsedWon` | Server `summarizeLedger()` aggregate, used by KPI, settlement and chart summary | 정산 | Verified | Same server aggregate is consumed by the visible settlement values. |
| 환불 | `ledger.kind='refund'`, `amount_won` | `SUM(amount_won)` for refund rows (negative values) | 환불 | Implementation verified; runtime sample unavailable | The current imported ledger has no refund rows, so an actual refund aggregate was not observed. |
| 결제 건수 | `ledger` | `COUNT(*)` in selected range | 결제 n건 | Verified | Aug 1~12 has 11 records; Jul has 89. It is explicitly a payment count. |
| 방문 | `ledger.customer_id`, `occurred_at` | distinct `(customer_id, business date)` pairs, excluding expenses | 방문 n회 | Verified, proxy | Jul: 89 payments → 88 visits; this correctly avoids double counting same-day split payments. It is a payment-based visit proxy, not a completed-appointment record. |
| 다녀간 고객 | `ledger.customer_id` | `COUNT(DISTINCT customer_id)` in selected range | 다녀간 고객 | Verified, bounded | Anonymous customers are not included in this distinct-customer value. |
| 이번이 첫 방문 | `ledger.customer_id`, `occurred_at` | customer whose all-time first non-expense ledger record is in selected range | 이번이 첫 방문 | Verified, proxy | Correctly does not rely on imported `visitType`; it indicates first recorded payment, not independently verified first appointment. |
| 재방문 고객 비중 | customer aggregate | `(distinct customers - first recorded customers) / distinct customers` | 재방문 고객 비중 | Verified label | It is not cohort retention; the screen states this. |
| 객단가 | total gross + visits | `round(SUM(gross_won) / visits)` | 객단가 | Verified, definition choice | It is gross per payment-derived visit; the on-screen note explains the denominator. |
| 기간 증감 | selected and prior server summaries | `(current gross - comparable previous gross) / previous gross`; `null` if previous is zero | 지난달/지난달 같은 기간 | Verified | Aug 1~12 vs Jul 1~12: ₩362,000 vs ₩1,202,000 = -69.9%. No Infinity/999% output path. |
| 일별 매출 | `ledger.occurred_at`, `gross_won` | daily `SUM(gross_won)` keyed by business date | 일별 매출 | Verified | Past zero, future, and in-progress states have distinct labels/accessible table text. |
| 요일별 방문 | payment-derived visit pairs | group visit pairs by business weekday | 요일별 방문 | Verified, bounded | Valid visit proxy, but not reservation or appointment completion. |
| 시간대별 방문 | payment-derived visit pairs + `occurred_at` | group earliest payment of each customer-day by Seoul hour; one fixed nonzero hour is unavailable | 시간대별 방문 | Gated | Original-style import data renders `원본 정보 없음`; the demo DB may show a distribution for UX audit only. |
| 시술 카테고리 매출 | `details.serviceMajor`, `gross_won` | group gross by imported service category; `미분류`/`기타` only is unavailable | 시술 카테고리 | Gated | Original-style import data renders `원본 정보 없음`, not a fake one-item ranking. |
| 결제 수단 | `details.paymentMethods` | sum amounts per method key; `기타` only is unavailable | 결제 수단 | Gated | Original-style import data renders `원본 정보 없음`, not a 100% `기타` breakdown. |
| 성별/연령 | `details.gender` / customer birthdays | no sales-screen aggregation | Not shown | Appropriate omission | Gender has 114 unknown values; all imported customer birthdays are empty, so an age chart would be unsupported. |
| 예약·취소·노쇼 | no linked appointment lifecycle in analytics source | unavailable | Not shown | Appropriate omission | A completed payment must not be labeled as a reservation, completion, cancellation, or no-show metric. |

## Data-flow evidence

`/sales` server page → `createSalonStore()` → SQLite `ledger` aggregates (`aggregateLedger`, `summarizeLedger`, `weekdayLedger`, `customerMixLedger`, `hourLedger`) → `RevenueSummary` / briefing → `RevenueDashboard` KPI, chart, settlement, CSV and drill-down.

The period values and settlement use server aggregates. The dashboard does not re-sum client-side ledger data.
