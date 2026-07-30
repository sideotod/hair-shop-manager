# Hairhaeyo Brand and Interactive Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every previous product-brand reference with Hairhaeyo/헤어해요 and deliver a desktop-responsive, linked interactive revenue analytics page without destabilizing record-entry workflows.

**Architecture:** Product naming is centralized in app metadata and shell copy, while legacy inventory content remains functionally unchanged under neutral “기존 시스템” wording. Revenue filters are URL-owned, one immutable `RevenueAnalytics` response feeds KPI, charts, table, CSV and print, and interaction state is isolated to the analytics page. CRUD and payment pages retain stable layouts.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, Recharts 3, Vitest, Playwright, Figma MCP

## Global Constraints

- English product name: `Hairhaeyo`.
- Korean product name: `헤어해요`.
- Product subtitle: `SALON MANAGEMENT`.
- Managed files and Figma must contain zero matches for the previous English or Korean product names.
- Desktop web only: 1280px minimum; no mobile navigation or mobile chart variants.
- Customer, booking, payment and settings screens keep stable form order and action positions.
- Responsive chart resize, linked highlight, tooltip, legend toggle and drilldown belong to analytics screens.
- KPI, chart, table, CSV and print consume the same server-shaped `RevenueAnalytics` value.
- Every `FUNCTION.md` function and subfunction remains required.

---

### Task 1: Replace product branding and rename documents

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/app-shell.tsx`
- Modify: `components/dashboard/dashboard-page.test.tsx`
- Modify: `components/sales/revenue-dashboard.test.tsx`
- Modify: `components/sales/revenue-dashboard.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `AGENTS.md`
- Modify: `DESIGN.md`
- Modify: `FUNCTION.md`
- Rename: `docs/superpowers/plans/2026-07-30-hairnuri-renewal.md` to `docs/superpowers/plans/2026-07-30-hairhaeyo-renewal.md`
- Rename: `docs/superpowers/specs/2026-07-30-hairnuri-ui-design.md` to `docs/superpowers/specs/2026-07-30-hairhaeyo-ui-design.md`

**Interfaces:**
- Consumes: approved naming constants `Hairhaeyo`, `헤어해요`, `SALON MANAGEMENT`.
- Produces: user-visible and repository text with no previous-brand matches.

- [ ] **Step 1: Change the existing render tests to require the approved brand**

```tsx
expect(html).toContain("HAIRHAEYO");
expect(html).toContain("헤어해요 · SALON MANAGEMENT");
expect(html).not.toMatch(/previous-brand-pattern/i);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- components/dashboard/dashboard-page.test.tsx components/sales/revenue-dashboard.test.tsx`

Expected: FAIL because the shell still renders the previous product name.

- [ ] **Step 3: Apply product copy and package-name changes**

Use `Hairhaeyo Salon Management` for metadata, `HAIRHAEYO` for the sidebar wordmark, `헤어해요 · SALON MANAGEMENT` for the subtitle and `hairhaeyo-` for exports. Rename the two legacy-named docs and update their internal links. Replace legacy source-brand wording with `기존 시스템`; do not remove any inventory bullet.

- [ ] **Step 4: Run tests and a repository forbidden-string scan**

Run: `npm test && npm run typecheck`

Run a case-insensitive scan over managed files excluding `.git`, `.next`, and `node_modules`; expected previous-brand matches: `0`.

- [ ] **Step 5: Commit**

```bash
git add app components package.json package-lock.json AGENTS.md DESIGN.md FUNCTION.md docs
git commit -m "refactor: rename product to Hairhaeyo"
```

### Task 2: Rename the Figma product and visible labels

**Files:**
- Modify: Figma file `7A6bEGubfakhvXLpOPmk1o`
- Modify: `DESIGN.md`
- Modify: `docs/superpowers/specs/2026-07-30-hairhaeyo-ui-design.md`

**Interfaces:**
- Consumes: `Hairhaeyo`, `헤어해요`, `SALON MANAGEMENT`.
- Produces: renamed Figma file and updated document references without changing screen node IDs unless replacement is required.

- [ ] **Step 1: Query all Figma text nodes containing the previous brand**

Use `figma-use` and traverse text nodes on Foundations, Components and Core Screens. Return the matched node IDs before mutation.

- [ ] **Step 2: Replace file and node labels**

Set the file name to `Hairhaeyo Salon Management Web App`; replace logo text with `HAIRHAEYO` and subtitles with `헤어해요 · SALON MANAGEMENT`.

- [ ] **Step 3: Validate Figma**

Run metadata checks and screenshots for Foundations, Components and all four core screens. Query text nodes again; expected previous-brand matches: `0`.

- [ ] **Step 4: Update local Figma references and commit**

```bash
git add DESIGN.md docs/superpowers/specs/2026-07-30-hairhaeyo-ui-design.md
git commit -m "docs: sync Hairhaeyo Figma branding"
```

### Task 3: Define shared revenue analytics data and query filters

**Files:**
- Create: `components/sales/revenue-analytics.ts`
- Create: `components/sales/revenue-query.ts`
- Create: `components/sales/revenue-query.test.ts`
- Modify: `components/sales/revenue-dashboard.tsx`

