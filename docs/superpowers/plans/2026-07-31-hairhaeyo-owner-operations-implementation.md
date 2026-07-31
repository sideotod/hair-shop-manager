# Hairhaeyo Owner Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete every Hairhaeyo desktop route and map all 253 top-level and 10 nested `FUNCTION.md` bullets while replacing designer/staff-specific workflows with one owner identity.

**Architecture:** Root App Router pages read a typed single-shop SQLite store built with Node 24 `node:sqlite`. Server Actions own validation and mutation; immutable ledger entries own financial records and corrections. Domain client components provide drawers, forms, tabs, calendars, and previews without adding a UI framework.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, Node 24 `node:sqlite`, Recharts 3, Tauri 2, Rust, Pretendard Variable, Vitest, Playwright browser control.

## Global Constraints

- Desktop web only; baseline 1440px and minimum supported width 1280px.
- Use root `app/`, `components/`, and `lib/`; do not introduce stale `src/` paths.
- `FUNCTION.md` remains authoritative: top-level bullets `253`, nested bullets `10`, all bullets `263`.
- No designer/staff registration, assignment, availability, commission, or individual sales/profit views.
- Legacy staff/designer/seller/operator values map to the single owner identity `원장`.
- Owner login/password and administrator authority remain.
- Money is integer won. Financial records are immutable; correction/refund appends a linked ledger entry.
- KPI, chart, permanent bar labels, table, CSV, print, and drawer use the same server aggregate.
- Bar charts have no hover tooltip and show formatted amounts at the bar end. Pie charts keep tooltip behavior.
- SMS and Naver do not call external services without credentials; expose dry-run/disabled verification states.
- Preserve keyboard access, semantic HTML, visible focus, non-color status labels, Korean text alignment, and page-level no-horizontal-overflow at 1280px.
- Use existing dependencies, platform APIs, and standard library before adding packages.
- Keep browser web delivery and add a Windows Tauri v2 shell; do not convert the app to static export.
- Tauri default window is 1440px wide and minimum window width is 1280px.
- Default shop display name is `수원 본점`; UI owner display name comes from settings while immutable audit actor remains `원장`.
- Bundle `Pretendard Variable` locally under SIL OFL 1.1; do not depend on a font CDN.

---

### Task 1: Add SQLite domain store and function coverage gate

**Files:**
- Modify: `.gitignore`
- Create: `lib/salon-domain.ts`
- Create: `lib/salon-store.ts`
- Create: `lib/salon-store.test.ts`
- Create: `docs/function-coverage-matrix.md`
- Create: `lib/function-coverage.test.ts`

**Interfaces:**
- Produces `RecordKind`, `SalonRecord<T>`, `LedgerEntry`, `AuditEvent`, `SalonSnapshot`.
- Produces `createSalonStore(filename?: string): SalonStore`.
- `SalonStore` exposes `list<T>(kind)`, `get<T>(kind,id)`, `save(kind,id,value,actor)`, `archive(kind,id,actor)`, `appendLedger(input,actor)`, `listLedger()`, `getSettings()`, `saveSettings(values,actor)`, and `snapshot()`.

- [ ] **Step 1: Write failing store tests**

Create in-memory tests that save and update a customer, archive a waiting customer, reject a duplicate ledger `requestKey`, append a correction linked by `correctionOf`, and verify an audit event exists for every mutation.

Run: `npm test -- lib/salon-store.test.ts`

Expected: FAIL because `salon-store.ts` does not exist.

- [ ] **Step 2: Implement the minimum SQLite schema**

Use four tables: `records`, `ledger`, `settings`, `audit_events`. Store typed JSON payloads and integer money columns. Create `.data/hairhaeyo.sqlite` by default and add `.data/` to `.gitignore`. Mark the single-instance ceiling with `ponytail: SQLite single instance; managed SQL adapter if multi-instance hosting is introduced`.

- [ ] **Step 3: Seed deterministic owner-shop data**

Seed customers, waiting customers, bookings, messages, products, coupons, settings, notices, and the existing revenue ledger only when tables are empty. Seed records must include gender and first/repeat visit values for the simplified revenue composition views.

