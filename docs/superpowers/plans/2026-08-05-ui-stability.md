# UI Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize every desktop click flow and align every implemented screen with its Figma reference without changing business workflows.

**Architecture:** Keep AppShell as the shared layout boundary. Define the small set of reusable visual rules in global CSS, then apply existing semantic elements to those rules in customer and booking views. No new dependency or component library is added.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, Playwright.

## Global Constraints

- Desktop only; verify 1280px and 1440px viewports.
- Preserve functionality mapped in `FUNCTION.md` sections 2.1–2.5 and booking workflows.
- No translated controls; transitions may affect color, border, and shadow only.
- Keep keyboard access, semantic HTML, and visible focus.
- Do not change existing Markdown files.
- Preserve origin route context for every drill-down, form, overlay, correction, and return action.
- Audit the 13 Figma screens and all user-facing controls with Playwright.

---

### Task 1: Define stable shared visual rules

**Files:**
- Modify: `app/globals.css`
- Test: `components/app-shell.test.tsx`

**Interfaces:**
- Produces shared CSS custom properties and utility classes for page actions and overlays.
- Consumes existing `--background`, `--foreground`, `--brand`, and `--border` variables.

- [ ] **Step 1: Write failing shared-shell assertions**

```tsx
expect(html).toContain("data-app-shell-background");
expect(html).toContain("data-app-overlay");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/app-shell.test.tsx`

Expected: failure because the overlay container is not rendered by AppShell.

- [ ] **Step 3: Add minimal shared styles**

Add fixed desktop control heights, card radius, non-transform transitions, a fixed page-action row, and viewport-centered overlay/backdrop CSS in `app/globals.css`.

- [ ] **Step 4: Add overlay host markup to AppShell**

Render `overlay` inside a `data-app-overlay` host after the inert background. Do not change AppShell props or page data flow.

- [ ] **Step 5: Run focused test**

Run: `npm test -- components/app-shell.test.tsx`

Expected: PASS.

### Task 2: Stabilize customer actions and registration overlay

**Files:**
- Modify: `components/customers/customers-page.tsx`
- Modify: `components/customers/customers-page.test.tsx`

**Interfaces:**
- Consumes AppShell `overlay` host and shared page-action/overlay classes.
- Produces unchanged customer save and waiting-customer routes.

- [ ] **Step 1: Write failing customer overlay test**

```tsx
expect(screen.getByRole("heading", { name: "신규 고객 등록" }).closest("[data-dialog-panel]")).toBeTruthy();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/customers/customers-page.test.tsx`

Expected: failure because the registration form has no dialog panel marker.

- [ ] **Step 3: Add minimal overlay structure**

Wrap new-customer and waiting-customer forms with `role="dialog"`, `aria-modal="true"`, and `data-dialog-panel`. Move no form fields or server action bindings. Use the shared fixed overlay container so long forms scroll inside the panel.

- [ ] **Step 4: Normalize page action classes**

Use one shared page-action row and primary/secondary control classes for the customer header links. Do not alter hrefs or labels.

- [ ] **Step 5: Run focused test**

Run: `npm test -- components/customers/customers-page.test.tsx`

Expected: PASS.

### Task 3: Stabilize booking actions and registration overlay

**Files:**
- Modify: `components/bookings/bookings-page.tsx`
- Modify: `components/bookings/bookings-page.test.tsx`

**Interfaces:**
- Consumes AppShell overlay host and shared page-action/overlay classes.
- Produces unchanged booking creation, edit, error, and notice workflows.

- [ ] **Step 1: Write failing booking overlay test**

```tsx
expect(screen.getByRole("heading", { name: "새 예약 등록" }).closest("[data-dialog-panel]")).toBeTruthy();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/bookings/bookings-page.test.tsx`

Expected: failure because the registration form has no dialog panel marker.

- [ ] **Step 3: Add minimal overlay structure**

Wrap new and edit booking forms with the same dialog contract as customer forms. Keep current URL query controls, names, and submission actions unchanged.

- [ ] **Step 4: Normalize booking action classes**

Apply shared page-action and control classes to registration, period, and date controls without changing route parameters.

- [ ] **Step 5: Run focused test**

Run: `npm test -- components/bookings/bookings-page.test.tsx`

Expected: PASS.

### Task 4: Verify desktop geometry and regressions

**Files:**
- Modify: `components/app-shell.test.tsx` only if a missing shared contract is discovered.

- [ ] **Step 1: Run type and UI tests**

Run: `npm run typecheck; npm test -- components/app-shell.test.tsx components/customers/customers-page.test.tsx components/bookings/bookings-page.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run Playwright geometry checks**

At 1280px and 1440px, open `/customers?new=1` and `/bookings?new=1`. Confirm panel top and bottom are within viewport, panel has internal scroll space when needed, no horizontal page overflow occurs, and trigger-button rectangles before and after opening differ only because the route changed—not because nearby header layout moved.

- [ ] **Step 3: Run final build check**

Run: `npm run build`

Expected: PASS.
