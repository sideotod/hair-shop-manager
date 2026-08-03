# Task 8 implementation report

## Status

Implemented revised Task 8 on `codex/full-salon-workflows`, preserving the concurrent `origin/main` README commit at `bef5fe5` and leaving the pre-existing unstaged plan edit untouched.

Task 8 maps `FUNCTION.md` sections 0, 1.2, and 8 to a grouped desktop `/settings` workflow. No product/coupon settings UI or balance manager was added.

## Implemented behavior

- Grouped desktop settings for shop/owner, customer policy, payment policy, booking, SMS dry-run automation, integrations status/help, and help/FAQ/notices.
- Editable owner display name while every settings/password/notice audit actor remains exactly `원장`.
- Password change verifies the current password with the existing scrypt auth implementation, requires an eight-character matching confirmation, persists only `ownerPasswordHash`, and excludes plaintext from settings and audit payloads.
- Persisted hidden-menu and visual-token settings feed `AppShell`; direct server route protection remains unchanged.
- Persisted VAT mode and card-fee defaults feed the existing payment form/server ledger flow.
- Prepaid rows map to `/sales`; no prepaid balance manager exists.
- SMS provider/template/delivery-history rows map to the existing `/messages` dry-run workflow or `사용자 승인 제외` as recorded in the matrix.
- Naver shows only non-secret configuration status and external help. Connection/credentials remain Task 10; there are no account, password, client-secret, or secret-key fields.
- Help, FAQ, and notices are reachable from settings, the top bar, and dashboard.
- Desktop baseline is enforced with `min-w-[1280px]`; controls retain labels, semantic landmarks, visible focus styles, and non-color status text.

## Function coverage

`docs/function-coverage-matrix.md` and `lib/function-coverage.test.ts` verify exact legacy-bullet identity, allowed statuses, implementation/test/QA path existence, and fixed counts.

- Top-level bullets: **253**
- Nested bullets: **10**
- Total bullets: **263**
- `구현`: **177**
- `원장 1인 대체`: **16**
- `연동 확인 필요`: **32**
- `사용자 승인 제외`: **38**
- `계획`: **0**

Product/coupon setting rows use `사용자 승인 제외`. Prepaid rows use the `/sales` immutable payment-ledger replacement. Naver credential rows remain `연동 확인 필요` for Task 10. All rows retain exact implementation, automated-test, and QA paths.

## Verification commands and results

### Focused Task 8, coverage, shell, dashboard, sales-default, and auth tests

```powershell
npm test -- components/settings/settings-page.test.tsx lib/function-coverage.test.ts components/dashboard/dashboard-page.test.tsx components/bookings/bookings-page.test.tsx components/customers/customers-page.test.tsx components/messages/messages-page.test.tsx components/operations/operations-page.test.tsx components/sales/payment-form.test.tsx components/sales/revenue-dashboard.test.tsx app/sales/page.test.tsx lib/auth.test.ts
```

Result: exit 0; **11 test files passed, 53 tests passed**.

The settings tests cover password minimum length/current-password/confirmation, plaintext exclusion, immutable audit actor, rate/time/color validation, grouped navigation, SMS dry-run mapping, prepaid `/sales` mapping, non-secret Naver status/help, and absence of product/coupon controls. The coverage parser test verifies the exact 253 + 10 = 263 inventory and status totals above.

### Strict TypeScript

```powershell
npm run typecheck
```

Result: exit 0; `tsc --noEmit` passed.

### Production build

```powershell
npm run build
```

Result: exit 0; Next.js 16.2.12 compiled, TypeScript completed, 11 static pages were generated, and dynamic route `/settings` was included.

### Full repository suite

```powershell
npm test
```

Result: exit 1; **22 files passed, 2 failed; 133 tests passed, 4 failed**.

Remaining failures are outside the Task 8 focused suite and reproduce the existing shared-data/stale-expectation state:

- `lib/revenue-data.test.ts`: two stale aggregate expectations (`총 시술금액` label and signed point/refund expectation).
- `app/sales/transactions/page.test.tsx`: two shared `.data` ledger-count/filter expectations (five rows instead of four and a persisted row preventing the expected empty state).

#### Exact full-suite failure determination

Focused reruns:

```powershell
npm test -- lib/revenue-data.test.ts
npm test -- app/sales/transactions/page.test.tsx
```

