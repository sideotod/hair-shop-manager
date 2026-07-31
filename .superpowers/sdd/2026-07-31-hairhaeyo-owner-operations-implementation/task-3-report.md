# Task 3 report — customer management and waiting workflow

## Files

- Created `app/customers/page.tsx`: server route loads one `SalonStore` snapshot and passes query-selected customer state to the page.
- Created `app/customer-actions.ts`: server actions and testable record operations for customer, waiting, archive/completion, and customer-policy workflows.
- Created `app/customer-actions.test.ts`: server validation, duplicate override, linked records, correction state, audit, waiting, and policy verification.
- Created `components/customers/customers-page.tsx`: desktop customer search/list/detail workflow and forms.
- Created `components/customers/customers-page.test.tsx`: semantic Korean-label, empty-state, search, tab, segment, print-layout, and waiting-control verification.
- Modified `lib/salon-domain.ts`: shared customer and waiting record payload types.

## Behavior mapping

| FUNCTION.md section | Implemented workflow | Verification |
|---|---|---|
| 2.1 고객 등록 | Customer form captures identity, absent-phone state, contact/SMS preference, lunar/solar birthday, grade/group/motive, points/card/family fields, memo, dates, and initial SMS/booking/waiting choices. Server validates name, phone, memo, points, and duplicate override. | `app/customer-actions.test.ts`; `components/customers/customers-page.test.tsx` |
| 2.2 고객 검색/조회 | Ten criteria filter the customer list; query-selected detail has basic, booking, service/payment, product, point, coupon/prepaid, and message history tabs. Customer archive is a soft archive with an `원장` audit record. | `components/customers/customers-page.test.tsx`; `app/customer-actions.test.ts` |
| 2.3 고객 분류/마케팅 | Segment links cover power, sales threshold, grade, group, gender, motive, recent/nonvisit, and birthday; message-target link and four print-layout choices are present. | `components/customers/customers-page.test.tsx` |
| 2.4 대기 고객 | Waiting name/memo registration, existing-member payment link, completion via soft archive, and explicit empty state are implemented. | `app/customer-actions.test.ts`; `components/customers/customers-page.test.tsx` |
| 2.5 고객 설정 | Group, grade, motive, SMS-default, and birthday-calendar policy values are server-owned settings with an `원장` audit record. | `app/customer-actions.test.ts` |

## TDD

Used only for the requested high-risk logic.

- RED: `npm test -- app/customer-actions.test.ts` failed because `app/customer-actions.ts` did not yet exist.
- GREEN: after minimal server actions, the same command passed 3/3 tests.
- RED: the correction-state test exposed that an incomplete initial booking saved its customer before throwing (customer count changed from 4 to 5).
- GREEN: validation moved before the first mutation; focused tests passed 6/6.

Routine page markup was implemented first, then covered with focused static-render verification per the testing override.

## Commands and output

- `npm test -- app/customer-actions.test.ts` — RED module-not-found, then GREEN 3/3; correction RED 1 failure, then GREEN 6 focused tests with page checks.
- `npm test -- components/customers/customers-page.test.tsx lib/salon-store.test.ts` — 9/9 passed.
- `npm test` — 13 files, 65 tests passed.
- `npm run typecheck` — passed (`tsc --noEmit`).
- `git diff --check` — passed.

## Self-review

- Actions use `SalonStore` writes and soft archive rather than client-owned state; every Task 3 mutation has actor exactly `원장`.
- Duplicate, incomplete-linked-record, empty, length, opt-out, and waiting completion paths are covered.
- The page has a 1048px content minimum inside the existing desktop shell, semantic labels, forms, headings, navigation, and non-color text status.
- No designer/staff fields were added.

## Concerns

None. The Task 3 brief asks for a four-layout selector; browser print rendering/visual QA remains outside this task and is explicitly deferred to Task 9.

## Fix round 1

### Root-cause corrections

- Customer saves now persist `telephone`; server date validation round-trips date values and bounds time values before any record mutation.
- Customer-keyed ledger entries, product-sale records, and customer-coupon records drive customer histories and sales segments. Existing SQLite databases receive the additive `ledger.customer_id` migration.
- Grade, group, gender, and motive segments require their selected value. Sales uses the linked ledger aggregate; recent/nonvisit use booking/payment timestamps rather than `visitType`.
- Bulk group/grade updates mutate only selected customer records and preserve policy settings omitted by the bulk form. Policy values are consumed by the registration form's grade/group/motive controls.
- The waiting payment link targets `/sales/transactions?new=1&customer=…`; that route resolves and renders the payment-registration customer context without adding payment-entry functionality ahead of Task 5.
- Print layout is query-selected, renders four distinct printable tables, and uses a small client button that calls native `window.print()` with print-only CSS.

### Tests and evidence

- RED: `app/customer-actions.test.ts` proved missing `telephone` persistence and missing bulk customer updates.
- GREEN: server payload, exact date/time validation, and bulk mutation changes passed 14 focused action/store tests.
- RED: bulk-only submission cleared stored policy values; the regression test showed empty group/grade settings.
- GREEN: omitted policy fields are preserved; the action test passes.
- Behavioral page tests now assert linked histories, selected-value segments, ledger sales, timestamp-based recent/nonvisit, policy controls, and distinct print layouts. Transaction-page coverage asserts payment customer preselection.
- Final focused command: `npm test -- app/customer-actions.test.ts components/customers/customers-page.test.tsx app/sales/transactions/page.test.tsx lib/salon-store.test.ts` — 27/27 passed.
- `npm run typecheck` and `git diff --check` passed.
