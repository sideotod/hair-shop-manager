# Salon Analytics Hard Audit

> Audit date: 2026-08-13 KST · Original-data availability gating and demo-database isolation were implemented after the audit finding. The HTML follow-up report is `salon-analytics-hard-audit.html`.
>
> Scope: `/sales` on the current local database and app build. FUNCTION.md traceability: §3.2 매출 조회 (daily/monthly, service, payment method, VAT, fees, shop profit, correction, print) and §3.5 지출/조정.

## Executive Summary

The page is substantially stronger than a typical chart-first dashboard: it makes the period, same-length comparison, settlement relation, and visit-versus-payment distinction visible. Core monetary values observed in the UI matched direct SQLite queries. Corrections and refunds are represented as immutable negative ledger entries, preventing the common mistake of simply overwriting a payment.

The release cannot yet be judged as a trustworthy *full salon analytics* page. The imported dataset has genuine money values but no usable service category, payment-method category, or payment-time data. The UI still presents those three dimensions as if they describe the business: every service is `미분류`, every payment method is `기타`, and every historical payment appears at 21:00. Those cards are mathematically correct but operationally misleading.

The strongest owner-facing workflow is “How much did I make, compared with the same point last month, and what is my settlement?” The weakest is “Which treatment is driving revenue and when is the salon busy?” No reliable booking, cancellation, no-show, age, or completed-service lifecycle data is available, so those questions cannot currently be answered.

**Verdict: PASS WITH MAJOR IMPROVEMENTS.** Trust the financial totals and the payment-derived customer/weekday counts; do not use the service, payment-method, or time-of-day cards for operational decisions until source-quality gating is added.

## Overall Scores

| Area | Score | Basis |
| --- | ---: | --- |
| UX | 72 / 100 | Clear summary and drill-down, but ambiguous current-business-day wording and unusable data cards reduce confidence. |
| UI | 82 / 100 | Calm hierarchy, readable desktop layout, visible status words and no 1280px horizontal overflow. |
| Data Analysis | 62 / 100 | Money, dates, comparison and visit de-duplication are strong; imported analysis dimensions are not valid. |
| Business Fit | 63 / 100 | Good for period sales/settlement; insufficient for service mix, real busy time, appointment health, or demographics. |

## Target User

A single-owner Korean salon operator who needs a quick, low-analysis-literacy answer to: “How is the shop doing in this period, compared to before, and what changed?” Desktop is the supported product surface; the root AGENTS.md prohibits a mobile-first workflow, so this audit tests 1440px and the 1280px minimum rather than mobile.

## System & Data Understanding

The analytics route is a Next.js Server Component, not an HTTP analytics API:

`/sales` → server `SalesPage` → `SalonStore` → SQLite `ledger` → server aggregate / briefing → dashboard, CSV, print and transaction drill-down.

Schema evidence: `ledger` is the financial source; it stores immutable `payment`, `refund`, `correction`, and `expense` rows, plus signed won amounts and JSON details. The running DB contains 5,576 payment records from 2020-02-18 to 2026-08-03, 850 distinct ledger customer IDs, and no actual refund or expense rows.

See [Metric Dictionary](salon-analytics-metric-dictionary.md) for per-metric source, filter, date basis, null behavior and UI wording.

## Metric Dictionary

The full dictionary is maintained in [salon-analytics-metric-dictionary.md](salon-analytics-metric-dictionary.md). Highlights:

- Aug 1–12 UI totals matched SQLite exactly: gross ₩362,000, 11 payments, shop profit ₩352,640.
- The comparison used Jul 1–12, ₩1,202,000, resulting in the displayed -69.9%.
- Jul payment count is 89 while payment-derived visits are 88; the screen intentionally labels these differently.
- `delta()` returns no percentage when the prior value is zero, avoiding false infinity/999% values.

## Critical Findings

### A-01 — P1 Data Analysis / Business Fit — time-of-day card is an import artefact

**OBSERVED.** The page states “21시가 가장 붐빕니다 — 88건” for July. Direct SQLite inspection shows all 89 July payment rows, and all 5,576 imported rows, have 12:00 UTC / 21:00 Seoul timestamps. The page groups the earliest payment per customer-day correctly, but the source time is not a real arrival/service time.

**Evidence:** Screenshot `page-2026-08-12T15-09-38-777Z.png`; `ledger.occurred_at`; `hourLedger()`.

**Impact:** An owner can schedule staff, breaks, or promotions around a fictional 21:00 peak.

