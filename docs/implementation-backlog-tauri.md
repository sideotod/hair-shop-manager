# Database and Tauri packaging migration

- Status: planned
- Scope: Apply the imported Hairnury SQLite database to the development web app, verify customer/revenue/search/chart behavior, then migrate the runtime path for Tauri packaging.
- Order:
  1. Validate the imported DB in the web app.
  2. Introduce a runtime DB-path abstraction.
  3. Use the Tauri AppData directory for the packaged app.
  4. Copy the development DB into AppData on first run without overwriting an existing user DB.
  5. Build and verify the exe.
- Acceptance criteria:
  - Development and packaged builds read the same schema.
  - First-run copy is idempotent.
  - Existing AppData data is preserved.
  - Customer counts, revenue totals, recent-service dates, and ledger aggregates match the imported DB.
  - Backup/restore and upgrade paths are documented.
