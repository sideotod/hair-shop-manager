# Hairhaeyo implementation rules

## Non-negotiable scope

- This product is a desktop web application, not a mobile application.
- Use Next.js App Router, TypeScript strict mode, and Tailwind CSS.
- `FUNCTION.md` is the authoritative legacy-function inventory.
- Every function and subfunction in `FUNCTION.md` must be implemented or explicitly mapped to a replacement workflow before release.
- A redesign may consolidate screens, drawers, dialogs, routes, or background jobs, but must not silently remove behavior.
- Items marked `[추가확인]` remain required. Verify their legacy behavior before closing them.

## Traceability gate

- Each implementation task must cite the relevant `FUNCTION.md` section.
- Tests must cover the mapped behavior, including permission, empty, error, and correction states where applicable.
- A task is incomplete while any referenced function is missing, unverified, or only represented visually.
- Before release, audit every bullet in `FUNCTION.md` against a route, component, server operation, integration, or background job.

## Web UI rules

- Baseline viewport: 1440px; minimum supported width: 1280px.
- Do not create mobile navigation or mobile-only interaction patterns.
- Preserve keyboard access, semantic HTML, visible focus, and non-color status labels.
- Validate dense pages and Korean text alignment with Playwright; use Chrome for final real-browser/profile checks.

## Financial rules

- The server owns money calculations and immutable transaction records.
- Charts, tables, CSV, print output, and KPI totals must consume the same server aggregate.
- Duplicate payment submission, correction history, refunds, VAT, fees, incentives, points, coupons, and shop profit require automated tests.
