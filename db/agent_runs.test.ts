import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(join(__dirname, f), "utf8");
let db: PGlite;
const as = async <T>(role: string, fn: () => Promise<T>) => {
  await db.exec(`SET ROLE ${role}`);
  try { return await fn(); } finally { await db.exec("RESET ROLE"); }
};

beforeAll(async () => {
  db = new PGlite();
  for (const f of ["001_status.sql", "002_authority.sql", "003_owner_project.sql", "004_project_path_agent_runs.sql"]) await db.exec(read(f));
  await db.exec(read("004_project_path_agent_runs.sql")); // idempotent
  await db.exec(`select set_config('console.actor','seed',false); insert into projects (slug,name,kind) values ('ops','Ops','app'); insert into environments (project_slug,name) values ('ops','development'); select set_config('console.actor','',false);`);
}, 60_000);

const insert = "insert into agent_runs (project_slug,environment,package,from_version,to_version,issue_url,requested_by) values ('ops','development','@x/y','1.0.0','1.1.0','https://github.com/o/r/issues/1','a@tin.info')";

describe("004_project_path_agent_runs", () => {
  it("lets console_admin set a project's path, audited", async () => {
    await as("console_admin", () => db.exec("BEGIN; select set_config('console.actor','gene@tin.info',true); update projects set path = 'apps/ops' where slug = 'ops'; COMMIT"));
    const r = await db.query<{ after: { path: string } }>("select after from registry_audit where actor = 'gene@tin.info' and table_name = 'projects'");
    expect(r.rows[0].after.path).toBe("apps/ops");
  });
  it("console_admin can record a hand-off and everyone can read it; nobody can change or delete it", async () => {
    await as("console_admin", () => db.exec(insert));
    expect((await as("console_reader", () => db.query("select 1 from agent_runs"))).rows).toHaveLength(1);
    await expect(as("console_admin", () => db.exec("update agent_runs set issue_url = 'x'"))).rejects.toThrow(/permission denied/);
    await expect(as("console_admin", () => db.exec("delete from agent_runs"))).rejects.toThrow(/permission denied/);
  });
  it("console_reader and collector_writer cannot record one", async () => {
    await expect(as("console_reader", () => db.exec(insert))).rejects.toThrow(/permission denied/);
    await expect(as("collector_writer", () => db.exec(insert))).rejects.toThrow(/permission denied/);
  });
  it("a hand-off must name a declared environment", async () => {
    await expect(as("console_admin", () => db.exec(insert.replace("'development'", "'production'")))).rejects.toThrow(/foreign key/i);
  });
});
