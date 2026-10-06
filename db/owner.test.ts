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
  for (const f of ["001_status.sql", "002_authority.sql", "003_owner_project.sql"]) await db.exec(read(f));
  await db.exec(read("003_owner_project.sql")); // idempotent
  await db.exec(`select set_config('console.actor','seed',false); insert into projects (slug,name,kind) values ('boss','BOSS','boss'),('hub','Hub','hub'); select set_config('console.actor','',false);`);
}, 60_000);

describe("003_owner_project", () => {
  it("lets console_admin set the owning project, audited with before and after", async () => {
    await as("console_admin", async () => {
      await db.exec("BEGIN; select set_config('console.actor','gene@tin.info',true); update projects set owner_project = 'boss' where slug in ('hub','boss'); COMMIT");
    });
    const r = await db.query<{ after: { owner_project: string }; before: { owner_project: string | null } }>("select before, after from registry_audit where actor = 'gene@tin.info' and table_name = 'projects' and after->>'slug' = 'hub'");
    expect(r.rows[0].before.owner_project).toBeNull();
    expect(r.rows[0].after.owner_project).toBe("boss");
  });
  it("a project may own itself, but not an unknown project", async () => {
    expect((await db.query<{ owner_project: string }>("select owner_project from projects where slug = 'boss'")).rows[0].owner_project).toBe("boss");
    await expect(as("console_admin", async () => {
      await db.exec("BEGIN; select set_config('console.actor','gene@tin.info',true)");
      try { await db.exec("update projects set owner_project = 'nope' where slug = 'hub'"); } finally { await db.exec("ROLLBACK"); }
    })).rejects.toThrow(/foreign key/i);
  });
  it("console_reader can read it and cannot write it", async () => {
    const r = await as("console_reader", () => db.query<{ owner_project: string }>("select owner_project from projects where slug = 'hub'"));
    expect(r.rows[0].owner_project).toBe("boss");
    await expect(as("console_reader", () => db.exec("update projects set owner_project = null"))).rejects.toThrow(/permission denied/);
  });
});