- [ ] **Step 4: Create exact function coverage matrix**

Copy every `FUNCTION.md` bullet into `docs/function-coverage-matrix.md` with columns `기능`, `상태`, `구현 위치`, `검증`. Designer/staff-specific bullets use status `원장 1인 대체`; external items use `연동 확인 필요`; all others name an exact route/module/test.

- [ ] **Step 5: Add the coverage test**

Parse `FUNCTION.md` with `/^\s*-\s(.+)$/gm`, parse the first matrix column, and assert counts `253`, `10`, `263`, no missing exact bullet, and no empty implementation location.

Run: `npm test -- lib/salon-store.test.ts lib/function-coverage.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .gitignore lib docs/function-coverage-matrix.md
git commit -m "feat(data): add owner salon store"
```

### Task 2: Add Tauri shell, local typography, owner session, shared shell, search, and operational dashboard

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `app/fonts/PretendardVariable.woff2`
- Create: `THIRD_PARTY_LICENSES/Pretendard-OFL-1.1.txt`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `lib/auth.ts`
- Create: `lib/auth.test.ts`
- Create: `app/login/page.tsx`
- Create: `app/auth-actions.ts`
- Create: `proxy.ts`
- Modify: `lib/salon-store.ts`
- Modify: `lib/salon-store.test.ts`
- Modify: `components/app-shell.tsx`
- Modify: `components/dashboard/dashboard-page.tsx`
- Modify: `components/dashboard/dashboard-page.test.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces `verifyOwnerPassword(password, storedHash): boolean`, `createOwnerSession()`, `clearOwnerSession()`.
- `AppShell` accepts `customers`, `smsRemaining`, `shopName`, `ownerName`, and current `activeHref` while preserving `overlay` inert behavior.
- `DashboardPage` consumes a `SalonSnapshot` and exposes working links to customer, waiting customer, booking, payment, and message flows.
- Produces `npm run tauri:dev` and `npm run tauri:info`; production `tauri:build` sidecar packaging is completed in Task 9.

- [ ] **Step 1: Write failing store, auth, and dashboard tests**

Assert seeded `shopName` is `수원 본점`, `ownerName` is `원장`, password verification, invalid-session rejection, sidebar routes with no staff link, common customer search modes, logout, configured shop/owner labels, waiting list, day+0 through day+3 booking counts, SMS quota, automation states, notices, and quick-action hrefs.

Run: `npm test -- lib/salon-store.test.ts lib/auth.test.ts components/dashboard/dashboard-page.test.tsx`

- [ ] **Step 2: Install and verify the Tauri toolchain**

Install the Windows Rust MSVC toolchain when `rustc` is absent. Add only `@tauri-apps/cli` as a development dependency. Add scripts `tauri`, `tauri:dev`, `tauri:info`, and `tauri:build`.

Run: `rustc --version && cargo --version`

- [ ] **Step 3: Scaffold the Tauri v2 development shell**

Create a minimal Tauri app named `Hairhaeyo` with identifier `com.hairhaeyo.salon`. Configure `beforeDevCommand: "npm run dev"`, `devUrl: "http://localhost:3000"`, default width `1440`, height `1000`, minimum width `1280`, and minimum height `720`. Do not set Next `output: "export"`; server actions and SQLite remain server-owned.

Run: `cargo check --manifest-path src-tauri/Cargo.toml`

Run: `npm run tauri:info`

- [ ] **Step 4: Bundle Pretendard Variable locally**

Download the upstream `PretendardVariable.woff2` and SIL OFL 1.1 text from `orioncactus/pretendard`. Load it through `next/font/local` as CSS variable `--font-pretendard`, apply it to body/form/table/chart/print text, keep system sans-serif fallbacks, and preserve tabular numerals for money/time.

- [ ] **Step 5: Implement owner-only session**

Hash passwords with `crypto.scryptSync`, use an HTTP-only same-site cookie, protect application routes in `proxy.ts`, and leave `/login` and Next assets public. Seed login help text must state the local demo owner password without logging the password.

- [ ] **Step 6: Extend AppShell and settings identity**

Replace `직원 · 설정` with `설정`. Render `수원 본점` from seeded settings and render `원장님` or `<ownerName> 원장님` from settings. Add top customer search, search-mode select, help link, SMS remaining text, owner account, and logout form. Search result links go to `/customers?customer=<id>`. Task 8 provides the editing form; Task 2 establishes the data flow.

- [ ] **Step 7: Replace static dashboard data**

Remove designer status. Render today's sales, today's bookings, waiting customers, SMS quota, single-owner booking timeline, waiting list actions, automation queue, notices, and recent audit activity from `SalonSnapshot`.

- [ ] **Step 8: Verify and commit**

Run: `npm test -- lib/salon-store.test.ts lib/auth.test.ts components/dashboard/dashboard-page.test.tsx`

Run: `npm run typecheck`

Run: `cargo check --manifest-path src-tauri/Cargo.toml`

```bash
git add package.json package-lock.json src-tauri app components lib proxy.ts THIRD_PARTY_LICENSES
git commit -m "feat(shell): add Tauri owner operations dashboard"
```

### Task 3: Implement customer management and waiting workflow

**Files:**
- Create: `app/customers/page.tsx`
- Create: `app/customer-actions.ts`
- Create: `components/customers/customers-page.tsx`
- Create: `components/customers/customers-page.test.tsx`
- Modify: `lib/salon-domain.ts`

**Interfaces:**
- Produces `saveCustomer(formData)`, `archiveCustomer(formData)`, `saveWaitingCustomer(formData)`, `completeWaitingCustomer(formData)`, `saveCustomerPolicy(formData)` Server Actions.
- `CustomersPage` consumes customers, waiting customers, settings, and related ledger/bookings/messages.

- [ ] **Step 1: Write failing render and validation tests**

Assert all registration labels from `FUNCTION.md`, ten search criteria, 150-character memo validation, phone-absent state, SMS opt-out, lunar/solar birthday, grade/group/motive, point/family/card fields, initial SMS/booking choices, history tabs, segment filters, four print layouts, and waiting-customer completion controls.

Run: `npm test -- components/customers/customers-page.test.tsx`

- [ ] **Step 2: Implement customer Server Actions**

Validate required name, phone rules, memo length, duplicate name/phone override, point integer, and SMS preference. Use soft archive and audit history. Initial booking, initial message, and waiting-list registration append linked records in the same action.

- [ ] **Step 3: Build the customer route**

Render search/list on the left and a query-selected detail drawer on the right. Detail tabs: 기본정보, 예약, 시술·결제, 상품, 포인트, 쿠폰·선불, 문자. Add segment presets for power, sales threshold, grade, group, gender, motive, recent/nonvisit, and birthday.

- [ ] **Step 4: Implement waiting and bulk actions**

Add waiting name/memo form, existing-member payment link, complete/archive actions, group/grade update forms, message target link, and print layout selector.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- components/customers/customers-page.test.tsx lib/salon-store.test.ts && npm run typecheck`

