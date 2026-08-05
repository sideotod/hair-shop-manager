# Desktop UI flow audit and remediation

**Goal:** Confirm every implemented desktop route and its primary in-page states at 1280px and 1440px, then make only evidence-backed UI corrections.

**Scope and traceability:** `AGENTS.md` requires a 1280px minimum desktop UI, Playwright validation, keyboard/semantic access, and no changes to financial semantics. The route inventory and legacy mapping are `FUNCTION.md` and `docs/function-coverage-matrix.md`.

## Page migration ledger

A page is struck through only after its normal view and relevant click state have been checked at both target widths.

- [x] ~~`/` — dashboard, quick actions, empty timeline. `FUNCTION.md` §1~~
- [x] ~~`/customers` — list, customer registration, selected customer, waiting flow. `FUNCTION.md` §2~~
- [x] ~~`/bookings` — board and booking registration. `FUNCTION.md` §5~~
- [x] ~~`/sales` — hydrated analytics, payment registration, expense/settlement. `FUNCTION.md` §3~~
- [x] ~~`/sales/transactions` — transaction and correction entry. `FUNCTION.md` §3~~
- [x] ~~`/messages` — composer, recipient preview, automation anchor. `FUNCTION.md` §4~~
- [x] ~~`/operations` — expense tab and regional hierarchy. `FUNCTION.md` §§3, 7~~
- [x] ~~`/settings` — section navigation and customer policy. `FUNCTION.md` §§0, 8~~

## Executed work

### 1. Evidence matrix

**Traceability:** `FUNCTION.md` §§0–8.

- [x] Exercise every route above through its visible link/button where one exists, without submitting destructive financial or message actions.
- [x] Check the persistent shell, changing content region, horizontal overflow, labels, and visible keyboard focus affordance at 1280px and 1440px.
- [x] Record screenshots and the final finding in `.audit-screenshots/2026-08-05-ui-flow-notes.md`.

### 2. Compact the dashboard empty timeline

**Traceability:** `FUNCTION.md` §1 — today's booking status and quick booking path.

**Files:** `components/dashboard/dashboard-page.tsx`, `components/dashboard/dashboard-page.test.tsx`

- [x] Add a focused structural regression assertion.
- [x] Fix the root cause: the enclosing grid stretched to its flex remainder with `items-stretch`, defeating the empty-state height. Let the grid take natural height and align its items at the start.
- [x] Verify focused test, typecheck, and the real 1280px empty state.

### 3. Resolve suspected long-form CTA issue

**Traceability:** `FUNCTION.md` §§2–3 — customer and payment registration/save.

- [x] Measure customer and payment registration at both widths through their visible entry actions.
- [x] Inspect the complete scroll path and submit controls.
- [x] **No code change:** each form has one native submit action, remains unclipped, and reaches that action in normal document flow. A sticky or duplicate save button would add UI without addressing a defect.

### 4. Verify expense and connected page regions

**Traceability:** `FUNCTION.md` §§3, 4, 7, 8.

- [x] Confirm expense registration, presets, settlement, and ledger remain separate labelled regions in `/sales` and `/operations`.
- [x] Confirm the message automation anchor preserves the shell and its independent scroll regions.
- [x] Confirm settings selection and transaction correction retain their correct content state.

### 5. Final regression gate

**Traceability:** `AGENTS.md` Web UI, Traceability, and Financial rules.

- [x] Run full automated regression, typecheck, and whitespace/diff validation.
- [x] Record browser-console result and command output in the evidence note.