**Recommendation:** When the source timestamp has no distribution or is marked imported/defaulted, replace the card with “가져온 기록에 실제 결제 시각이 없어 시간대 분석을 표시하지 않습니다.” Keep the raw view in CSV only.

**Impact / effort / priority:** High / Low / P1.

### A-02 — P1 Data Analysis / Business Fit — service and payment-method cards imply a ranking where no category data exists

**OBSERVED.** Every imported `details.serviceMajor` is `미분류`, and every `details.paymentMethods` is `기타`. The July UI displays “미분류 89건 · 전액” and “기타 전액”; the August drill-down likewise offers a detailed `미분류 시술` panel.

**Evidence:** Screenshots `page-2026-08-12T15-07-21-847Z.png` and `page-2026-08-12T15-07-44-939Z.png`; direct aggregate: 5,576/5,576 rows in each fallback category.

**Impact:** It looks like a valid market or service mix when it actually reports missing import detail.

**Recommendation:** Gate each card by usable-category coverage. If one fallback category covers the imported data, show a non-chart data-quality state with an import/setup action; do not call it the period’s only type.

**Impact / effort / priority:** High / Medium / P1.

### A-03 — P1 UX / Trust — calendar date and “current business day” differ without an explanation

**OBSERVED.** The shell says “2026년 8월 13일 목요일”, while the period default, comparison copy, and gold current-day line treat Aug 12 as current. The source intentionally starts the business day at 09:00 Seoul, but the screen only says “아직 진행 중” / “12일까지”; it does not explain why it is one calendar day behind.

**Evidence:** Screenshot `page-2026-08-12T15-07-21-847Z.png`; `seoulBusinessDate()` subtracts one day before 09:00.

**Impact:** A busy owner can read the page as stale or as excluding today’s completed payments.

**Recommendation:** Present a shared, explicit business-date label, e.g. “영업일 기준 8월 12일 (09:00 마감)” beside the period summary and chart annotation.

**Impact / effort / priority:** High / Low / P1.

### A-04 — P2 UX — empty period still uses a dominant empty chart and a strong “-100%” signal

**OBSERVED.** September (all future) correctly says “이 기간에는 결제 기록이 없습니다.” but also renders an almost empty 31-day chart, four zero KPI cards, and “전월 대비 -100%.”

**Evidence:** Screenshot `page-2026-08-12T15-09-05-535Z.png` at 1280px.

**Impact:** The explanatory empty state is correct, but the chart and red comparison make a future/unavailable period resemble a business collapse.

**Recommendation:** For wholly future periods, suppress comparison and replace the chart body with a compact “아직 시작되지 않은 기간입니다” state. For a historical truly empty period, preserve a separate zero-sales message.

**Impact / effort / priority:** Medium / Low / P2.

### A-05 — P2 Navigation / Trust — protected deep link loses its return destination after login

**OBSERVED.** Opening `/sales?view=month&cursor=2026-09-01` without a session redirects to `/login?next=…`; after successful login, the app redirects to `/` rather than the requested analytics URL. The proxy preserves `next`, but login actions unconditionally redirect to `/`.

**Evidence:** current browser run; `proxy.ts` and `app/auth-actions.ts`.

**Impact:** Saved reports, shared internal links, and interrupted sales work lose context.

**Recommendation:** Validate and carry forward the relative `next` value as a hidden login field, then redirect there after authentication.

**Impact / effort / priority:** Medium / Low / P2.

## UX Audit

### Strengths

- The first visual block answers amount and direction in plain Korean, with the selected range and payment count underneath.
- The in-progress month compares the same elapsed days, and both KPI and chart disclose “지난달 같은 기간(12일까지).” This avoids an incomplete-month-versus-full-month false decline.
- The customer card explains visit, unique customer, first recorded visit, and returning-customer share instead of calling the last item “재방문율.”
- Daily bars link to the exact transaction list. The service drawer opens with a focused close control and offers a contextual transaction path.

### Risks

- The current default surface has enough accuracy caveats to require users to distinguish financial truth from import-quality truth themselves.
- There is no custom date range; only day/week/month/year/total and arrows are available. This does not meet the legacy “기간별 매출 [추가확인]” expectation as flexibly as a date-range workflow would.
- “이번이 첫 방문” is accurately defined in copy but should be read as first recorded payment, not verified first salon visit.

## UI Audit

### Strengths

