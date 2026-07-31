# Task 4 report — owner booking board

## Scope and mappings

- `FUNCTION.md` §5.1 예약 운영 → `/bookings` has day, month, and period views with URL query state; previous/today/next navigation; date-filtered booking lists; reservation create/edit/status/cancel workflows; customer and new-customer linkage; service, time, memo, reminder controls; overlap policy; operating-hours and slot settings. The legacy designer selection is explicitly replaced by the single-owner workflow and is not rendered.
- `FUNCTION.md` §5.1 `[추가확인]` status, correction, and cancellation → status history records the exact actor `원장`; cancellation stores its final state/history then archives the booking. Tests cover create, status change, cancellation, and a legacy start-only booking.
- `FUNCTION.md` §5.2 Naver reservation → Smart Place guide; reservation code, account, shop, contact, memo, and conflict-rule settings; FAQ/customer-center/Pay/reference links; sync retry history. No credentials records `disabled` / `dry-run`. Credentials never trigger an external request: the result is `manual-review` / `not-sent`.

## TDD and rule evidence

- Began with failing `lib/booking.test.ts` because the booking rules module did not exist; implemented `bookingOverlaps` and booking validation until green.
- Began with failing booking-action tests because the action module did not exist; implemented save, status, cancellation, settings, and Naver record operations until green.
- Added a regression test for legacy bookings that lack `endsAt`; it initially rejected the status transition as an invalid time and was fixed by inferring one configured booking slot.
- Tests cover active versus cancelled/adjacent overlap, overlap policy blocked and explicitly allowed, opening hours, slot increments, customer/service/reminder validation, status/cancel history and archival, exact audit actor, and disabled Naver dry-run/retry behavior.

## Verification

| Command | Result |
| --- | --- |
| `npm test -- lib/booking.test.ts app/booking-actions.test.ts components/bookings/bookings-page.test.tsx` | 3 files, 8 tests passed |
| `npm test` | 17 files, 83 tests passed |
| `npm run typecheck` | passed (`tsc --noEmit`) |
| Chrome desktop QA at 1440×1000 | `/bookings?date=2026-07-31&view=day&new=1` rendered without horizontal overflow; day/month/period headings and customer links appeared; form/reminder/Naver disabled-dry-run wording were present |
| `npm run build` | blocked by pre-existing synchronous exports in `app/customer-actions.ts`; Next reports that Server Actions must be async for `saveCustomerRecord`, `archiveCustomerRecord`, `saveWaitingCustomerRecord`, `completeWaitingCustomerRecord`, and `saveCustomerPolicyRecord` |

## Self-review

- No `designer` or `staff` input exists on the booking board.
- All Task 4 record changes pass the audit actor exactly as `원장`.
- Booking rules run in server actions; the client is not trusted for overlap, operating-hours, slot, reminder, or status validation.
- Naver's absence of credentials is plainly disabled/dry-run, never presented as a real sync.
- View and navigation state remain in `/bookings` query parameters.

## Concerns

- Production build remains blocked by the unrelated legacy `app/customer-actions.ts` Server Action export structure. Task 4 avoids that issue by keeping synchronous record operations in `lib/booking.ts` and exporting only async actions from `app/booking-actions.ts`.
- Naver is intentionally a settings and dry-run boundary; actual API contract, credentials, schedule, and conflict resolution require product/API authorization.
