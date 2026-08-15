# Settings vertical layout design

## Goal

Make every settings detail screen read as a vertical work surface at desktop widths, without changing any setting, action, route, or replacement workflow recorded in `FUNCTION.md`.

## Layout

- Keep the existing horizontal settings section tabs and the 1440px / 1280px desktop shell.
- Constrain settings-detail surfaces to `max-w-[560px]`; unused horizontal space remains intentional page whitespace.
- Stack editable fields in one column. Checkbox choices remain short inline rows within that column.
- Account information, password, and logout become vertically stacked blocks inside their existing shared account surface.
- Help, contact, notice creation, audit history, and the service catalog use a single column. The price table keeps its semantic table layout within that column.

## Behavior and accessibility

- Preserve every form action, field name, default value, submit button, deep link, and visible status/error message.
- Preserve field labels, native controls, semantic table markup, and keyboard focus.
- This is presentation-only: no server calculation, permissions, integration behaviour, or data contract changes.

## Verification

- Render tests prove all existing setting sections and their controls remain reachable, while the page exposes the vertical layout hook.
- Typecheck and targeted settings tests verify the unchanged forms compile and render.
- Playwright inspection at 1440px and 1280px checks that fields form one vertical reading column without horizontal page scrolling when an authenticated session is available.
