# Hairhaeyo Owner Operations Design

## 1. Goal and approved product change

Hairhaeyo is a desktop web application for individual salon owners in their 40s and 50s. The renewal must implement or explicitly map every function and subfunction in `FUNCTION.md`, while applying the user's approved owner-only replacement:

- No designer registration, designer assignment, designer availability, designer commission, or designer-specific sales/profit views.
- Existing staff/designer fields are mapped to the single signed-in owner and are not shown as editable inputs.
- Owner login/password and administrator authority remain.
- Shop sales, VAT, payment fees, refunds, expenses, points, coupons, prepaid balances, corrections, print, CSV, and audit history remain required.

The inventory remains authoritative. Bullets are annotated or mapped; they are not deleted.

## 2. Approaches considered

### A. One large operations page

All customer, booking, payment, messaging, and settings functions could be placed in one page with many tabs. This reduces route count but creates a dense screen that is difficult for the target age group to scan and makes permission, loading, and error states hard to isolate.

### B. Domain hubs with drawers and dialogs — selected

Use six stable desktop routes: Today, Customers, Bookings, Sales, Messages, Products/Coupons, and Settings. Repeated lookup and editing work happens in drawers or dialogs so users keep context. Low-frequency legacy popups move into clearly named advanced sections. This gives every function a home without reproducing the old ASP navigation.

### C. Separate route for every legacy screen

This maximizes one-to-one traceability but recreates the old fragmented experience and produces unnecessary navigation. It is rejected.

## 3. Information architecture

| Route | Primary work | `FUNCTION.md` coverage |
|---|---|---|
| `/` | waiting customers, today to day+3 bookings, SMS quota, automation status, notices, quick actions | common, dashboard |
| `/customers` | registration, ten-mode search, customer detail/history, segments, waiting list, customer policy | customer management |
| `/bookings` | day/month/period schedule, create/edit/cancel/status, overlap policy, reminders, Naver boundary | booking |
| `/sales` | simple revenue overview, payment entry, transaction correction, products sales, expenses and reconciliation | sales/payment |
| `/messages` | individual/group SMS/LMS, templates, schedule, quota, automation | messaging |
| `/products` | service menu, product catalog, coupons/prepaid, memo presets, gifts and expense presets | product/service configuration |
| `/settings` | shop identity, owner account, customer policy, finance, booking, SMS, Naver, help/notices | shop settings and owner authority |

The sidebar removes the staff route. Owner identity is fixed as `원장` in records that previously required a designer or seller.

## 4. Shared shell and interaction rules

- Desktop only: baseline 1440px, minimum 1280px. No mobile navigation.
- Sidebar width remains 232px and the top bar remains 72px.
- The top bar contains the common customer search, help, owner account, and logout.
- Search supports the ten legacy criteria and opens customer details without losing the current route.
- Forms use native date/time/select controls, large 40–44px targets, explicit labels, visible focus, and Korean validation messages.
- Dangerous actions such as delete, cancel, correction, refund, coupon deduction, and message send require confirmation and create an audit record.
- Tables may scroll inside their cards at 1280px; the page itself must not scroll horizontally.

## 5. Data and server architecture

Use Node 24's built-in `node:sqlite`; do not add an ORM or database package.

- `records`: customer, waiting customer, booking, message, product, coupon, prepaid, and configuration payloads.
- `ledger`: immutable payment, product sale, coupon sale/deduction, refund, expense, and correction entries.
- `settings`: typed shop, customer, booking, finance, SMS, and Naver values.
- `audit_events`: actor, operation, entity, before/after payload, and timestamp.

Server Components read snapshots. Server Actions validate and mutate data, then revalidate the affected routes. Money is stored as integer won. Financial corrections append a new ledger entry instead of overwriting the original. Duplicate payment submission uses a request key. The SQLite implementation targets a single Hairhaeyo server instance for an individual shop; a managed SQL adapter is required only if multi-instance hosting is introduced.

External SMS and Naver functions use adapters. Without credentials they remain fully visible as dry-run/disabled states with recipient preview, configuration fields, sync status, retry history, and explicit `[추가확인]` ownership. No external send or sync is faked.

## 6. Owner-only replacement mapping

The following legacy concepts are replaced by one owner identity:

