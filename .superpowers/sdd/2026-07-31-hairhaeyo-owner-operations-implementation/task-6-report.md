# Task 6 Report — Owner Operations

## Scope outcome

Task 6 now provides owner-only operational workflows at `/operations` and the Sales `?tab=expenses` view:

- Expense entry, immutable correction (reversal plus replacement), preset defaults, period ledger, and reconciliation.
- Service major/detail/price catalog and a print-specific service price list.
- Persistent preset values for scalp state, hair traits, selected memo, gifts, and quick memo.
- Revenue analytics treats expenses as a distinct labelled ledger status and excludes them from payment totals while retaining them in settlement/profit data.

The prior uncommitted product-sale and coupon implementation was removed: `/products`, `product-actions`, product UI/tests, and coupon helper/tests no longer exist. No product or coupon tab is exposed. Prepaid remains the existing `선불권` payment-ledger tender under Sales, without dedicated balance management. Per the revised Task 6 plan, product and coupon coverage is mapped to `사용자 승인 제외`; Task 8 owns the complete matrix update.

## FUNCTION.md traceability

| Legacy section | Revised Task 6 mapping |
| --- | --- |
| 3.5 지출 조정 | Expense ledger, presets, period query, reconciliation, correction history, and print-ready ledger display in `/operations?tab=expenses`. |
| 7 상품/서비스 설정 | Service major/detail/price catalog, print price list, and scalp/hair/memo/gift/quick-memo values in `/operations`. Product and coupon bullets are `사용자 승인 제외`. |

## Financial behavior

- `recordExpense` appends one negative-cash expense ledger entry with positive `expenseWon` and negative `profitWon`.
- `correctExpenseRecord` never updates the source entry. It appends a linked `correction` reversal and an `expense` replacement; the store transaction and audit rows cover all entries atomically.
- Reversal avoids `-0`, preserving the existing store’s exact JSON money invariant.
- A selected expense preset supplies its default amount server-side when the form leaves the amount blank.

## Tests and verification

- `lib/operations.test.ts`: immutable correction linkage, aggregate money invariants, duplicate-correction rejection, and server-owned preset amount.
- `components/operations/operations-page.test.tsx`: service/memo/print rendering, excluded product/coupon surfaces, expense correction, reconciliation, empty, and input-error states.
- `app/sales/page.test.tsx`: Sales expense entry point and revenue settlement calculation against the current immutable ledger.
- Focused tests including `lib/finance.test.ts`: 31 passing tests.
- TypeScript typecheck passed.

`next-env.d.ts` was pre-existing modified work and is intentionally excluded from the Task 6 commit.

## Task 6 fix round 1 verification

### Scope correction

- Customer detail no longer reads or renders product-sale or coupon history. Seeded legacy records remain unchanged.
- Product and coupon are excluded. Existing `선불권` remains the Sales payment-ledger tender replacement workflow; no dedicated prepaid-balance feature was added.
- Catalog edit uses the existing `saveCatalogItem` action with the existing `catalogId`.

### Automated verification

Focused command run:

```powershell
npm test -- lib/operations.test.ts components/operations/operations-page.test.tsx components/customers/customers-page.test.tsx components/sales/payment-form.test.tsx app/sales/page.test.tsx lib/finance.test.ts
```

Decisive output: exit code `0`; `Test Files  6 passed (6)`; `Tests  43 passed (43)`; duration `3.12s`.

Typecheck command run:

```powershell
npm run typecheck
```

Decisive output: exit code `0`; `tsc --noEmit` completed without diagnostics.

Production build command run:

```powershell
npm run build
```

Decisive output: exit code `0`; Next.js `16.2.12 (Turbopack)` reported `Compiled successfully in 4.3s`, `Finished TypeScript in 5.0s`, and `Generating static pages using 10 workers (9/9)`; route output includes dynamic `/operations`.

Diff check command run:

```powershell
git diff --check
```

Decisive output: exit code `0`; no whitespace errors.

### Chrome desktop QA

Chrome used the local authenticated app with `HAIRHAEYO_DEMO_MODE=1`.

Commands executed through the Chrome browser session:

```javascript
await taskSixViewport.set({width: 1440, height: 1000});
await taskSixFixTab.goto("http://127.0.0.1:3000/operations?tab=services&edit=catalog-8feb6dbc-3cf9-4b58-8962-e00ddb9c5eac");
await taskSixFixTab.goto("http://127.0.0.1:3000/operations?tab=expenses");
await qaExpensePrintLink.click();
```

- `1280x900`, `http://127.0.0.1:3000/operations?tab=services&edit=catalog-8feb6dbc-3cf9-4b58-8962-e00ddb9c5eac`: Korean form and table alignment rendered correctly after cell padding correction; populated `시술 분류·가격 수정` form and `수정 저장` were visible. Document dimensions were `scrollWidth=1280`, `clientWidth=1280`, `overflow=false`. Focused `대분류` input reported `outline=rgb(183, 125, 143) solid 2px`.
- `1440x1000`, same catalog edit URL: `시술 분류·가격 수정` and `서비스 가격표` headings were visible with populated `QA 분류`, `QA 시술`, and `10000` values. Document dimensions were `scrollWidth=1440`, `clientWidth=1440`, `overflow=false`. Focused `대분류` reported the same visible `2px` outline.
- `1280x900`, `http://127.0.0.1:3000/operations?tab=expenses`: `인쇄용 지출 원장` action count was `1`, href `/operations?tab=expenses&print=1`; normal page dimensions were `scrollWidth=1265`, `clientWidth=1265`, `overflow=false`. Its print route rendered `인쇄용 지출 정산` and `인쇄용 지출 원장`; print document dimensions were `scrollWidth=1280`, `clientWidth=1280`, `overflow=false`.
- `1440x1000`, `http://127.0.0.1:3000/operations?tab=expenses`: `인쇄용 지출 원장` action count was `1`, href `/operations?tab=expenses&print=1`; normal page dimensions were `scrollWidth=1425`, `clientWidth=1425`, `overflow=false`. The print route had one `인쇄용 지출 정산` heading and one `인쇄용 지출 원장` heading with `scrollWidth=1440`, `clientWidth=1440`, `overflow=false`.

## Exact verification evidence

Focused verification command:

```powershell
npm test -- components/operations/operations-page.test.tsx lib/operations.test.ts app/sales/page.test.tsx lib/finance.test.ts
```

Decisive output: `Test Files  4 passed (4)` and `Tests  31 passed (31)`.

TypeScript command:

```powershell
npm run typecheck
```

Decisive output: exit code `0` from `tsc --noEmit`.

Production build command:

```powershell
npm run build
```

Decisive output: exit code `0`; Next.js reported `Compiled successfully`, `Finished TypeScript`, and generated all 9 pages. The route table includes dynamic `/operations`, `/sales`, and `/sales/transactions`.

Chrome desktop check:

```text
Chrome → http://127.0.0.1:3000/operations?tab=expenses → viewport 1440×960
```

Decisive visible results: the desktop page rendered the Korean `운영 설정` heading, all three operational tabs, `지출 등록`, `지출 프리셋`, `기간 정산`, and `지출 원장`; no product, coupon, or prepaid navigation surfaced. The viewport override was reset and the local browser tab was closed after inspection.
