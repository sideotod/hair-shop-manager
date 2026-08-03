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

**FUNCTION.md mappings:**
- `FUNCTION.md §0 공통 기능`: owner authentication, shared desktop shell, navigation, help, logout, and common customer search entry point.
- `FUNCTION.md §1.1 운영 현황`: snapshot-driven sales, booking, waiting, SMS, automation, and audit dashboard status.
- `FUNCTION.md §1.2 안내`: operational notices displayed from persisted salon records.
- `FUNCTION.md §2.2 고객 검색/조회`: ten-mode customer search and customer-detail links in the shared shell.
- `FUNCTION.md §2.4 대기 고객`: waiting-customer count, list, registration, customer, and payment links.
- `FUNCTION.md §8 매장 설정`: persisted shop name, owner label, and SMS quota surfaced throughout the shell.

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

### Task 6: Implement expenses, service catalog, and memo/state settings

**Files:**
- Create: `app/operations/page.tsx`
- Create: `app/operation-actions.ts`
- Create: `components/operations/operations-page.tsx`
- Create: `components/operations/operations-page.test.tsx`
- Modify: `components/sales/revenue-analytics.ts`
- Modify: `components/sales/revenue-dashboard.tsx`
- Modify: `app/sales/page.tsx`

**Interfaces:**
- Produces `saveCatalogItem`, `saveExpense`, `correctExpense`, and `savePreset` Server Actions.
- Product sales, coupons, and prepaid balances are explicitly excluded by user approval on 2026-08-03; coverage rows map them to `사용자 승인 제외` instead of silently representing them as implemented.

- [x] **Step 1: Write focused expense and catalog tests**

Test immutable expense entries, linked correction history, presets, period totals, reconciliation, service major/detail/price, scalp states, hair traits, selected memo, gifts, convenient memo values, and printable price list.

- [x] **Step 2: Implement expense actions and immutable ledger entries**

Expense save appends ledger and audit entries. Corrections append linked inverse/replacement entries and never update prior rows.

- [x] **Step 3: Build the operations route**

Tabs: 시술 설정, 메모·상태값, 지출 항목. Include service major/detail/price, scalp states, hair traits, selected memo, gifts, convenient memo values, and printable service price list. Do not expose product, coupon, or prepaid tabs.

- [x] **Step 4: Add expense/reconciliation tab to Sales**

Render expense entry, preset, period list, settlement totals, correction, and print from the same ledger aggregate.

- [x] **Step 5: Verify and commit**

Run: `npm test -- components/operations/operations-page.test.tsx lib/finance.test.ts app/sales/page.test.tsx && npm run typecheck`

```bash
git add app/operations app/operation-actions.ts components/operations components/sales lib docs/superpowers/plans
git commit -m "feat(operations): add expenses and service catalog"
```

### Task 7: Implement minimal SMS/LMS dry-run and automation settings

**Files:**
- Create: `app/messages/page.tsx`
- Create: `app/message-actions.ts`
- Create: `components/messages/messages-page.tsx`
- Create: `components/messages/messages-page.test.tsx`
- Create: `lib/messages.ts`
- Create: `lib/messages.test.ts`

**Interfaces:**
- Produces `messageBytes(text): number`, `messageType(text): "SMS" | "LMS"`, and `eligibleRecipients(customers,segment)`.
- Produces minimal `queueMessage` and `saveAutomationRule` Server Actions. Real provider delivery, full template management, and delivery tracking are explicitly excluded; all submissions remain `dry-run`.

- [ ] **Step 1: Write failing message tests**

Test max three individual recipients, SMS/LMS byte threshold, opt-out exclusion, quota exhaustion, duplicate request key, basic segments, and dry-run status.

- [ ] **Step 2: Implement pure message rules and queue actions**

Use UTF-8 byte count, reject past schedules, preview excluded recipients and quota before enqueue, and create audit events. Queue status is always `dry-run`; do not add provider dependencies or report delivery.

- [ ] **Step 3: Build the messaging route**

Provide one compact desktop page for individual/group dry-run composition, recipient preview, message type, bytes, expected quota, remaining quota, status labels, and basic automatic-message toggles. Do not build a full template library or delivery-history system.

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

### Task 9: Full verification, Playwright QA, review, and first main push

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

- [ ] **Step 7: Commit QA, integrate to main, and push**

```bash
git add .
git commit -m "test: verify complete owner operations"
git checkout main
git merge --ff-only codex/full-salon-workflows
git push origin main
```

### Task 10: Implement Naver booking email IMAP synchronization and second main push