- Customer assigned staff → `원장` implicit ownership.
- Payment designer/operator → `원장` implicit operator.
- Product seller → `원장` implicit seller.
- Booking designer selection/availability → single-shop time-slot availability.
- Staff list/CRUD and designer registration → removed by approved owner-only scope.
- Staff sales/product sales → shop sales/product sales.
- Staff commission/incentive/rate settings → removed; shop profit remains gross minus refund, VAT, payment fee, and expense.
- Staff menu permissions → one owner administrator role, enforced on the server.

Historic imported staff names may be retained in audit text but are not offered as current filters or registration options.

## 7. Simplified sales experience

### 7.1 Primary totals

The top of `/sales` always shows three large cards:

1. 오늘 매출
2. 이번 달 매출
3. 누적 매출

Below them, the owner chooses `일별`, `월별`, or `누적` and moves with previous/next arrows. Arbitrary start/end date inputs are not the primary interface. Period reporting remains available through day/month navigation and the transaction ledger export.

### 7.2 Visuals

- One sales trend line for the selected day or month.
- Service-category revenue horizontal bars.
- Payment-method pie chart.
- Customer composition by gender and new/returning visits when data exists.
- A plain settlement summary for refunds, VAT, fees, expenses, and shop profit; no complex waterfall is required.

Bar charts do not show hover tooltips. Every bar displays its formatted sales amount permanently at the bar end. The pie chart keeps its current tooltip. Motion is limited to chart entry and is disabled for reduced-motion users. KPI cards, filters, forms, tables, and drawers do not move.

### 7.3 Financial consistency

KPI, charts, labels, table, CSV, print, and drawer details consume the same server aggregate. Corrections, refunds, points, coupons, prepaid use, VAT, fees, and expenses update every representation together.

## 8. Domain behavior

### Customers

Implement all registration fields, ten search criteria, detail/history tabs, edits, soft deletion/move review, customer segments, four print layouts, waiting-customer workflow, and customer policy settings. SMS opt-out is enforced in message recipient previews.

### Bookings

Use a single-owner time board rather than designer columns. Implement day/month/period views, customer/new-customer link, service, memo, status, edit/cancel, overlap policy, operating hours, time units, reminders, and Naver configuration/sync state.

### Payments and products

Implement member/non-member service payment, service/detail/style, eight payment methods, manual final amount, points, VAT, discount, fees, notes, scalp/hair notes, date/time, SMS choice, immutable save, correction/refund, product sale, coupon/prepaid sale and deduction, expenses, and reconciliation.

### Messages

Implement up to three individual recipients, group segments, SMS/LMS byte count, immediate/scheduled jobs, opt-out exclusion, quota, templates, and every automatic-message rule. Provider calls remain dry-run until credentials are configured.

### Settings

Implement shop/owner account, display, customer defaults, points, grades/groups/motives, VAT/fees, coupon/product tax, booking overlap/hours, SMS defaults/automation, Naver fields, notices, help, FAQ, and change history.

## 9. Error, empty, and correction states

- Every route has visible empty, validation-error, and save-error states.
- Financial and destructive actions show correction history rather than hiding prior values.
- External adapters show `미연결`, `확인 필요`, `동기화 실패`, and retry history using text labels, not color alone.
- A release coverage matrix maps all 253 top-level bullets and 10 nested bullets to a route, server action, background job, replacement, or external verification state.

## 10. Testing and completion gates

- Unit tests cover query/validation, overlap, SMS byte limits, recipient limits, money calculations, duplicate payment, correction/refund, points, coupons, and coverage mapping.
- SSR render tests cover every route and all required form groups.
- Playwright covers customer→booking→payment, waiting→payment, message preview/schedule, coupon sale→deduction, correction history, period navigation, bar-end labels, pie tooltip, keyboard access, and 1280px fit.
- Final checks: `npm test`, `npm run typecheck`, `npm run build`, `npm audit --omit=dev`, forbidden-brand count `0`, `FUNCTION.md` top-level count `253`, nested count `10`, and coverage matrix with no unmapped item.

## 11. Design self-review

- No placeholder or optional implementation language remains.
- The only removed behavior is the explicitly approved designer/staff-specific scope, and every removed bullet has an owner-only replacement.
- The revenue page is simpler than the current dashboard and includes the requested permanent bar-end values while preserving the pie chart tooltip.
- External SMS/Naver behavior is not falsely claimed; it has an explicit adapter and verification state.
