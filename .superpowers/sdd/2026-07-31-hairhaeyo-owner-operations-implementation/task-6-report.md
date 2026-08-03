# Task 6 Report — Owner Operations

## Scope outcome

Task 6 now provides owner-only operational workflows at `/operations` and the Sales `?tab=expenses` view:

- Expense entry, immutable correction (reversal plus replacement), preset defaults, period ledger, and reconciliation.
- Service major/detail/price catalog and a print-specific service price list.
- Persistent preset values for scalp state, hair traits, selected memo, gifts, and quick memo.
- Revenue analytics treats expenses as a distinct labelled ledger status and excludes them from payment totals while retaining them in settlement/profit data.

The prior uncommitted product-sale, coupon, and prepaid implementation was removed: `/products`, `product-actions`, product UI/tests, and coupon helper/tests no longer exist. No product, coupon, or prepaid tab is exposed. Per the revised Task 6 plan, their coverage is mapped to `사용자 승인 제외`; Task 8 owns the complete matrix update.

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
- `components/operations/operations-page.test.tsx`: service/memo/print rendering, excluded product/coupon/prepaid surfaces, expense correction, reconciliation, empty, and input-error states.
- `app/sales/page.test.tsx`: Sales expense entry point and revenue settlement calculation against the current immutable ledger.
- Focused tests including `lib/finance.test.ts`: 31 passing tests.
- TypeScript typecheck passed.

`next-env.d.ts` was pre-existing modified work and is intentionally excluded from the Task 6 commit.
