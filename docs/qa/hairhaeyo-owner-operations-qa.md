# Hairhaeyo owner operations QA — 2026-08-03

## Scope

- Desktop web only: Chrome at 1280×900 and 1440×1000.
- Production Next standalone server and packaged Tauri Windows app.
- Routes: `/`, `/customers`, `/bookings`, `/sales`, `/sales/transactions`, `/messages`, `/operations`, `/settings`.
- Authoritative coverage: `FUNCTION.md` 253 top-level bullets, 10 nested bullets, 263 total.

## Browser workflow results

- Production owner login and logout worked.
- 1280×900 and 1440×1000 had no page-level horizontal overflow.
- Customer registration, edit, global search, detail navigation, and persisted history worked.
- Waiting-customer registration, customer link, payment link, and completion controls were present.
- Booking create, status change, edit, cancellation, and overlapping-time rejection worked.
- Payment creation preserved immutable rows; refund produced the original entry plus linked reversing entry.
- Revenue page showed today, month, and total values from the shared server aggregate.
- Day/month/total navigation, previous/next controls, CSV, print, transaction drawer, and settlement table were present.
- Bar charts rendered permanent end labels with no bar tooltip. Pie chart retained tooltip behavior.
- Revenue entry motion ran for line, bar, and pie charts; reduced-motion tests cover immediate settled geometry.
- Drawer keyboard close and focus restoration worked.
- Service catalog, expense entry/correction, presets, period totals, and print controls worked.
- Product and coupon tabs were absent by approved scope. Prepaid remained a payment tender, without separate balance management.
- Individual/group/scheduled message dry-run and automation settings worked without external delivery claims.
- Naver integration showed disabled/dry-run state before Task 10 credentials and IMAP implementation.
- Settings persisted shop and owner display values; notices used encoded redirects without Korean text corruption.
- Browser console errors and warnings: 0 during final route checks.

## Visual results

- Pretendard Variable loaded locally; Korean labels, form controls, tables, and chart labels stayed aligned.
- 1440 revenue bars: 8 permanent amount labels, 0 clipped labels.
- No unintended hover disclosure on bar charts; pie tooltip remained the only chart hover detail.
- Dense desktop pages retained visible focus, semantic labels, non-color status text, and usable 1280px layout.
- No clipped sidebar, header, primary form, chart label, or fixed-shell region found in checked states.

## Tauri production smoke

- `npm run tauri:build` produced `src-tauri/target/release/hairhaeyo.exe` and `Hairhaeyo_0.1.0_x64-setup.exe`.
- Packaged app started its Node sidecar on `127.0.0.1:3210` and served the production login page.
- Login opened the `수원 본점` dashboard.
- Owner display name changed to `QA원장`; app restart retained `수원 본점`, `QA원장`, and the settings audit entry in the app-data SQLite database.
- Keyboard Tab navigation moved from `오늘` to `고객` in menu order.
- Revenue `인쇄` opened the native print flow; Escape closed it.
- `CloseMainWindow()` exited the app and removed the port 3210 listener. A second restart and close produced the same clean shutdown result.

## Security and release checks

- Production password hash and per-run 256-bit session secret are supplied to the sidecar environment; plaintext password is not embedded in Rust source.
- SQLite path is supplied through `HAIRHAEYO_DB_PATH` and resolves under the Tauri app-data directory.
- Sidecar listens only on loopback.
- Standalone packaging removes `.data` before Tauri resources are assembled; the regression test prevents a salon SQLite file from entering the installer.
- Readiness uses a separate per-run 256-bit health token. Missing or incorrect tokens return 403, and unrelated loopback listeners are rejected.
- Independent review found one Critical and two Important issues; all three were fixed and the scoped re-review reported no new Critical/Important findings.
- Eleven Naver-specific coverage rows remain explicitly pending for Task 10. All other former `연동 확인 필요` rows are now implementation, owner replacement, or user-approved exclusion mappings.
