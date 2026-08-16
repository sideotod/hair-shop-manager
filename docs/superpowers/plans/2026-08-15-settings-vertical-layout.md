# Settings vertical layout implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present settings detail screens as narrow, vertically stacked desktop work surfaces without changing their settings behaviour.

**Architecture:** The server-rendered settings components retain their actions and fields. A small set of layout classes constrains the active settings content and replaces multi-column field grids with vertical stacks; catalog and help content follow the same column.

**Tech Stack:** Next.js App Router, React server components, TypeScript, Tailwind CSS, Vitest.

## Global Constraints

- Preserve the `FUNCTION.md` settings, reservation, payment, service, integration, and help workflows.
- Keep desktop support at 1440px baseline and 1280px minimum.
- Preserve semantic HTML, visible keyboard focus, and form field names/actions.

---

### Task 1: Add a regression test for vertical settings content

**Files:**
- Modify: `components/settings/settings-page.test.tsx`
- Modify: `components/settings/settings-page.tsx`

**Interfaces:**
- Consumes: `SettingsPage` and its existing `section` prop.
- Produces: stable `data-settings-detail` layout hook on each active section wrapper.

- [ ] **Step 1: Write the failing test**

```tsx
const html = renderToStaticMarkup(<SettingsPage {...props} section="payment" />);
expect(html).toContain('data-settings-detail="true"');
expect(html).toContain('max-w-[560px]');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/settings/settings-page.test.tsx`

Expected: the new layout-hook assertion fails because the current content wrapper is 1180px wide.

- [ ] **Step 3: Write minimal implementation**

```tsx
<div data-settings-detail className="w-full max-w-[560px]">{activeContent}</div>
```

Replace settings field grids with `grid gap-4` and make account rows vertical.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/settings/settings-page.test.tsx`

Expected: PASS.

### Task 2: Stack service and help detail content

**Files:**
- Modify: `components/settings/catalog-sections.tsx`
- Modify: `components/settings/settings-page.tsx`
- Test: `components/settings/settings-page.test.tsx`

**Interfaces:**
- Consumes: existing catalog `saveCatalogItem` action and help `saveNotice` action.
- Produces: unchanged forms and links in one vertical detail column.

- [ ] **Step 1: Update existing two-column layouts**

```tsx
return <div className="grid gap-5">...</div>;
```

- [ ] **Step 2: Run targeted layout and behavior tests**

Run: `npm test -- components/settings/settings-page.test.tsx`

Expected: PASS with all existing section, form, and replacement-flow assertions intact.

### Task 3: Verify compilation and visual constraints

**Files:**
- Verify only.

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 2: Inspect the settings page at 1440px and 1280px**

Run: `playwright-cli` against an authenticated local session.

Expected: a narrow vertical detail column, no page-level horizontal scrolling, and keyboard-accessible fields.