- At 1440px, the summary, four KPIs, daily chart, three secondary cards and three settlement/data cards have a clear top-to-bottom order.
- At 1280px, `scrollWidth === clientWidth === 1280`; no horizontal page overflow was found.
- Increases/decreases use both signed text and red/green color; status meaning is not color-only.
- Native links/buttons, headings, `aria-current`, chart alternative tables, labelled chart surfaces, visible focus classes, and a focus-restoring drawer are present.

### Risks

- The visually calm three-card row gives unsupported time/service/payment cards equal authority to valid money cards.
- The time card’s single 21:00 bar looks highly decisive despite being a source-data default.
- The audit confirmed basic Tab progression and the open/close drawer path, not screen-reader behavior, contrast ratios, zoom reflow, or all keyboard stops.

## Data Analysis Audit

### Confirmed

- Date filter: UI query controls feed server-side ranges; no client-side re-aggregation was found.
- Date basis: ledger `occurred_at`, with business-day convention documented in code. The inclusive visible end and half-open query end are kept separate.
- Comparison: same elapsed days are used for an incomplete current period; zero prior period returns no percentage.
- Refund/correction model: reversal rows negate each monetary field and reference the original; a uniqueness guard allows one reversal/correction per original.
- Join duplication: no multi-table payment/service join is used in the aggregate path; the aggregate is directly over `ledger`, so the common repeated-payment SUM error is absent.

### Boundaries and Unknowns

- No live refund, partial refund, expense, VAT, discount, points, or coupon-sale row existed in the current imported database. Code and unit tests cover their paths; their real imported-data behavior is **NOT VERIFIED**.
- There is no separate appointment completion status; “visit” is a defensible payment proxy, not appointment attendance.
- Age is correctly absent: all customer birthdays are blank. Gender is available but not displayed; if added, unknown values must be shown with the denominator.
- No causal claims were found. The page says what is highest/changed, not why it changed.

## Business Usefulness Audit

| Owner question | Current answer | Health |
| --- | --- | --- |
| How much did we sell and was it better? | Amount, settlement and fair partial-period comparison are present. | Good |
| What treatment drives revenue? | No; all imported services are unclassified. | Not reliable |
| Are new customers coming in? | First recorded payment is available; it is not an appointment-derived acquisition metric. | Partial |
| When is the shop busy? | Weekday is a payment-visit proxy; time-of-day is invalid for current import. | Partial / unsafe for time |
| Are cancellations/no-shows a problem? | No lifecycle data. | Not provided |

## Desktop Audit

The current layout is legible at 1440px and has no horizontal overflow at the required 1280px minimum. The primary hierarchy is summary → KPI → daily evidence → customer/visit patterns → settlement and drill-down. The unsupported source dimensions should not remain visually co-equal with this primary financial path.

## Mobile Audit

Not performed by design. Root `AGENTS.md` defines Hairhaeyo as a desktop web application and sets 1280px as the minimum supported width; introducing a mobile-navigation audit would conflict with that product constraint. The equivalent minimum-width desktop test was performed at 1280px.

## 10-second Test

**PARTIAL.** At 1440px, a new owner can identify the Aug amount (₩362,000), the change (-69.9%), and that the period is in progress. They cannot know in 10 seconds that the 21:00/service/payment insights are import fallbacks, nor why the UI’s business day is Aug 12 while the shell date is Aug 13.

## 30-second Test

| Question | Result |
| --- | --- |
| Total sales / settlement | Immediately understandable |
| Payment count / visit / unique customer | Findable and explained |
| Average ticket | Immediately understandable, formula shown |
| Growing/declining service | Provided visually but not reliable |
| Busy weekday | Findable, payment-proxy interpretation needed |
| Busy hour | Provided but not reliable |
| New / returning composition | Findable, definition shown |
| Gender / age | Not provided (appropriate for current data quality) |

## Accessibility Audit

**Confirmed strengths:** semantic headings and tables, labelled controls, keyboard-focusable period and drill-down controls, a named modal dialog, visible focus styling, status text in addition to color, and screen-reader chart tables.

**Likely issues / limits:** the sign-in password page emits Chrome’s missing-username warning; no formal contrast audit, screen reader audit, 200% zoom test, or complete tab-order traversal was performed. The sales page has no route-level `error.tsx`; a real database/server aggregate failure was not simulated, so error recovery is **NOT VERIFIED**.

## Reference Benchmark

| Pattern | Current product | Gap / decision |
| --- | --- | --- |
| Context before chart | The page uses a summary sentence before charts. | Keep; ONS says charts need accompanying context and a clear comparison. |
| Simple, non-expert chart | One daily chart plus small supporting cards. | Keep, but hide unsupported dimensions rather than charting fallback values. |
| Explicit analytics data issues | No data-quality badge for import-defaulted dimensions. | Add a source-quality state; Shopify surfaces temporary data-issue indicators on affected metrics. |
| Insight gating | Insights shown even when one-dimensional/default source data provides no real pattern. | Add coverage/distribution prerequisites rather than inventing a numeric sample threshold. |

