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

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
