-- 1. Where a project lives inside its repo (for monorepos, e.g. apps/ops). Optional.
-- 2. agent_runs: each "Fix with agent" hand-off, so Drift can show an upgrade is already in flight.
-- Idempotent. Requires 002_authority.sql.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS path text;

CREATE TABLE IF NOT EXISTS agent_runs (
  id           bigserial PRIMARY KEY,
  project_slug text NOT NULL,
  environment  text NOT NULL,
  package      text NOT NULL,
  from_version text NOT NULL,
  to_version   text NOT NULL,
  issue_url    text NOT NULL,
  requested_by text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (project_slug, environment) REFERENCES environments (project_slug, name)
);
CREATE INDEX IF NOT EXISTS agent_runs_pin ON agent_runs (project_slug, environment, package, requested_at DESC);

-- Append-only: admins record a hand-off; nobody edits or deletes one. (The issue itself is the live record.)
GRANT SELECT ON agent_runs TO console_reader, console_admin;
GRANT INSERT ON agent_runs TO console_admin;
GRANT USAGE ON SEQUENCE agent_runs_id_seq TO console_admin;