```bash
git add app/customers app/customer-actions.ts components/customers lib
git commit -m "feat(customers): add complete customer workflows"
```

### Task 4: Implement single-owner booking and Naver boundary

**Files:**
- Create: `app/bookings/page.tsx`
- Create: `app/booking-actions.ts`
- Create: `components/bookings/bookings-page.tsx`
- Create: `components/bookings/bookings-page.test.tsx`
- Create: `lib/booking.ts`
- Create: `lib/booking.test.ts`

**Interfaces:**
- Produces `bookingOverlaps(candidate, existing, slotMinutes): boolean`.
- Produces `saveBooking`, `changeBookingStatus`, `cancelBooking`, `saveBookingSettings`, `requestNaverSync` Server Actions.

- [ ] **Step 1: Write failing booking rules tests**

Test overlap blocked/allowed, operating-hour bounds, slot increments, create/edit/cancel/status history, reminder flags, and disabled Naver sync without credentials.

- [ ] **Step 2: Implement booking rules and actions**

Use a single owner calendar with no designer field. Validate customer or new-customer data, service, start/end, status, memo, overlap policy, opening hours, and time unit. Archive cancellations and audit all changes.

- [ ] **Step 3: Build day/month/period views**

Add previous/today/next navigation, view tabs, date list, status labels, working reservation form, edit/cancel actions, and links to customer details. Preserve booking query state in the URL.

