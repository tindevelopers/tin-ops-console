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

## T1: Neon Auth through `NeonAuthProvider` (partial, 2026-10-04)

Built: `src/auth/auth.ts` (lazy `createNeonAuth` + `NeonAuthProvider`), `/api/auth/[...path]` proxy, `/signin` (sign-in, forgot password by emailed code, set password), `/` showing the signed-in email with sign-out. `@neondatabase/auth@0.5.0-beta` added (peer dependency of `domain-identity`).

Checked against the live Neon Auth endpoint (local `next start`):
- Email sign-up is refused: `POST /api/auth/sign-up/email` returns 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`; the user count stayed at 1.
- `/signin` renders; `/` redirects to `/signin` without a session; `get-session` returns `null` without a cookie.

Not yet verified (needs the operator to set a password, which only they should know): sign in, `/` shows the email, sign-out clears the session. This is where `NeonAuthProvider`'s unverified session shapes get proven.

Known deviations:
- `NeonAuthProvider.resetPassword` throws ("handled by the hosted flow"), so forgot-password calls the SDK's `emailOtp` methods directly in `app/signin/actions.ts`. If sign-in shows the provider's shapes are wrong, the plan's stop condition applies (fix in `shared-identity-hub`).
- Google and GitHub OAuth are enabled in Neon Auth, and OAuth can still create Neon Auth accounts. Access to the console is controlled by `console_operators` (T6), not by Neon Auth sign-up.
