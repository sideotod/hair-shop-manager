# UI Stability Design

## Goal

Make the desktop UI visually stable at 1280px and 1440px without changing business workflows. Buttons must retain their position during state changes, cards must use consistent corners and spacing, and customer and booking registration overlays must remain fully visible and centered.

## Evidence

Playwright checks of the login, dashboard, customers, customer registration, bookings, booking registration, and sales screens found three recurring issues:

- equivalent actions use different dimensions and placement across pages and empty states;
- panel, tab, and card spacing is inconsistent between dashboard, customer, booking, and sales screens;
- customer and booking registration overlays begin at the viewport top and are visually cropped.

## Scope

Modify shared presentation rules and navigation context. Keep forms, server actions, data contracts, and financial calculations intact.

### Shared layout

- Preserve the desktop application shell at 1280px and 1440px.
- Use a single set of spacing, border, radius, and control-height custom properties.
- Give page headers a stable action area so adding or removing contextual actions does not shift the title or neighboring controls.

### Controls and motion

- Normalize primary, secondary, compact, and tab controls by role rather than page.
- Use color, border, and shadow transitions only. Do not translate controls on hover, focus, active, or route/state changes.
- Preserve visible focus indicators and semantic button/link behavior.

### Overlays

- Center customer and booking registration overlays in the viewport with a dimmed backdrop.
- Constrain overlay height to the viewport and allow its content to scroll.
- Prevent background layout from moving while an overlay is open.

### Navigation continuity

- Every user-facing button, link, tab, row action, and form outcome must have a visible or browser-history return path to its origin.
- Preserve route context such as date, period, tab, selected customer, and filters across drill-down, registration, correction, save, cancel, and close actions.
- Verify each supported flow as A → B → A in Playwright at 1280px and 1440px.

### Figma fidelity

- Audit all 13 top-level Figma screens in file `gCb7z7fyz5BvvOADlCv0yu` against their implemented routes.
- Rebuild the sales analysis information hierarchy to match Figma screen `03 매출·결제`: period controls, five KPI cards, daily trend list, service bars, payment list, and expense list.
- Keep stable header, tab, KPI, chart, and card geometry during interactions.

## Implementation Boundaries

- Reuse existing AppShell and existing CSS variables; do not introduce a component library or dependency.
- Add only the smallest shared class names needed for stable header actions and overlays.
- Do not change data structures or financial UI behavior.

## Verification

- Add focused tests for shared shell class contracts and overlay markup where existing component tests cover the affected screens.
- Use Playwright at 1280px and 1440px to check every supported click flow, return path, overlay, selection state, and visual geometry.
- Run TypeScript and relevant Vitest tests.

## Non-goals

- Mobile navigation, animation redesign, Figma board creation, and feature changes are excluded.