- [ ] **Step 4: Implement reminders and Naver settings state**

Expose day-before/day-of toggles and extra visit-date text. Render Smart Place guide, code/account/shop/contact/memo fields, FAQ/customer center/Pay center/reference links, sync status, conflict rule, and retry history. `requestNaverSync` records a dry-run when credentials are absent.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- lib/booking.test.ts components/bookings/bookings-page.test.tsx && npm run typecheck`

```bash
git add app/bookings app/booking-actions.ts components/bookings lib/booking*
git commit -m "feat(bookings): add owner booking board"
```

### Task 5: Implement payment ledger and simplified revenue page

**Files:**
- Create: `lib/finance.ts`
- Create: `lib/finance.test.ts`
- Create: `app/payment-actions.ts`
- Create: `components/sales/payment-form.tsx`
- Create: `components/sales/payment-form.test.tsx`
- Modify: `components/sales/revenue-analytics.ts`
- Modify: `components/sales/revenue-query.ts`
- Modify: `components/sales/revenue-query.test.ts`
- Modify: `components/sales/revenue-dashboard.tsx`
- Modify: `components/sales/revenue-dashboard.test.tsx`
- Modify: `components/sales/revenue-detail-drawer.tsx`
- Modify: `app/sales/page.tsx`
- Modify: `app/sales/transactions/page.tsx`
- Modify: `lib/revenue-data.ts`
- Modify: `lib/revenue-data.test.ts`

**Interfaces:**
- Produces `calculatePayment(input): PaymentTotals` with gross, discount, points, netPaid, VAT, fee, expense, shopProfit.
- Revenue query becomes `{ view: "day" | "month" | "total"; cursor: string }` with previous/next helpers.
- Revenue analytics contains today/month/total totals, trend, services, payments, genders, visitTypes, settlement, and transactions; no staff series.

- [ ] **Step 1: Write failing finance and revenue tests**

Test eight payment methods, split totals, VAT included/separate, discount, points, fee rounding, duplicate request key, refund/correction history, zero data, day/month/total navigation, no staff values, and shared aggregate parity.

- [ ] **Step 2: Implement immutable payment actions**

Implement member/non-member, service major/detail/style, manual final amount, eight payment methods, point earn/use, owner implicit operator, general/medicine/scalp/hair notes, date/time, SMS choice, VAT, discount, fee, save, refund, and correction actions. Never update an existing ledger row.

- [ ] **Step 3: Simplify revenue navigation and KPI**

Remove start/end, compare, staff, service, and payment filter controls from the primary view. Always show `오늘 매출`, `이번 달 매출`, `누적 매출`; add `일별`, `월별`, `누적` tabs and previous/next arrows for day/month.

- [ ] **Step 4: Replace complex charts**

Keep one trend line, service bars, payment pie, gender bars, and new/returning bars. Remove the designer chart. Replace the deduction waterfall with a settlement table. Use Recharts `LabelList` or an equivalent label renderer so every bar shows `₩금액` at its end. Do not render `Tooltip` inside bar charts. Keep the pie `Tooltip`.

- [ ] **Step 5: Preserve operational functions**

Keep CSV, print, transaction drawer, keyboard value buttons, transaction route, correction/refund labels, and accessible tables. Ensure the payment form is a `/sales` tab and customer/waiting links can preselect a customer.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- lib/finance.test.ts lib/revenue-data.test.ts components/sales/revenue-query.test.ts components/sales/revenue-dashboard.test.tsx components/sales/payment-form.test.tsx app/sales/page.test.tsx app/sales/transactions/page.test.tsx && npm run typecheck`

```bash
git add app/sales app/payment-actions.ts components/sales lib
git commit -m "feat(sales): add owner payments and simple revenue"
```

### Task 6: Implement product sales, coupons, prepaid, expenses, and catalog

**Files:**
- Create: `app/products/page.tsx`
- Create: `app/product-actions.ts`
- Create: `components/products/products-page.tsx`
- Create: `components/products/products-page.test.tsx`
- Create: `lib/coupons.ts`
- Create: `lib/coupons.test.ts`