**Files:**
- Create: `lib/naver-mail.ts`
- Create: `lib/naver-mail.test.ts`
- Create: `lib/windows-credential.ts`
- Create: `lib/windows-credential.test.ts`
- Create: `scripts/windows-credential.ps1`
- Create: `app/naver-mail-actions.ts`
- Create: `components/bookings/naver-mail-connection.tsx`
- Create: `components/bookings/naver-mail-connection.test.tsx`
- Modify: `app/bookings/page.tsx`
- Modify: `components/bookings/bookings-page.tsx`
- Modify: `lib/salon-store.ts`
- Modify: `lib/salon-domain.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `docs/qa/hairhaeyo-owner-operations-qa.md`

**Interfaces:**
- Produces `testNaverMailConnection(input)`, `connectNaverMail(formData)`, `importInitialNaverBookings(formData)`, and `syncNewNaverBookings()`.
- Produces `classifyNaverBookingMail(message): "requested" | "confirmed" | "changed" | "cancelled" | null` and `mergeNaverBookingMail(existing, message)` using the Naver reservation number as the idempotency key.
- Produces `writeWindowsCredential(target, username, secret)`, `readWindowsCredential(target)`, and `deleteWindowsCredential(target)` without placing the application password in command-line arguments, SQLite, logs, audit payloads, or rendered HTML.
- Persists only non-secret connection metadata: `{ email, provider: "naver", connected, lastSyncUid, lastSyncAt }`.

- [ ] **Step 1: Add IMAP and mail parsing dependencies**

Add only `imapflow` and `mailparser` plus their required TypeScript types. Use `imap.naver.com:993` with TLS. Do not implement SMTP or outbound mail.

- [ ] **Step 2: Implement Windows Credential Manager boundary**

Use the native Windows Credential Manager `CredWriteW`, `CredReadW`, and `CredDeleteW` APIs from `Advapi32.dll` through `scripts/windows-credential.ps1`. Pass request JSON through stdin and return response JSON through stdout so the application password never appears in the process command line. The credential target is `Hairhaeyo:NaverBookingMail`; zero secret buffers after use where supported.

Test the TypeScript boundary with an injected process runner. Test write/read/delete commands, malformed helper output, helper failure, and secret redaction. Run: `npm test -- lib/windows-credential.test.ts`.

- [ ] **Step 3: Implement Naver reservation mail parsing and merge rules**

Parse subject, sender, HTML/text body, UID, received time, reservation number, customer name/phone, service, start/end, and reservation status. Classify reservation request, confirmation, change, and cancellation. Merge by reservation number; ignore the same/lower UID; apply a higher UID as the newest state; archive the local booking on cancellation while preserving status history and audit actor `원장`.

Use TDD for parser classification, UID idempotency, duplicate removal, change ordering, cancellation, malformed mail, and no-reservation-number cases. Run: `npm test -- lib/naver-mail.test.ts`.

- [ ] **Step 4: Implement connection, initial import, and incremental sync actions**

The connection flow is exact: `네이버 예약 메일 연동` → method/privacy notice → Naver email → application password → connection test → reservation-mail discovery → initial import. On success, store the password only in Windows Credential Manager and persist metadata with `provider: "naver"`, `connected: true`, the highest imported UID, and KST `lastSyncAt`.

On later app launches, load the stored credential, read `lastSyncUid`, query only higher UIDs, deduplicate by UID and reservation number, update local booking states, and advance the checkpoint only after the database writes succeed. Authentication/search/parse failures must leave the prior checkpoint unchanged and render a non-secret correction message.

- [ ] **Step 5: Add the bookings-page connection workflow**

Replace the old generic Naver credential fields with a staged desktop web form for the exact eight-step flow. Show application-password creation guidance, privacy/storage notice, connection status, last sync UID/time, initial-import count, incremental-sync result, retry history, and disconnect action. Browser-only delivery may show `Windows Credential Manager 사용 가능 환경에서 연결` when the native credential helper is unavailable; it must not fall back to plaintext storage.

- [ ] **Step 6: Add startup incremental synchronization**

When the local Next server first serves the bookings/dashboard flow for an authenticated owner session, run one guarded incremental sync per process. Prevent concurrent duplicate sync with a module-level promise; release it after completion. Mark the ceiling with `ponytail: single-process startup sync; use a DB lease if multi-process desktop instances are introduced`.

- [ ] **Step 7: Verify, review, and push main again**

Run: `npm test -- lib/naver-mail.test.ts lib/windows-credential.test.ts components/bookings/naver-mail-connection.test.tsx app/booking-actions.test.ts lib/booking.test.ts`

Run: `npm test && npm run typecheck && npm run build && npm audit --omit=dev`.

Run Playwright at 1280×900 and 1440×1000 for notice, validation, failed authentication, successful mocked connection, initial import, duplicate suppression, changed/cancelled mail, restart checkpoint, secret redaction, and disconnect. Run a real Windows Credential Manager write/read/delete smoke check with a disposable credential target; never use or print the user's actual password.

```bash
git add app components lib scripts package.json package-lock.json docs/qa
git commit -m "feat(bookings): sync Naver reservation mail"
git push origin main
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
- Naver booking synchronization uses inbound IMAP only, stores its application password in Windows Credential Manager, merges by reservation number and UID, and advances its checkpoint only after successful local database writes.
