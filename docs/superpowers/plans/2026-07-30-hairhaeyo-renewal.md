# Hairhaeyo Salon Management Web App Implementation Plan

> Mandatory gate: root `AGENTS.md` and `FUNCTION.md` apply to every task. No legacy function or subfunction may be omitted; consolidation is allowed only with explicit traceability and tests.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the legacy salon customer, booking, sales, messaging, product, staff, and settings system as the Hairhaeyo desktop web app without dropping any inventoried subfunction.

**Architecture:** Use Next.js App Router with one authenticated web app, a shared AppShell, server-enforced permissions, domain modules, and a single customer identity used by booking, payment, messaging, points, and coupons. Server Components load initial data; Client Components are limited to interactive forms, tables, calendars, drawers, and dialogs. Preserve all legacy behaviors first; improve navigation and presentation without silently changing financial or messaging rules.

**Tech Stack:** Next.js App Router, React, TypeScript strict mode, Tailwind CSS, native browser date/time controls, server-side validation, relational persistence, and the repository's existing test runner. Use Recharts 3.x only for the revenue analytics charts; do not add a dashboard framework or a second chart library.

## Global Constraints

- Desktop web app only; target 1440px and minimum supported width 1280px.
- Implementation stack is Next.js + TypeScript + Tailwind CSS.
- Use Next.js App Router under `src/app`; do not add Pages Router routes.
- Enable TypeScript `strict`; do not use untyped domain objects or broad `any`.
- Use Tailwind CSS and CSS variables for design tokens; do not add CSS-in-JS.
- Every item in `FUNCTION.md` must map to a screen, action, API operation, or explicit verification item.
- Never send SMS, change external Naver data, delete records, or alter financial data in tests without a test account.
- Validate all money, permission, customer privacy, and message-recipient inputs at trust boundaries.
- Record audit events for customer, booking, payment, refund/correction, SMS, coupon, staff, and settings changes.
- Prefer existing code, standard library, native controls, and installed dependencies.

## Planned Files

- Create: `docs/domain-map.md` — entities, relationships, legacy field mapping, unresolved rules.
- Create: `src/app/(app)/layout.tsx` — authenticated AppShell route layout.
- Create: `src/app/(app)/*/page.tsx` — dashboard, booking, customer, sales, messaging, product/coupon, staff, settings routes.
- Create: `src/components/` — shared Tailwind UI components.
- Create: `src/features/dashboard/` — today view and operational summary.
- Create: `src/features/customers/` — customer records, search, groups, grades, waiting list.
- Create: `src/features/bookings/` — calendar, reservations, operating hours, Naver boundary.
- Create: `src/features/sales/` — service payment, product sale, revenue, expenses, coupons.
- Create: `src/features/messaging/` — SMS/LMS composition, segments, templates, automation.
- Create: `src/features/staff/` — staff, roles, commissions, access rules.
- Create: `src/features/settings/` — shop, service catalog, customer policy, automation, external links.
- Create: `src/lib/` — validation, money/date helpers, permission checks, audit event writer.
- Modify: `src/app/globals.css` — Tailwind layers and design-token CSS variables.
- Modify: `tailwind.config.ts` — theme token mapping and content paths.
- Modify: `tsconfig.json` — strict TypeScript and import aliases.
- Test: `tests/` — one focused test per domain risk, plus end-to-end critical flows.

### Task 1: Lock domain model and legacy mapping

**Files:**
- Create: `docs/domain-map.md`
- Test: `tests/domain-map.test.*`

**Interfaces:**
- Produces canonical entities: `Customer`, `WaitingCustomer`, `Booking`, `Service`, `Payment`, `ProductSale`, `Coupon`, `Message`, `Staff`, `ShopSetting`, `AuditEvent`.

- [ ] Extract every field from `FUNCTION.md` into entity attributes, including legacy names such as phone parts, lunar birthday, point number, VAT, fees, incentive fields, SMS schedules, and Naver codes.
- [ ] Define money as integer minor units and dates/times with explicit shop timezone.
- [ ] Define links: customer→bookings/payments/messages/coupons; booking→customer/staff/services; payment→service/product/customer/staff; settings→automation rules.
- [ ] Mark unresolved behavior from `FUNCTION.md` as an acceptance test, not an implicit implementation choice.
- [ ] Run schema/type validation and commit mapping document.

