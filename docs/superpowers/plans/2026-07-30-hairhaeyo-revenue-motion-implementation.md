# Hairhaeyo Revenue Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accessible, functional entry motion to every revenue chart without animating record-oriented UI or adding a runtime dependency.

**Architecture:** A `useSyncExternalStore` reduced-motion signal feeds one pure chart-motion configuration helper. RevenueDashboard passes the resulting Recharts animation props to existing Line, Pie and Bar series; data, selection and layout flows remain unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts 3, Vitest, Playwright

## Global Constraints

- Desktop web only; minimum viewport 1280px.
- Motion applies only to analytics charts.
- KPI, filters, tables, value buttons and drawer positions remain static.
- Use Recharts built-in animation; add no runtime dependency.
- Disable all chart motion for `prefers-reduced-motion: reduce`.
- Preserve every existing `FUNCTION.md` function and subfunction.
- Stage 5 pushes the completed branch to `origin`.

---

### Stage 1: Record motion design and dependency decision

**Files:**
- Create: `docs/superpowers/specs/2026-07-30-hairhaeyo-revenue-motion-design.md`
- Create: `docs/superpowers/plans/2026-07-30-hairhaeyo-revenue-motion-implementation.md`

- [ ] Install and inspect `motion-ref`.
- [ ] Record Recharts-native approach, durations and reduced-motion policy.
- [ ] Commit design and plan.

### Stage 2: Define tested motion policy

**Files:**
- Modify: `components/sales/revenue-dashboard.tsx`
- Modify: `components/sales/revenue-dashboard.test.tsx`

**Produces:**

```ts
type RevenueChartMotion = {
  isAnimationActive: boolean;
  animationBegin: number;
  animationDuration: number;
  animationEasing: "ease-out";
};

function revenueChartMotion(reduced: boolean, begin: number, duration: number): RevenueChartMotion;
```

- [ ] Add a failing test asserting normal motion is active and reduced motion is disabled.
- [ ] Run `npm test -- components/sales/revenue-dashboard.test.tsx` and verify RED.
- [ ] Implement the pure helper and `useSyncExternalStore` media-query subscription.
- [ ] Run the focused test and `npm run typecheck`.

### Stage 3: Apply chart entry animation

**Files:**
- Modify: `components/sales/revenue-dashboard.tsx`
- Modify: `components/sales/revenue-dashboard.test.tsx`

- [ ] Add failing assertions for line, pie, horizontal bar, grouped bar and deduction timings.
- [ ] Pass `revenueChartMotion(...)` props to all Recharts series.
- [ ] Keep chart containers, KPI cards, filters and drawer free of layout animation.
- [ ] Run focused tests and commit implementation.

### Stage 4: Browser motion QA

**Files:**
- Modify: `docs/qa/hairhaeyo-analytics-qa.md`

- [ ] Start/reuse local Next server.
- [ ] In a normal-motion 1280×900 Playwright context, capture an in-transition frame and settled frame.
- [ ] Verify bars grow, line draws and pie sweeps without horizontal overflow or interaction blocking.
- [ ] In a reduced-motion context, verify series render immediately without tween.
- [ ] Recheck legend toggle, value-button drawer, Escape focus restoration and filter navigation.
- [ ] Record evidence in QA documentation.

### Stage 5: Verify, review, commit and push

**Files:**
- Modify only files required by review findings.

- [ ] Run `npm test`, `npm run typecheck`, `npm run build`, `npm audit --omit=dev`.
- [ ] Verify forbidden brand matches `0` and `FUNCTION.md` top-level bullets `253`.
- [ ] Request final code review; fix every Critical and Important finding.
- [ ] Commit remaining QA/review changes.
- [ ] Run `git push -u origin codex/revenue-analytics-drilldown` and verify remote tracking.

