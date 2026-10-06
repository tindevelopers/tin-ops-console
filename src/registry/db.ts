import { neon } from "@neondatabase/serverless";
import { cellSnapshots, latestDataRun, packageSnapshots } from "@/src/status/db";
import type { CellSnapshot, CollectorRun, PackageSnapshot } from "@/src/status/types";
import type { Statement } from "./commands";
import type { Registry } from "./types";

type Row = Record<string, any>;

export const registryConfigured = () => Boolean(process.env.CONSOLE_DATABASE_URL);
export const registryWritable = () => Boolean(process.env.CONSOLE_ADMIN_DATABASE_URL);

const read = (text: string): Promise<Row[]> => neon(process.env.CONSOLE_DATABASE_URL!).query(text) as Promise<Row[]>;

/** The whole declared registry. It is small (projects, not telemetry), so one read per page beats per-entity queries. */
export async function loadRegistry(): Promise<Registry> {
  const [projects, environments, pins, adoption, assignments, relations] = await Promise.all([
    read("select * from projects order by slug"),
    read("select * from environments order by project_slug, name"),
    read("select * from declared_pins order by project_slug, environment, package"),
    read("select * from boss_adoption"),
    read("select * from assignments where removed_at is null order by assigned_at"),
    read("select * from project_relations order by from_slug, to_slug"),
  ]);
  return {
    projects: projects.map((r) => ({ slug: r.slug, name: r.name, kind: r.kind, client: r.client, repo: r.repo, lifecycle: r.lifecycle, notes: r.notes, ownerProject: r.owner_project ?? null })),
    environments: environments.map((r) => ({ projectSlug: r.project_slug, name: r.name, cell: r.cell, region: r.region, url: r.url })),
    pins: pins.map((r) => ({ projectSlug: r.project_slug, environment: r.environment, package: r.package, version: r.version })),
    adoption: adoption.map((r) => ({ projectSlug: r.project_slug, environment: r.environment, domainMode: r.domain_mode })),
    assignments: assignments.map((r) => ({ id: String(r.id), projectSlug: r.project_slug, assignee: r.assignee, role: r.role, assignedBy: r.assigned_by, assignedAt: new Date(r.assigned_at) })),
    relations: relations.map((r) => ({ fromSlug: r.from_slug, toSlug: r.to_slug, relation: r.relation })),
  };
}

export type Observed = { run: CollectorRun | null; packages: PackageSnapshot[] | null; cells: CellSnapshot[] | null };

/** What the collector last measured, or nulls before its first successful run. */
export async function loadObserved(): Promise<Observed> {
  const run = await latestDataRun();
  if (!run) return { run: null, packages: null, cells: null };
  const [packages, cells] = await Promise.all([packageSnapshots(run.id), cellSnapshots(run.id)]);
  return { run, packages, cells };
}

/** Applies statements in one transaction as console_admin. The actor is set first so the audit trigger records who made the change. */
export async function registryWrite(actor: string, statements: Statement[]): Promise<void> {
  if (!registryWritable()) throw new Error("CONSOLE_ADMIN_DATABASE_URL is not set.");
  const sql = neon(process.env.CONSOLE_ADMIN_DATABASE_URL!);
  await sql.transaction([
    sql.query("select set_config('console.actor', $1, true)", [actor]),
    ...statements.map((s) => sql.query(s.text, s.params)),
  ]);
}
