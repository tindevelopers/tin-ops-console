import { currentOperator, requireOperator } from "@/src/auth/access";
import { computeDrift, projectColour } from "@/src/registry/drift";
import { loadObserved, loadRegistry, registryConfigured, registryWritable } from "@/src/registry/db";
import { KINDS, LIFECYCLES } from "@/src/registry/types";
import { saveProject } from "./actions";
import { ErrorNotice, Select, btnCls, inputCls } from "@/components/RegistryUi";
import { Notice, PageHeading, StatusDot, Table, td } from "@/components/StatusUi";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireOperator();
  const { error } = await searchParams;
  if (!registryConfigured()) return <div><PageHeading title="Projects" /><Notice>The status store is not connected. Set CONSOLE_DATABASE_URL.</Notice></div>;
  const [reg, observed, op] = await Promise.all([loadRegistry(), loadObserved(), currentOperator()]);
  const findings = computeDrift(reg, observed.packages, observed.cells);
  const canEdit = op?.role === "admin" && registryWritable();
  const owners = (slug: string) => reg.assignments.filter((a) => a.projectSlug === slug && a.role === "owner").map((a) => a.assignee).join(", ") || "—";

  return (
    <div>
      <PageHeading title="Projects" subtitle="Everything TIN runs: the BOSS, hubs, spokes, packages, Shell Base and the apps that consume them." />
      <ErrorNotice message={error} />
      {reg.projects.length === 0 ? (
        <Notice>No projects are registered yet.</Notice>
      ) : (
        <Table head={["Project", "Kind", "Client", "Owner", "Lifecycle", "Status"]}>
          {reg.projects.map((p) => (
            <tr key={p.slug}>
              <td className={`${td} font-medium`}><a className="underline" href={`/projects/${p.slug}`}>{p.name}</a> <span className="text-gray-400">{p.slug}</span></td>
              <td className={td}>{p.kind}</td>
              <td className={td}>{p.client ?? "—"}</td>
              <td className={td}>{owners(p.slug)}</td>
              <td className={td}>{p.lifecycle}</td>
              <td className={td}>{p.lifecycle === "retired" ? "—" : <StatusDot colour={projectColour(p.slug, findings)} />}</td>
            </tr>
          ))}
        </Table>
      )}
      {canEdit ? (
        <form action={saveProject} className="mt-8 flex flex-wrap items-end gap-3">
          <label className="text-sm">Id<br /><input name="slug" autoComplete="off" className={inputCls} placeholder="konnect-caas-base" required /></label>
          <label className="text-sm">Name<br /><input name="name" autoComplete="off" className={inputCls} required /></label>
          <label className="text-sm">Kind<br /><Select name="kind" options={KINDS} defaultValue="app" /></label>
          <label className="text-sm">Client<br /><input name="client" autoComplete="off" className={inputCls} /></label>
          <label className="text-sm">Repo<br /><input name="repo" autoComplete="off" className={inputCls} placeholder="tindevelopers/…" /></label>
          <label className="text-sm">Lifecycle<br /><Select name="lifecycle" options={LIFECYCLES} defaultValue="active" /></label>
          <button className={btnCls}>Add project</button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">{op?.role === "admin" ? "Editing is off: CONSOLE_ADMIN_DATABASE_URL is not set." : "You have view access. Ask an admin to change the registry."}</p>
      )}
    </div>
  );
}
