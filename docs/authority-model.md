# Authority model: the console is the source of truth

**Status:** Owner decision, 2026-10-05. Amends `docs/specs/2026-10-03-tin-ops-console-design.md` in `shell-base-admin` (PR #99).

## What changes

| Spec decision | Was | Now |
|---|---|---|
| C3 | Read-only; links out instead of acting | **Superseded.** The console is the system of record for what TIN runs, who owns it and what it should look like. |
| C4 | Only the collector writes; the console reads | The collector still writes **observed** state. Admins write **declared** state through the console. Neither overwrites the other. |
| Section 1 "Not in scope" | No assigning or changing anything | Assigning owners, declaring versions and declaring BOSS adoption modes are in scope. Rotating keys, publishing packages and deploying cells are still not done from the console. |

Unchanged: C1 (own repo), C2 (Neon, EU), C5 (key metadata only, never secrets), C6 (Neon Auth, closed sign-up, `console_operators` allow-list), C7 (ui-shell structure).

## Declared versus observed

- **Declared** (authoritative, edited by admins): `projects`, `project_relations`, `environments`, `declared_pins`, `boss_adoption`, `assignments`.
- **Observed** (measured by the collector): `package_snapshots`, `cell_snapshots`, `credential_snapshots`.
- **Drift is the difference.** A project declared on `@tindevelopers/ui-shell@1.2.0` while the collector sees `1.1.0` is red. Observed state never edits the declaration.

## What it tracks

`projects.kind` covers `boss`, `hub`, `spoke`, `package`, `shell-base` and `app`. `project_relations` links them (`consumes`, `calls`, `hosts`), for example an app consumes a hub, a spoke calls BOSS. Each project has environments (`development`, `staging`, `production`), declared package pins per environment, a declared BOSS `DOMAIN_MODE` (`inprocess`, `shadow`, `remote`) and owners.

## Access and audit

- Roles: `console_reader` (SELECT), `console_admin` (writes the registry, cannot touch snapshots), `collector_writer` (snapshots only, no registry access).
- `console_operators.role` is now `viewer` or `admin`. Only admins reach the write path.
- Every change to a registry table or to `console_operators` is recorded in `registry_audit` by a database trigger, with actor, before and after. The console must run `SELECT set_config('console.actor', <email>, true)` in the same transaction as each write; a write without an actor is refused. No role can edit or delete audit rows.
- Retiring replaces deleting: projects, environments and assignments cannot be deleted (`lifecycle = 'retired'`, `removed_at`). Relations, pins and adoption modes can be removed.

## Built

- **Admin screens** (`/projects`, `/projects/[slug]`): add and edit projects, environments, declared versions, BOSS mode, owners and relationships. Forms show only for `console_operators.role = 'admin'` and only when `CONSOLE_ADMIN_DATABASE_URL` is set. Each server action re-checks admin access itself and runs its write in one transaction that sets the audit actor.
- **Drift view** (`/drift`, plus a status per project and a findings table per project): declared pins against the collector's `latest`/`next`, declared cells against their health, and projects with no owner. A package or cell the collector has not seen is amber, never green. Retired projects are skipped. Rules are in `src/registry/drift.ts`.
- New pages require an active `console_operators` row. The older pages (`/packages`, `/cells`, `/collector`) still only require sign-in; see below.

## Also built

- Every console page now requires an active `console_operators` row (`requireOperator`), not just a sign-in. Neon Auth sign-up cannot be closed to OAuth, so signing in alone grants nothing.
- The Overview shows active projects, the number of red and amber findings, collector freshness, and the most urgent findings.
- The collector (`shell-base-github-registry`, `scripts/collect-status.mjs`) records observed package versions and cell health daily. On `*.run.app` cells it checks `/readyz` only, because Cloud Run reserves `/healthz`.

## Still to build

1. Declared versions for the seven Konnect apps other than `konnect-ops`, so drift covers them.
2. A bulk import for new projects, so the registry is not filled one form at a time.
3. Decide whether other systems (registry, cell files) are later generated from the console, or stay as inputs it reconciles against.
