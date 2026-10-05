import { requireOperator } from "@/src/auth/access";
import { bySeverity, computeDrift } from "@/src/registry/drift";
import { loadObserved, loadRegistry, registryConfigured } from "@/src/registry/db";
import { staleness } from "@/src/status/rules";
import { Findings } from "@/components/RegistryUi";
import { Notice, PageHeading, StatusDot, fmt } from "@/components/StatusUi";

export const dynamic = "force-dynamic";

export default async function DriftPage() {
  await requireOperator();
  if (!registryConfigured()) return <div><PageHeading title="Drift" /><Notice>The status store is not connected. Set CONSOLE_DATABASE_URL.</Notice></div>;
  const [reg, observed] = await Promise.all([loadRegistry(), loadObserved()]);
  const findings = computeDrift(reg, observed.packages, observed.cells).sort(bySeverity);
  const bad = findings.filter((f) => f.colour !== "green");
  const age = staleness(observed.run?.finishedAt ?? null, new Date());

  return (
    <div>
      <PageHeading
        title="Drift"
        subtitle="What the registry declares versus what the collector last observed. The registry is authoritative: drift means reality needs to change, or the declaration does."
      />
      {observed.run ? (
        <p className="mb-4 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          Observed at {fmt(observed.run.finishedAt)} <StatusDot colour={age} />
        </p>
      ) : (
        <Notice>The collector has not completed a run, so nothing can be compared yet. Package and cell checks show as needing attention until it does.</Notice>
      )}
      {age !== "green" && observed.run && <Notice>The observed data is stale, so the findings below may not reflect reality.</Notice>}
      {reg.projects.length === 0 ? (
        <div className="mt-4"><Notice>No projects are registered yet. <a className="underline" href="/projects">Add the first one.</a></Notice></div>
      ) : bad.length === 0 ? (
        <div className="mt-4"><Notice>Everything declared matches what was observed ({findings.length} checks).</Notice></div>
      ) : (
        <div className="mt-4">
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{bad.length} of {findings.length} checks need attention.</p>
          <Findings findings={bad} showProject />
        </div>
      )}
    </div>
  );
}
