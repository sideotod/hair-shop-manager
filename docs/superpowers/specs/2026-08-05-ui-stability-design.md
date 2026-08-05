# UI Stability Design

## Goal

Make the desktop UI visually stable at 1280px and 1440px without changing business workflows. Buttons must retain their position during state changes, cards must use consistent corners and spacing, and customer and booking registration overlays must remain fully visible and centered.

## Evidence

Playwright checks of the login, dashboard, customers, customer registration, bookings, booking registration, and sales screens found three recurring issues:

- equivalent actions use different dimensions and placement across pages and empty states;
- panel, tab, and card spacing is inconsistent between dashboard, customer, booking, and sales screens;
- customer and booking registration overlays begin at the viewport top and are visually cropped.

## Scope

Modify shared presentation rules only. Keep routes, forms, server actions, data contracts, copy, and existing page-level workflows intact.

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

## Implementation Boundaries

- Reuse existing AppShell and existing CSS variables; do not introduce a component library or dependency.
- Add only the smallest shared class names needed for stable header actions and overlays.
- Do not redesign charts, data structures, forms, routes, or financial UI behavior.

## Verification

- Add focused tests for shared shell class contracts and overlay markup where existing component tests cover the affected screens.
- Use Playwright at 1280px and 1440px to check that opening registration leaves the trigger's layout position unchanged, overlay content is visible, and no horizontal overflow appears.
- Run TypeScript and relevant Vitest tests.

## Non-goals

- Mobile navigation, animation redesign, Figma board creation, and feature changes are excluded.
