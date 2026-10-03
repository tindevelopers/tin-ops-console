import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const SQL = readFileSync(join(__dirname, "001_status.sql"), "utf8");
const ALL_TABLES = ["collector_runs", "package_snapshots", "cell_snapshots", "credential_snapshots", "console_operators"];

let db: PGlite;

async function as<T>(role: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`SET ROLE ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SQL);
  await db.exec(SQL); // idempotent
  // Seed as owner so readers and writers have rows to act on.
  await db.exec(`
    INSERT INTO collector_runs (status) VALUES ('ok');
    INSERT INTO package_snapshots (run_id, package, repo, divergence) VALUES (1, '@tindevelopers/x', 'tindevelopers/y', 'OK');
    INSERT INTO cell_snapshots (run_id, cell, client, ring, region, checked_at) VALUES (1, 'c', 'konnect', 0, 'europe-west2', now());
    INSERT INTO credential_snapshots (run_id, cell, public_id, program, environment, status) VALUES (1, 'c', 'k1', 'konnect', 'development', 'active');
    INSERT INTO console_operators (user_id, email, added_by) VALUES ('u1', 'a@tin.info', 'owner');
  `);
});

describe("console_reader is SELECT-only", () => {
  it.each(ALL_TABLES)("can SELECT %s", async (t) => {
    const r = await as("console_reader", () => db.query(`SELECT count(*)::int AS n FROM ${t}`));
    expect((r.rows[0] as { n: number }).n).toBe(1);
  });

  it.each(ALL_TABLES)("cannot INSERT, UPDATE or DELETE %s", async (t) => {
    await expect(as("console_reader", () => db.exec(`DELETE FROM ${t}`))).rejects.toThrow(/permission denied/);
    await expect(as("console_reader", () => db.exec(`UPDATE ${t} SET run_id = run_id`))).rejects.toThrow();
    await expect(as("console_reader", () => db.exec(`INSERT INTO ${t} DEFAULT VALUES`))).rejects.toThrow();
  });

  it("cannot create tables", async () => {
    await expect(as("console_reader", () => db.exec("CREATE TABLE x (id int)"))).rejects.toThrow(/permission denied/);
  });
});

describe("collector_writer", () => {
  it("records a run with snapshots, finishes it, and prunes it with its snapshots", async () => {
    await as("collector_writer", async () => {
      const run = await db.query<{ id: number }>("INSERT INTO collector_runs DEFAULT VALUES RETURNING id");
      const id = run.rows[0].id;
      await db.query("INSERT INTO package_snapshots (run_id, package, repo, divergence) VALUES ($1, 'p', 'r', 'OK')", [id]);
      await db.query("INSERT INTO cell_snapshots (run_id, cell, client, ring, region, checked_at) VALUES ($1, 'c', 'k', 0, 'eu', now())", [id]);
      await db.query("UPDATE collector_runs SET status = 'ok', finished_at = now() WHERE id = $1", [id]);
      await db.query("DELETE FROM collector_runs WHERE id = $1", [id]);
      const left = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM package_snapshots WHERE run_id = $1", [id]);
      expect(left.rows[0].n).toBe(0);
    });
  });

  it("cannot rewrite a run's start time", async () => {
    await expect(as("collector_writer", () => db.exec("UPDATE collector_runs SET started_at = now()"))).rejects.toThrow(/permission denied/);
  });

  it("cannot read or change console_operators", async () => {
    await expect(as("collector_writer", () => db.exec("SELECT * FROM console_operators"))).rejects.toThrow(/permission denied/);
    await expect(as("collector_writer", () => db.exec("INSERT INTO console_operators (user_id, email, added_by) VALUES ('x','x','x')"))).rejects.toThrow(/permission denied/);
  });

  it.each(["package_snapshots", "cell_snapshots", "credential_snapshots"])("cannot change or delete %s rows directly", async (t) => {
    await expect(as("collector_writer", () => db.exec(`DELETE FROM ${t}`))).rejects.toThrow(/permission denied/);
    await expect(as("collector_writer", () => db.exec(`UPDATE ${t} SET run_id = run_id`))).rejects.toThrow(/permission denied/);
  });
});