**Interfaces:**
- Produces `sellProduct`, `correctProductSale`, `saveCatalogItem`, `sellCoupon`, `deductCoupon`, `saveExpense`, `correctExpense`, `savePreset` Server Actions.
- Coupon helper rejects deductions greater than balance and returns an immutable balance history.

- [ ] **Step 1: Write failing product and coupon tests**

Test product sale fields, implicit owner seller, cost/VAT/fee/profit/points, correction history, coupon category/name/price, sale/deduction/balance/history, quick memo, automatic-message event, ledger reflection, expense presets, period totals, reconciliation, and overdraft rejection.

- [ ] **Step 2: Implement actions and immutable ledger entries**

Product sale, coupon sale/deduction, refund, and expense each append ledger entries and audit events. Corrections append linked inverse/replacement entries.

- [ ] **Step 3: Build the Products/Coupons route**

Tabs: 상품 판매, 판매 이력, 쿠폰·선불권, 시술·상품 설정, 메모·상태값, 지출 항목. Include service major/detail/price, product category/name/price/supplier, scalp states, hair traits, selected memo, gifts, convenient memo values, and printable price list.

- [ ] **Step 4: Add expense/reconciliation tab to Sales**

Render expense entry, preset, period list, settlement totals, correction, and print from the same ledger aggregate.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- lib/coupons.test.ts components/products/products-page.test.tsx lib/finance.test.ts && npm run typecheck`

```bash
git add app/products app/product-actions.ts components/products components/sales lib
git commit -m "feat(products): add catalog coupon and expense flows"
```

### Task 7: Implement SMS/LMS composer and automation

**Files:**
- Create: `app/messages/page.tsx`
- Create: `app/message-actions.ts`
- Create: `components/messages/messages-page.tsx`
- Create: `components/messages/messages-page.test.tsx`
- Create: `lib/messages.ts`
- Create: `lib/messages.test.ts`

**Interfaces:**
- Produces `messageBytes(text): number`, `messageType(text): "SMS" | "LMS"`, `eligibleRecipients(customers,segment)`.
- Produces `queueMessage`, `saveMessageTemplate`, `saveAutomationRule` Server Actions.

- [ ] **Step 1: Write failing message tests**

Test max three individual recipients, sender, SMS/LMS byte threshold, immediate/scheduled date validation, opt-out exclusion, quota exhaustion, duplicate request key, all/women/men/power segments, templates, and every automatic-message rule.

- [ ] **Step 2: Implement pure message rules and queue actions**

Use UTF-8 byte count, reject past schedules, preview excluded recipients and quota before enqueue, and create audit events. Without provider credentials, queue status is `dry-run`; do not report delivery.

- [ ] **Step 3: Build the messaging route**

Tabs: 개별 문자, 단체 문자, 템플릿, 자동 문자, 발송 이력. Show recipient preview, message type, bytes, expected quota, schedule fields, sample/template copy, remaining quota, and status labels.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- lib/messages.test.ts components/messages/messages-page.test.tsx && npm run typecheck`

```bash
git add app/messages app/message-actions.ts components/messages lib/messages*
git commit -m "feat(messages): add SMS workflows"
```

### Task 8: Implement shop settings, help, notices, and final coverage mapping

**Files:**
- Create: `app/settings/page.tsx`
- Create: `app/settings-actions.ts`
- Create: `components/settings/settings-page.tsx`
- Create: `components/settings/settings-page.test.tsx`
- Modify: `components/app-shell.tsx`
- Modify: `docs/function-coverage-matrix.md`
- Modify: `lib/function-coverage.test.ts`

**Interfaces:**
- Produces `saveShopSettings`, `changeOwnerPassword`, `saveNotice`, `saveNaverSettings` Server Actions.

- [ ] **Step 1: Write failing settings tests**

Assert shop name/phone, owner/admin password, display colors/movement/mode, hidden menus, SMS enabled, default gender/SMS, grades/groups/motives, points, VAT, card fee, coupon/product VAT, overlap, operating hours, automation, booking copy, Naver fields, terms/help/FAQ/notices, and settings change history.

