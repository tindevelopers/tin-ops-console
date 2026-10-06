-- A project can be owned by another project (for example the core hubs by TIN BOSS, the Konnect apps by Konnect).
-- A project may own itself: that marks a top-level owner. Idempotent. Requires 002_authority.sql.
-- No grant changes are needed: console_reader's SELECT and console_admin's INSERT/UPDATE on projects are table-level,
-- and the audit trigger on projects already records changes to this column.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_project text REFERENCES projects (slug);
