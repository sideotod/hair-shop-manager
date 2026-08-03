# Hairhaeyo README Design

## Goal

Create a Korean-first root README that explains Hairhaeyo to everyday salon users while still giving developers enough information to install, run, test, and package the project.

## Audience and tone

- Primary audience: salon owners and ordinary users evaluating or using the application.
- Secondary audience: developers contributing to the repository.
- Tone: practical, calm, and product-oriented; avoid claiming unfinished features are production-ready.
- Mention Vibecoding naturally as part of the development workflow, not as a substitute for testing or review.

## Structure

1. Product title, short description, and badges for the current stack.
2. What Hairhaeyo is and who it is for.
3. Core workflows: today/dashboard, customers, bookings, sales/payments, messages, and operations.
4. Current product direction: desktop-first web app with a planned Windows/Tauri package.
5. End-user quick start for the local development build, with a clear distinction between development and eventual installed-app usage.
6. Developer setup: prerequisites, install, environment variables, dev server, tests, typecheck, and production build.
7. Tauri commands and packaging status.
8. Project structure and authoritative project documents.
9. Data, privacy, and account notes.
10. Development approach, including a short Vibecoding note.
11. Current limitations and contribution/license notes.

## Source of truth

- Product scope and legacy traceability: `FUNCTION.md`.
- Visual and architecture direction: `DESIGN.md`.
- Available commands and dependencies: `package.json`.
- Existing routes and UI modules: `app/` and `components/`.
- Tauri packaging setup: `src-tauri/`.

## Verification

- Confirm every command shown in README exists in `package.json`.
- Confirm every route and project path named in README exists.
- Run `npm run typecheck`, `npm test`, and `npm run build` before claiming completion.
- Run `git diff --check` and inspect the final README diff.
- Commit only README and this approved design spec; leave pre-existing untracked message files untouched.

## Deliberate exclusions

- No screenshots or fabricated download links until stable assets/releases exist.
- No claim that all `FUNCTION.md` items are complete; the README will point to the inventory and describe the implemented direction accurately.
- No new README tooling, badges requiring network calls, or documentation dependencies.
