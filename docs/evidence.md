# Evidence

## H2: `db/001_status.sql` on the main Neon branch (2026-10-03)

- Owner approved H2 on 2026-10-03.
- Target: the `tin-ops-console` Neon project, default (production) branch, database `neondb`.
- Before applying: `pnpm test` passed 40/40 (PGlite schema and grant tests).
- Applied twice over Neon's HTTPS SQL endpoint (`@neondatabase/serverless`, one transaction per pass). Both passes succeeded, so the file is idempotent on Neon.
- Grant check (owner ran `has_table_privilege` for SELECT/INSERT/UPDATE/DELETE/TRUNCATE on all five tables in the Neon SQL editor), 14 rows, matching the plan exactly:
  - `console_reader`: SELECT on all five tables, nothing else.
  - `collector_writer`: SELECT, INSERT, DELETE on `collector_runs`; SELECT, INSERT on `package_snapshots`, `cell_snapshots`, `credential_snapshots`; nothing on `console_operators`.
- Not checked live: column-level UPDATE on `collector_runs` (covered by `db/schema.test.ts`).