- [ ] **Step 2: Implement grouped settings UI**

Use a left section list and right form for 매장·원장계정, 고객정책, 결제정책, 예약, 문자자동화, 외부연동, 도움말·공지. Validate rate range `0..100`, opening start before end, colors, and password confirmation.

- [ ] **Step 3: Apply menu and common-screen settings**

AppShell reads menu visibility and display tokens from settings while server route access remains owner-only. Notices/help/FAQ open from the top bar and dashboard.

- [ ] **Step 4: Reconcile the coverage matrix**

Update every row to `구현`, `원장 1인 대체`, or `연동 확인 필요`. No row may remain `계획`. Add exact tests or QA evidence paths.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- components/settings/settings-page.test.tsx lib/function-coverage.test.ts && npm run typecheck`

```bash
git add app/settings app/settings-actions.ts components/settings components/app-shell.tsx docs/function-coverage-matrix.md lib/function-coverage.test.ts
git commit -m "feat(settings): complete owner shop settings"
```

### Task 9: Full verification, Playwright QA, review, and push

**Files:**
- Create: `docs/qa/hairhaeyo-owner-operations-qa.md`
- Create: `scripts/prepare-tauri-sidecar.mjs`
- Create: `next.config.ts`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`
- Modify: implementation files only for verified defects.

**Interfaces:**
- Produces final browser evidence and a branch with no unmapped function.

- [ ] **Step 1: Run repository verification**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Run: `npm audit --omit=dev`

Run forbidden-brand scan; expected `0`.

Run function count and coverage tests; expected top `253`, nested `10`, all `263`, unmapped `0`.

- [ ] **Step 2: Package the production Tauri sidecar**

Set Next `output: "standalone"`. `scripts/prepare-tauri-sidecar.mjs` copies `.next/static` and `public` into `.next/standalone`, copies the current Windows `node.exe` to the Tauri target-triple sidecar name, and leaves the Next server files as Tauri resources. Rust starts the Node sidecar on `127.0.0.1`, passes an app-data SQLite path, waits for readiness, opens the main window, and kills the child on exit. Mark the fixed loopback port ceiling with `ponytail: fixed local port; allocate dynamically if multi-instance desktop use is introduced`.

Run: `npm run tauri:build`

- [ ] **Step 3: Run critical Playwright flows at 1280×900 and 1440×1000**

Exercise login/logout, global customer search, customer registration/edit/history, waiting→payment, booking create/edit/cancel/status/overlap, payment duplicate/correction/refund, coupon sale/deduction, product sale, expense correction, individual/group/scheduled message dry-run, automation settings, and Naver disabled state.

- [ ] **Step 4: Verify simplified revenue visuals and typography**

Check today/month/total cards, day/month arrows, trend motion, bar-end money labels without bar tooltips, pie tooltip, gender/new-returning views, settlement table, CSV, print, drawer, reduced motion, zero data, Pretendard loading, Korean alignment, and no horizontal overflow or label clipping.

- [ ] **Step 5: Run Tauri smoke QA**

Launch the built Windows app, verify `수원 본점`, configured owner display name, login/logout, local SQLite persistence after restart, keyboard navigation, print, and clean sidecar shutdown.

- [ ] **Step 6: Request final code review**

Fix every Critical and Important finding. Re-run focused tests after each fix and the full verification suite after the final fix.

- [ ] **Step 7: Commit QA and push**

```bash
git add .
git commit -m "test: verify complete owner operations"
git push -u origin codex/full-salon-workflows
```

## Plan self-review

- Actual repository paths are used; no `src/` path remains.
- All domains in `FUNCTION.md` have an implementation task.
- Designer/staff-specific bullets have explicit owner-only replacements.
- Revenue simplification, permanent bar-end values, and pie tooltip preservation have exact implementation and QA steps.
- External SMS/Naver behavior is visible and testable without claiming a real send or sync.
- The final gate checks counts and exact bullet mapping, not only route presence.
- Tauri preserves the server-owned Next/SQLite architecture through a loopback sidecar instead of static export.
- `수원 본점`, settings-owned owner display, and locally bundled Pretendard have implementation and QA steps.
