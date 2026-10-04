import { neon } from "@neondatabase/serverless";
import type { CellSnapshot, CollectorRun, PackageSnapshot } from "./types";

type Row = Record<string, any>;

/** The console reads the status store as the console_reader role (SELECT only). Unset until the owner enables that role's login. */
export const statusStoreConfigured = () => Boolean(process.env.CONSOLE_DATABASE_URL);

const query = (text: string, params: unknown[] = []): Promise<Row[]> =>
  neon(process.env.CONSOLE_DATABASE_URL!).query(text, params) as Promise<Row[]>;

const toRun = (r: Row): CollectorRun => ({
  id: String(r.id),
  startedAt: new Date(r.started_at),
  finishedAt: r.finished_at ? new Date(r.finished_at) : null,
  status: r.status,
  error: r.error,
});

export async function recentRuns(limit = 20): Promise<CollectorRun[]> {
  return (await query("select id, started_at, finished_at, status, error from collector_runs order by id desc limit $1", [limit])).map(toRun);
}

/** Newest run that actually produced data (ok or partial). */
export async function latestDataRun(): Promise<CollectorRun | null> {
  const rows = await query("select id, started_at, finished_at, status, error from collector_runs where status in ('ok','partial') order by id desc limit 1");
  return rows[0] ? toRun(rows[0]) : null;
}

export async function packageSnapshots(runId: string): Promise<PackageSnapshot[]> {
  const rows = await query("select * from package_snapshots where run_id = $1 order by package", [runId]);
  return rows.map((r) => ({
    runId: String(r.run_id), package: r.package, repo: r.repo, branchVersion: r.branch_version,
    latest: r.latest, next: r.next, divergence: r.divergence, dependents: r.dependents,
  }));
}

export async function cellSnapshots(runId: string): Promise<CellSnapshot[]> {
  const rows = await query("select * from cell_snapshots where run_id = $1 order by ring, cell", [runId]);
  return rows.map((r) => ({
    runId: String(r.run_id), cell: r.cell, client: r.client, ring: r.ring, region: r.region, url: r.url,
    healthzStatus: r.healthz_status, readyzStatus: r.readyz_status, checkedAt: new Date(r.checked_at),
  }));
}