The first command reproduced 2 failed / 4 passed tests. The second reproduced 2 failed / 2 passed tests.

| Exact test name | Exact assertion error | Determination |
| --- | --- | --- |
| `server revenue aggregate > builds every KPI, chart, table, CSV source, and transaction row from the same immutable ledger` | `AssertionError: expected [ …(9) ] to deeply equal [ { name: '총 시술금액', …(1) }, …(8) ]` at `lib/revenue-data.test.ts:43` | **Pre-existing at base `bef5fe5`.** `git show bef5fe5:lib/revenue-data.ts` already emits `총 매출`, while the base test already expects `총 시술금액`. Task 8 changes neither file. |
| `server revenue aggregate > aggregates signed split-payment details by method and signed point use in settlement` | `AssertionError: expected 5000 to be +0 // Object.is equality` at `lib/revenue-data.test.ts:118` | **Pre-existing at base `bef5fe5`.** Base aggregation copies `paymentMethods` and `pointsUsedWon` without applying the refund sign expected by the test. Task 8 changes neither the aggregate nor this test. |
| `TransactionsPage > renders a desktop owner transaction table from the same monthly aggregate` | `AssertionError: expected [ 'data-revenue-transaction=', …(4) ] to have a length of 4 but got 5` at `app/sales/transactions/page.test.tsx:9` | **Pre-existing shared-data failure at base `bef5fe5`.** The base page/test use the default `.data/hairhaeyo.sqlite`; read-only inspection shows four seed rows plus persisted `product-sale-64fbe304-c0b5-4553-b8e8-7f2e853fa3a8` / ledger id `02b3c35e-af29-4867-a967-00a6d089b66d`. Task 8 only passes `snapshot.settings` to `AppShell` and does not change row construction/filtering. |
| `TransactionsPage > shows an empty state and forwards the selected customer to payment` | `AssertionError: expected '<div data-app-shell-background="true"…' to contain '조건에 맞는 거래 기록이 없습니다.'` at `app/sales/transactions/page.test.tsx:17` | **Pre-existing shared-data failure at base `bef5fe5`.** The default database row prevents the base test's empty-day assumption. Task 8 does not write product sales or alter transaction filtering. |

Concurrent-main determination: commit `bef5fe5` is `docs: refine README product description` and modifies only `README.md`; `git diff cb0a73e bef5fe5` shows no changes to the four failing tests or their implementations. Therefore none of the four failures is caused by the concurrent README/main change, and focused evidence found no Task-8-caused failure requiring a code fix.

### Chrome desktop QA

A bounded production server was started on port 3011 with a generated scrypt demo hash and temporary session secret, then terminated after QA. Existing port 3010 (Python PID 16280) was not modified.

- Chrome 1280×900, `/settings`: viewport 1280×900, `clientWidth=1280`, `scrollWidth=1280`; grouped settings and password form visible; product/coupon control count 0.
- Chrome 1440×1000, `/settings?section=help`: viewport 1440×1000, `clientWidth=1425`, `scrollWidth=1425`; no horizontal overflow; FAQ, notices, and top-bar help link present.
- Dashboard exposed three settings-help targets, including the seeded notice anchor: `/settings?section=help`, `/settings?section=help`, `/settings?section=help#notice-seed-1`.
- Temporary viewport override was reset, Chrome tabs were finalized, and helper server PID 22616 was terminated.

## Self-review

- Codegraph was used before edits and again to trace the final settings → store/auth/AppShell/payment flow.
- Ponytail full review: reused the existing store, auth hashing, AppShell, payment ledger, and page components; no UI framework, dependency, provider abstraction, credential store, product/coupon manager, or prepaid balance subsystem was introduced.
- Security review: login resolves the persisted hash with the existing environment fallback; password form values do not enter settings or audit payloads; Naver secrets are neither rendered nor stored.
- Traceability review: matrix has no `계획` status and every row names exact implementation/test/QA paths checked by the parser test.

## Concerns

- The repository-wide suite remains non-green because of the four pre-existing revenue/shared-data failures listed above. Task 8 focused tests, typecheck, build, and both required Chrome viewport checks pass.
- The unrelated modified file `docs/superpowers/plans/2026-07-31-hairhaeyo-owner-operations-implementation.md` remains unstaged and uncommitted.

