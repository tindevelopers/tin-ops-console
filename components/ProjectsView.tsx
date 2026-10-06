import Link from "next/link";
import { computeDrift } from "@/src/registry/drift";
import type { Observed } from "@/src/registry/db";
import { KINDS, LIFECYCLES } from "@/src/registry/types";
import type { Registry } from "@/src/registry/types";
import { applyProjectFilters, isNestedView, nest, parseProjectFilters, projectCounts, sortProjectRows, summarise } from "@/src/registry/view";
import type { SortKey } from "@/src/registry/view";
import { saveProject } from "@/app/(console)/projects/actions";
import FilterBar from "@/components/FilterBar";
import type { FilterField } from "@/components/FilterBar";
import ProjectsTable from "@/components/ProjectsTable";
import type { SortLink } from "@/components/ProjectsTable";
import { ErrorNotice, Select, btnCls, inputCls } from "@/components/RegistryUi";
import { Notice, PageHeading } from "@/components/StatusUi";

const ANY = { value: "", label: "Any" };
const sortLabels: Record<SortKey, string> = { severity: "Status", name: "Project", kind: "Kind", client: "Client", owner: "Owner", lifecycle: "Lifecycle" };
const dot: Record<string, string> = { red: "bg-red-500", amber: "bg-amber-500", green: "bg-green-500", none: "bg-gray-400" };

function Tile({ label, value, href, tone }: { label: string; value: number; href: string; tone: keyof typeof dot }) {
  return (
    <Link href={href} className="rounded-xl border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5">
      <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><span className={`h-2.5 w-2.5 rounded-full ${dot[tone]}`} aria-hidden />{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
    </Link>
  );
}

export default function ProjectsView({ reg, observed, sp, canEdit, isAdmin, error }: { reg: Registry; observed: Observed; sp: Record<string, string | string[] | undefined>; canEdit: boolean; isAdmin: boolean; error?: string }) {
  const all = summarise(reg, computeDrift(reg, observed.packages, observed.cells));
  const counts = projectCounts(all);

  const f = parseProjectFilters(sp);
  const shown = sortProjectRows(applyProjectFilters(all, f), f.sort, f.dir);
  const nested = isNestedView(f);
  const tree = nested ? nest(shown) : shown.map((row) => ({ row, depth: 0 as const, childCount: 0, childRed: 0, childAmber: 0 }));

  const clients = [...new Set(all.map((r) => r.client).filter((c): c is string => Boolean(c)))].sort();
  const owners = [...new Set(all.flatMap((r) => r.owners))].sort();
  const fields: FilterField[] = [
    { kind: "search", name: "q", label: "Search projects", value: f.q, placeholder: "Search name, owner, client…" },
    { kind: "select", name: "status", label: "Status", value: f.status, options: [ANY, { value: "red", label: "Failing" }, { value: "amber", label: "Attention" }, { value: "green", label: "Healthy" }] },
    { kind: "select", name: "kind", label: "Kind", value: f.kind, options: [ANY, ...KINDS.map((k) => ({ value: k, label: k }))] },
    { kind: "select", name: "client", label: "Client", value: f.client, options: [ANY, { value: "none", label: "No client" }, ...clients.map((c) => ({ value: c, label: c }))] },
    { kind: "select", name: "owner", label: "Owner", value: f.owner, options: [ANY, { value: "none", label: "No owner" }, ...owners.map((o) => ({ value: o, label: o }))] },
    { kind: "select", name: "lifecycle", label: "Lifecycle", value: f.lifecycle, options: [ANY, ...LIFECYCLES.map((l) => ({ value: l, label: l }))] },
  ];

  // Clicking a column sorts by it (and flips direction if it is already the sort).
  const sorts: SortLink[] = (Object.keys(sortLabels) as SortKey[]).map((key) => {
    const active = f.sort === key;
    const dir = active ? (f.dir === "asc" ? "desc" : "asc") : key === "severity" ? "desc" : "asc";
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (k !== "sort" && k !== "dir" && k !== "error" && typeof v === "string") q.set(k, v);
    q.set("sort", key);
    q.set("dir", dir);
    return { key, label: sortLabels[key], href: `/projects?${q}`, active, dir: active ? f.dir : dir };
  });

  return (
    <div>
      <PageHeading title="Projects" subtitle="Everything TIN runs: the BOSS, hubs, spokes, packages, Shell Base and the apps that consume them." />
      <ErrorNotice message={error} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Failing" value={counts.red} href="/projects?status=red" tone="red" />
        <Tile label="Attention" value={counts.amber} href="/projects?status=amber" tone="amber" />
        <Tile label="No owner" value={counts.noOwner} href="/projects?owner=none" tone="none" />
        <Tile label="Healthy" value={counts.green} href="/projects?status=green" tone="green" />
      </div>

      <FilterBar fields={fields} shown={shown.length} total={all.length} noun="projects" />
      {all.length === 0 ? (
        <Notice>No projects are registered yet.</Notice>
      ) : shown.length === 0 ? (
        <Notice>No projects match these filters.</Notice>
      ) : (
        <ProjectsTable rows={tree} sorts={sorts} nested={nested} />
      )}
      {nested && <p className="mt-2 text-xs text-gray-500">Hosted apps are nested under their parent. Filtering or sorting shows a flat list.</p>}

      {canEdit ? (
        <details className="mt-8 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <summary className="cursor-pointer text-sm font-medium">Add a project</summary>
          <form action={saveProject} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">Id<br /><input name="slug" autoComplete="off" className={inputCls} placeholder="konnect-caas-base" required /></label>
            <label className="text-sm">Name<br /><input name="name" autoComplete="off" className={inputCls} required /></label>
            <label className="text-sm">Kind<br /><Select name="kind" options={KINDS} defaultValue="app" /></label>
            <label className="text-sm">Client<br /><input name="client" autoComplete="off" className={inputCls} /></label>
            <label className="text-sm">Repo<br /><input name="repo" autoComplete="off" className={inputCls} placeholder="tindevelopers/…" /></label>
            <label className="text-sm">Lifecycle<br /><Select name="lifecycle" options={LIFECYCLES} defaultValue="active" /></label>
            <button className={btnCls}>Add project</button>
          </form>
        </details>
      ) : (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">{isAdmin ? "Editing is off: CONSOLE_ADMIN_DATABASE_URL is not set." : "You have view access. Ask an admin to change the registry."}</p>
      )}
    </div>
  );
}