### Task 2: Build authenticated AppShell and permissions

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/app-shell.tsx`
- Create: `src/components/sidebar.tsx`
- Create: `src/features/customers/global-customer-search.tsx`
- Create: `src/lib/permissions.ts`
- Test: `tests/app-shell.test.tsx`

**Interfaces:**
- Consumes `Staff` and permission claims.
- Produces routes for dashboard, bookings, customers, sales, messaging, products/coupons, staff, settings.

- [ ] Render sidebar groups from the fixed information architecture in `DESIGN.md`.
- [ ] Implement global customer search using all ten legacy search modes.
- [ ] Open customer results in a drawer without losing current page state.
- [ ] Enforce permissions in route loaders/API handlers, then hide unavailable actions in UI.
- [ ] Test unauthorized access, keyboard search, masked phone display, and browser refresh.

### Task 3: Implement customers and waiting list

**Files:**
- Create: `src/app/(app)/customers/page.tsx`
- Create: `src/features/customers/customer-list.tsx`
- Create: `src/features/customers/customer-form.tsx`
- Create: `src/features/customers/customer-drawer.tsx`
- Create: `src/features/customers/waiting-list.tsx`
- Create: `src/features/customers/customer-service.ts`
- Test: `tests/customers.test.tsx`

**Interfaces:**
- Consumes shared search, validation, permissions, audit writer.
- Produces customer IDs usable by bookings, payments, messages, points, and coupons.

- [ ] Implement all registration fields from `FUNCTION.md`, including gender, phone, address, email, nickname, lunar/solar birthday, point, family number, grade, group, motive, memo, first meeting, join date, SMS preference, and initial booking/message.
- [ ] Implement list filters, saved filters, bulk grade/group changes, print action, and customer drawer tabs.
- [ ] Implement waiting customer add, list, link-to-existing-customer, and completion behavior after verification.
- [ ] Add duplicate detection on phone/name while allowing deliberate override with audit event.
- [ ] Test 10 search modes, SMS opt-out, lunar birthday storage, 150-character memo, and waiting-to-payment flow.

### Task 4: Implement bookings and Naver integration boundary

**Files:**
- Create: `src/app/(app)/bookings/page.tsx`
- Create: `src/features/bookings/booking-board.tsx`
- Create: `src/features/bookings/booking-form.tsx`
- Create: `src/features/bookings/booking-service.ts`
- Create: `src/features/bookings/naver-adapter.ts`
- Test: `tests/bookings.test.tsx`

**Interfaces:**
- Consumes customer, staff, service catalog, operating-hours settings.
- Produces booking records and automation events.

- [ ] Implement month/week/day views, designer columns, time slots, booking create/edit/cancel/status actions, memo, service, and customer link.
- [ ] Enforce operating hours, fixed times, time-unit settings, and overlap policy on the server.
- [ ] Emit events for created/changed/cancelled booking and reservation reminders.
- [ ] Keep Naver integration behind an adapter with explicit credentials, code mapping, sync status, retry log, and conflict policy.
- [ ] Test overlap blocked/allowed, time zone, cancellation, reminder timing, and disabled external integration.

### Task 5: Implement services, payments, revenue, products, expenses, coupons

**Files:**
- Create: `src/app/(app)/sales/page.tsx`
- Create: `src/features/sales/payment-form.tsx`
- Create: `src/features/sales/revenue-reports.tsx`
- Create: `src/features/sales/product-sales.tsx`
- Create: `src/features/sales/coupons.tsx`
- Create: `src/features/sales/expenses.tsx`
- Create: `src/features/sales/sales-service.ts`
- Test: `tests/sales.test.tsx`

**Interfaces:**
- Consumes customer, staff, service catalog, tax/fee settings.
- Produces immutable financial records plus correction/refund records and audit events.

- [ ] Implement all service categories and detail menus, direct style entry, member/non-member, eight payment methods, discount, point, VAT, fee, incentive, shop-profit, memo, date/time, and same-day SMS choice.
- [ ] Implement daily/monthly/period revenue, service/staff/payment breakdowns, VAT, fee, incentive, shop profit, correction, print/export.
- [ ] Implement product sale with seller, supplier, product, sale price, cost, VAT, fee, incentive, profit, point, memo, history, correction.
- [ ] Implement coupon category, ticket name, price, sale, balance, deduction, quick memo, history, and coupon-triggered messages.
- [ ] Implement expense presets, expense entry, period view, correction, and reconciliation.
- [ ] Test integer money arithmetic, discount/tax/fee rounding, point balance, duplicate submit, correction audit, coupon overdraft, and non-member restrictions.

### Task 5A: Build revenue analytics and visual QA

**Files:**
- Create: `src/features/sales/revenue-dashboard.tsx`
- Create: `src/features/sales/revenue-charts.tsx`
- Create: `src/features/sales/revenue-summary-table.tsx`
- Modify: `src/app/(app)/sales/page.tsx`
- Modify: `src/features/sales/sales-service.ts`
- Test: `tests/revenue-dashboard.test.tsx`
- Test: `tests/e2e/revenue-dashboard.*`

**Interfaces:**
- Consumes server-produced `RevenueAnalytics` containing the selected period, comparison period, gross sales, refunds, VAT, fees, incentives, expenses, shop profit, transaction count, average ticket, and daily/service/staff/payment-method breakdowns.
- Produces a filterable desktop revenue page; charts and the accessible summary table must render from the same immutable response without recalculating financial totals in the browser.

- [ ] Add `recharts@3` when this task starts and lock the resolved version. Recharts is the single chart dependency because its React 19-compatible SVG components cover responsive line, bar, stacked bar, and tooltip behavior with less custom code than native SVG; skip Chart.js canvas, Visx/Nivo composition, and dashboard frameworks.
- [ ] Implement period presets (today, 7 days, this month, previous month) plus native start/end date inputs, comparison toggle, service/staff/payment filters, reset, print, and CSV export.
- [ ] Render KPI cards for gross sales, shop profit, transaction count, and average ticket with prior-period delta and explicit positive/negative text.
- [ ] Render five decision-focused visuals: daily gross/profit trend, payment-method share, service-category revenue ranking, staff revenue/profit ranking, and gross-to-net deductions (refund/VAT/fee/incentive/expense to shop profit).
- [ ] Keep zero-data, partial-data, loading, error, and permission-limited states explicit. Tooltips use Korean currency formatting; legends and labels cannot rely on color alone.
- [ ] Provide a keyboard-reachable table containing every plotted value and a concise text summary for screen readers. Mark decorative chart shapes hidden where appropriate and preserve visible focus states.
- [ ] Test that chart points, KPI totals, table cells, printed values, and CSV values match the same fixture; verify date boundaries in the shop timezone and ensure corrections/refunds update all representations together.
- [ ] Run Playwright visual QA at 1280×800, 1440×900, 1920×1080, and 125% zoom. Inspect dense labels, long Korean staff/service names, tooltip clipping, legend wrapping, text alignment, horizontal overflow, print layout, and empty/error states; save focused screenshots for each chart and one full revenue viewport.
- [ ] Use Chrome control only for a final real-profile/browser pass when OS font rendering, browser extensions, or authenticated legacy comparison matters; deterministic regression checks remain in Playwright.

### Task 6: Implement SMS/LMS and automation

**Files:**
- Create: `src/app/(app)/messaging/page.tsx`
- Create: `src/features/messaging/composer.tsx`
- Create: `src/features/messaging/segments.tsx`
- Create: `src/features/messaging/templates.tsx`
- Create: `src/features/messaging/automation-settings.tsx`
- Create: `src/features/messaging/messaging-service.ts`
- Test: `tests/messaging.test.tsx`

**Interfaces:**
- Consumes customer segments, booking/payment/coupon events, SMS settings, provider adapter.
- Produces message jobs, delivery records, and audit events.

- [ ] Implement individual recipient max three, sender, SMS/LMS, byte count, immediate/scheduled send, scheduled date/time, opt-out exclusion, and quota decrement.
- [ ] Implement all-member, women, men, and power-customer bulk flows.
- [ ] Implement editable templates and all automation rules listed in `FUNCTION.md`, including booking-day/previous-day and post-payment sequences.
- [ ] Add a dry-run recipient preview showing opt-outs, count, expected quota, and message type before send.
- [ ] Test byte boundary, scheduled past date behavior, duplicate job prevention, opt-out, quota exhaustion, and provider failure retry.

### Task 7: Implement staff, catalog, and shop settings

**Files:**
- Create: `src/app/(app)/staff/page.tsx`
- Create: `src/app/(app)/settings/page.tsx`
- Create: `src/features/staff/staff-list.tsx`
- Create: `src/features/staff/staff-form.tsx`
- Create: `src/features/settings/service-catalog.tsx`
- Create: `src/features/settings/shop-settings.tsx`
- Create: `src/features/settings/customer-policy.tsx`
- Test: `tests/settings.test.tsx`

**Interfaces:**
- Produces staff permissions, service/product/coupon configuration, customer policy, tax/fee, operating-hour, and automation settings.

- [ ] Implement staff account, password, role, access, customer assignment, commission, incentive, reservation availability, and correction policy.
- [ ] Implement service major/detail categories, prices, scalp states, hair traits, quick memos, gifts, coupon categories/tickets, and expense presets.
- [ ] Implement shop identity, phone, passwords, colors, hidden menus, customer display settings, points, grades, VAT, card fee, coupon/product tax, overlap, opening hours, and SMS defaults.
- [ ] Implement settings change history and privileged confirmation for sensitive settings.
- [ ] Test permission matrix, invalid rate values, opening-hour bounds, hidden menu not bypassing API authorization, and settings rollback.

### Task 8: Build dashboard and operational summaries

**Files:**
- Create: `src/app/(app)/page.tsx`
- Create: `src/features/dashboard/dashboard.tsx`
- Create: `src/features/dashboard/operational-summary.tsx`
- Test: `tests/dashboard.test.tsx`

**Interfaces:**
- Consumes bookings, waiting list, payments, messages, notices, automation queue.
- Produces today/next-three-day overview and quick actions.

- [ ] Show waiting customers, today through day+3 booking counts, SMS quota, automation states, notices, and recent activity.
- [ ] Add quick actions for customer, waiting customer, booking, payment, and message.
- [ ] Preserve exact counts against domain queries; do not derive financial values only in the browser.
- [ ] Test empty day, populated day, quota warning, failed automation, and permission-limited quick actions.

### Task 9: Visual QA and migration

**Files:**
- Modify: `DESIGN.md`
- Create: `tests/e2e/critical-flows.*`
- Create: `docs/migration-runbook.md`

- [ ] Render and review desktop screens at 1280px, 1440px, 1920px, and browser zoom 125%.
- [ ] Verify keyboard focus, labels, contrast, table overflow, long Korean text, empty/error/loading states.
- [ ] Run critical flows: customer→booking→payment, customer→bulk SMS preview, payment→points, coupon sale→deduction, staff permission denial, Naver disabled state.
- [ ] Define legacy import mapping, duplicate handling, dry-run report, backup, cutover, and rollback.
- [ ] Reconcile imported customer count, payments total, points, coupons, staff, services, and settings before launch.

### Task 10: Coverage gate

**Files:**
- Create: `docs/function-coverage-matrix.md`
- Test: `tests/coverage/function-coverage.test.*`

- [ ] Copy every `FUNCTION.md` function into a coverage matrix with route/component/API/test owner.
- [ ] Mark each as implemented, intentionally deferred with approval, or blocked by external integration.
- [ ] Reject release if any unverified function lacks a documented reason and owner.
- [ ] Run the matrix check in CI and attach the final report to release notes.

## Spec coverage self-review

- Customer, waiting list, search, grouping, grades, points, birthday, SMS preference: Tasks 2–3.
- Booking, reminders, operating hours, overlap, Naver: Task 4.
- Service payment, product sale, tax, fee, incentive, expenses, coupons: Task 5.
- Revenue filters, KPI, graph/table parity, export, accessibility, and visual QA: Task 5A.
- Individual/bulk/automated SMS and quota: Task 6.
- Staff, permissions, catalog, shop policies, settings: Task 7.
- Dashboard, notices, help, quick actions: Task 8.
- Visual direction and desktop requirement: `DESIGN.md` and Task 9.
- No function omission: Task 10 coverage gate.

## Execution choice

Plan complete and saved. Recommended execution: subagent-driven development after the repository stack and test runner are identified. Inline execution is acceptable for a small existing codebase.