## Fix round 1 — 2026-08-03

### Review findings addressed

- New-customer gender now uses persisted `defaultGender`; an existing customer's stored gender remains authoritative.
- `smsEnabled=false` is enforced in `lib/messages.ts` before message persistence or quota mutation. `/messages` renders explicit `SMS 기능 꺼짐` text and disables the queue fieldset.
- Booking settings now read and persist only the existing `reminderText` key. The unused `bookingNoticeText` key is ignored.
- The duplicate `messageAutomationSchedule`, `messageAutomationText`, and `messageAutomationEnabled` settings were removed. Settings now provides truthful dry-run/SMS status and links to `/messages#automation`, where the existing controls remain.
- Settings errors use an exact validation-message allowlist. SQLite, configuration, and other operational errors become `설정을 저장하지 못했습니다.` before entering a redirect URL or rendered HTML.
- Password fields use an untrimmed raw accessor. Current, new, and confirmation values preserve whitespace exactly; plaintext remains absent from settings, audit payloads, redirect queries, and HTML.
- `DEFAULT_VISUAL_TOKENS` is the single default source for the settings form and `AppShell`. Native relative-luminance checks enforce 4.5:1 for background/foreground, brand/white, and sidebar/white. The token scope now wraps both shell background and overlay.
- Help now contains reachable `#terms` service terms covering owner account responsibility, customer/booking/financial data, immutable financial corrections, SMS dry-run limits, and separate Naver integration.
- The coverage matrix was re-audited conservatively. All product/coupon rows are `사용자 승인 제외`; unverified point policy, automatic-delivery, popup, endpoint, and meta-policy claims are `연동 확인 필요`.
- The coverage parser now rejects generic evidence labels such as `Playwright`, requires every semicolon-separated evidence item to be an existing concrete repository path, and requires implementation/test paths for `구현` and `원장 1인 대체` rows.

### Coverage after re-audit

- Top-level bullets: **253**
- Nested bullets: **10**
- Total bullets: **263**
- `구현`: **153**
- `원장 1인 대체`: **16**
- `연동 확인 필요`: **51**
- `사용자 승인 제외`: **43**
- `계획`: **0**

### TDD and focused verification

Initial regression run before implementation:

```powershell
npm test -- components/settings/settings-page.test.tsx components/customers/customers-page.test.tsx lib/messages.test.ts components/messages/messages-page.test.tsx components/dashboard/dashboard-page.test.tsx lib/function-coverage.test.ts
```

Result: exit 1; **6 test files failed; 11 tests failed and 34 passed**. Failures reproduced missing contrast checks, password whitespace preservation, reminder-key consolidation, terms/error redaction, default gender, SMS disable enforcement/UI, overlay token scope, and conservative matrix evidence/status rules.

Final focused settings/coverage/shell/auth run:

```powershell
npm test -- components/settings/settings-page.test.tsx components/customers/customers-page.test.tsx lib/messages.test.ts components/messages/messages-page.test.tsx components/dashboard/dashboard-page.test.tsx lib/function-coverage.test.ts lib/auth.test.ts
```

Result: exit 0; **7 test files passed, 55 tests passed**.

Strict TypeScript:

```powershell
npm run typecheck
```

Result: exit 0; `tsc --noEmit` passed.

Production build:

```powershell
npm run build
```

Result: exit 0; Next.js 16.2.12 compiled successfully, TypeScript completed, 11 static pages were generated, and dynamic `/settings` and `/messages` routes were included.

Working-tree whitespace check:

```powershell
git diff --check
```

Result: exit 0; no whitespace errors. Git emitted only the repository's existing LF-to-CRLF conversion warnings.

Staged diff whitespace check:

```powershell
git diff --cached --check
```

Result: exit 0; no staged whitespace errors.

The full repository suite was not repeated in this fix round. Its four previously documented revenue/shared-`.data` failures remain separately classified and the fix did not modify revenue aggregation, transaction-page filtering, or shared `.data` behavior.

### Fix-round self-review

- No new dependency, UI framework, provider abstraction, credential storage, product/coupon surface, or prepaid balance manager was added.
- Shared enforcement lives at the existing queue/settings/auth boundaries; UI status mirrors but does not replace server enforcement.
- The controller-owned revised plan remains unstaged.