**Interfaces:**
- Produces: `RevenueAnalytics`, `RevenueQuery`, `parseRevenueQuery(searchParams)`, `serializeRevenueQuery(query)`.
- `RevenueAnalytics` contains selected/comparison periods, KPI values and daily/payment/service/staff/deduction arrays used unchanged by all renderers.

- [ ] **Step 1: Write failing query round-trip tests**

```ts
const query = { preset: "week", start: "2026-07-24", end: "2026-07-30", compare: true, staff: "all" } as const;
expect(parseRevenueQuery(serializeRevenueQuery(query))).toEqual(query);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- components/sales/revenue-query.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement URL query helpers with `URLSearchParams`**

Reject invalid dates and unknown presets by returning the seven-day defaults. Keep parsing free of browser globals so server and client code share it.

- [ ] **Step 4: Move current fixture data into one immutable analytics value**

The dashboard receives `analytics: RevenueAnalytics`; charts, table and CSV read the same object. No financial arithmetic is added to React components.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- components/sales/revenue-query.test.ts components/sales/revenue-dashboard.test.tsx components/sales/revenue-csv.test.ts
git add components/sales
git commit -m "feat: centralize revenue analytics state"
```

### Task 4: Add linked analytics interactions

**Files:**
- Create: `components/sales/revenue-detail-drawer.tsx`
- Modify: `components/sales/revenue-dashboard.tsx`
- Modify: `components/sales/revenue-dashboard.test.tsx`

**Interfaces:**
- Consumes: `RevenueAnalytics` and URL-owned `RevenueQuery`.
- Produces: legend visibility state and `RevenueSelection = { kind: "date" | "payment" | "service" | "staff" | "deduction"; key: string }` for the detail drawer.

- [ ] **Step 1: Write failing render tests for controls and drawer content**

Assert that filter controls have labels, chart buttons expose selected values, legend controls use `aria-pressed`, and a selected service renders its transaction summary in the drawer.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- components/sales/revenue-dashboard.test.tsx`

Expected: FAIL because linked selection and drawer markup are absent.

- [ ] **Step 3: Implement filter URL synchronization and legend toggles**

Use `router.replace()` with serialized query values. Preserve the previous analytics response while navigation is pending. Series visibility must not change chart dimensions.

- [ ] **Step 4: Implement chart-selection detail drawer**

Clicking or keyboard-activating a chart mark sets `RevenueSelection`; the drawer displays the selected period/category totals and links to filtered transaction records. Escape and the close button dismiss it and restore focus.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- components/sales/revenue-dashboard.test.tsx
git add components/sales
git commit -m "feat: add linked revenue drilldowns"
```

### Task 5: Enforce responsive boundaries and accessible equivalents

**Files:**
- Modify: `components/sales/revenue-dashboard.tsx`
- Modify: `app/globals.css`
- Create: `components/sales/revenue-summary-table.tsx`
- Test: `components/sales/revenue-dashboard.test.tsx`

**Interfaces:**
- Consumes: `RevenueAnalytics`.
- Produces: desktop grids for 1280, 1440 and 1600+ widths plus keyboard-reachable tables containing every plotted value.

- [ ] **Step 1: Add failing structural assertions**

Assert that every chart section has a heading, text summary and table reference; record-entry pages must not import analytics layout components.

- [ ] **Step 2: Run test and verify RED**

Run: `npm test -- components/sales/revenue-dashboard.test.tsx`

Expected: FAIL until the dedicated summary component is rendered.

- [ ] **Step 3: Implement responsive analytics grids**

Use container/grid `minmax()` sizing. Keep two chart columns at 1280–1599px; allow a 2/3 + 1/3 arrangement at 1600px. Do not add animated reordering.

- [ ] **Step 4: Implement accessible tables and reduced motion**

Each chart references a corresponding table/summary. Disable Recharts animation and CSS movement when `prefers-reduced-motion: reduce` is active.

- [ ] **Step 5: Verify and commit**

```bash
npm test
npm run typecheck
git add app components
git commit -m "feat: refine responsive revenue analytics"
```

### Task 6: Browser and repository signoff

**Files:**
- Create: `docs/qa/hairhaeyo-analytics-qa.md`
- Modify: implementation files only when QA exposes a defect

**Interfaces:**
- Produces: reproducible QA evidence for brand removal, desktop fit and linked interactions.

- [ ] **Step 1: Run repository verification**

Run: `npm test`, `npm run typecheck`, `npm run build`, `npm audit --omit=dev`, and the forbidden-brand scan. All must pass with zero previous-brand matches.

- [ ] **Step 2: Run Playwright at required viewports**

Test `/`, `/sales` at 1280×800, 1440×900 and 1920×1080, plus 125% zoom. Verify no horizontal overflow at supported widths, no clipped labels, stable filter layout and readable charts.

- [ ] **Step 3: Exercise user interactions**

Use keyboard and mouse to change filters, toggle legends, focus tooltips, open/close drilldown, expand data tables, download CSV and inspect print layout. Record the tested states and screenshot paths.

- [ ] **Step 4: Run final Chrome pass**

Use Chrome only to compare OS font rendering and authenticated browser behavior. Record differences; do not substitute Chrome for deterministic Playwright checks.

- [ ] **Step 5: Commit QA evidence**

```bash
git add docs/qa
git commit -m "test: document Hairhaeyo analytics QA"
```