Sources: [ONS visualisation principles](https://service-manual.ons.gov.uk/data-visualisation/guidance/principles), [ONS annotations](https://service-manual.ons.gov.uk/data-visualisation/guidance/annotations), [ONS interactive charts](https://service-manual.ons.gov.uk/data-visualisation/guidance/interactive-charts-and-animations), [Shopify Analytics overview](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard/using-the-overview-dashboard).

## Interaction Evidence

| Action | Expected | Actual | Result |
| --- | --- | --- | --- |
| Open `/sales` | Default sales analysis, visible current-period context | Aug 2026 summary, KPI, chart, settlement | PASS |
| Open service detail | Focused detail drawer with transaction path | `미분류 시술 상세`, close button focused, correction link available | PASS, but data unfit |
| Escape detail drawer | Close and restore context | Drawer closed; source control remained available | PASS |
| Select a day | Open filtered transaction records | Aug 1 opened 3 matching transactions totaling ₩112,000 | PASS |
| Open future empty month | Distinguish no records from failure | Explicit no-record message and no console error | PARTIAL: also displays -100% / empty chart |
| 1280px desktop | No horizontal overflow | 1280px scroll width equals client width | PASS |
| Keyboard | Reach semantic controls with visible focus | Tab reached sidebar links; chart/drawer controls have focus styles | PARTIAL: full traversal not completed |
| Console | No analytics runtime error | No errors/warnings on sales page; login password-form warning only | PASS for sales page |
| Network | Verify selected period request shape | No analytics HTTP endpoint: route uses server-rendered SQLite query | PASS, architecture-specific |

## Screenshot Evidence

- [01 — default 1440px monthly sales](../../output/playwright/sales-audit/.playwright-cli/page-2026-08-12T15-07-21-847Z.png)
- [02 — service detail drawer](../../output/playwright/sales-audit/.playwright-cli/page-2026-08-12T15-07-44-939Z.png)
- [03 — transaction drill-down](../../output/playwright/sales-audit/.playwright-cli/page-2026-08-12T15-07-49-827Z.png)
- [04 — future/empty period at 1280px](../../output/playwright/sales-audit/.playwright-cli/page-2026-08-12T15-09-05-535Z.png)
- [05 — populated historical period at 1440px](../../output/playwright/sales-audit/.playwright-cli/page-2026-08-12T15-09-38-777Z.png)

## Quick Wins

1. Hide/gate time, service and payment-method cards when their usable source coverage is zero.
2. State the business-date cutoff beside the current-period label.
3. Treat wholly future periods as future, not a -100% sales outcome.
4. Preserve validated `next` URLs through owner login.

## Structural Improvements

1. Improve import mapping to preserve real service category, payment method and payment timestamp; record field provenance/coverage with imported ledger rows.
2. Model appointment lifecycle separately from payment to support completed visits, cancellations, no-shows, reservation value and true appointment-based new/returning metrics.
3. Add source-quality metadata to server aggregates so every representation (KPI, chart, CSV, print, drill-down) can consistently disclose unavailable dimensions.

## Remaining Unknowns

- Production database distributions and imported refund/expense/discount/VAT/points/coupon rows were unavailable.
- Partial refund behavior exists only as an all-payment reversal model in the inspected source; whether legacy behavior requires partial refunds remains unverified.
- No production API exists for this route; freshness, request latency and server failure recovery were not tested under production load.
- No mobile audit was performed because this product’s governing AGENTS.md defines a desktop-only app with 1280px minimum width.

## Final Verdict

**Can a non-analyst salon owner understand current store status?** Yes for period sales, fair comparison, basic settlement, and payment-derived customer counts; only partially for the page as a whole because critical visual cards look meaningful while their source dimensions are defaults.

**Can the displayed analytics be trusted against SQL/backend data?** Financial totals, date grouping, comparison, and payment-derived visits can be trusted for the current source. Service mix, payment mix, and time-of-day cannot be trusted as business insights until the import-quality issue is exposed and resolved.

**Meaningless, missing, or misleading information:** the present service/payment/time cards are misleading in this imported dataset; appointment cancellation/no-show and age analysis are correctly unavailable; true service profitability and deferred prepaid revenue are missing because their required source data does not exist.
