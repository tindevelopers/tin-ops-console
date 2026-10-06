import { requireOperator } from "@/src/auth/access";
import { bySeverity, computeDrift } from "@/src/registry/drift";
import { loadObserved, loadRegistry, registryConfigured } from "@/src/registry/db";
import { staleness, worst } from "@/src/status/rules";
import type { Colour } from "@/src/status/types";
import { Findings } from "@/components/RegistryUi";
import { Notice, PageHeading, StatusDot, fmt } from "@/components/StatusUi";
import { signOut } from "../signin/actions";

export const dynamic = "force-dynamic";

function Tile({ label, value, hint, colour }: { label: string; value: string; hint?: string; colour?: Colour }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
      {colour ? <div className="mt-1 text-sm"><StatusDot colour={colour} /></div> : hint ? <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{hint}</p> : null}
    </div>
  );
}

export default async function OverviewPage() {
  const op = await requireOperator();
  const signOutForm = <form action={signOut} className="mt-8 text-sm text-gray-500">Signed in as {op.email} ({op.role}). <button className="underline">Sign out</button></form>;
  if (!registryConfigured()) {
    return <div><PageHeading title="Overview" /><Notice>The status store is not connected. Set CONSOLE_DATABASE_URL.</Notice>{signOutForm}</div>;
  }

  const [reg, observed] = await Promise.all([loadRegistry(), loadObserved()]);
  const findings = computeDrift(reg, observed.packages, observed.cells).sort(bySeverity);
  const count = (c: Colour) => findings.filter((f) => f.colour === c).length;
  const attention = findings.filter((f) => f.colour !== "green");
  const active = reg.projects.filter((p) => p.lifecycle === "active").length;
  const age = staleness(observed.run?.finishedAt ?? null, new Date());

  return (
    <div>
      <PageHeading title="Overview" subtitle="What TIN runs, and whether it matches what was declared." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Active projects" value={String(active)} hint={`${reg.projects.length} registered`} />
        <Tile label="Needs action" value={String(count("red"))} colour={count("red") > 0 ? "red" : "green"} />
        <Tile label="Needs attention" value={String(count("amber"))} colour={count("amber") > 0 ? "amber" : "green"} />
        <Tile label="Collector data" value={observed.run ? fmt(observed.run.finishedAt).slice(5, 16) : "none"} colour={observed.run ? age : "red"} />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-gray-800 dark:text-white/90">Most urgent</h2>
      {reg.projects.length === 0 ? (
        <Notice>No projects are registered yet. <a className="underline" href="/projects">Add the first one.</a></Notice>
      ) : attention.length === 0 ? (
        <Notice>Everything declared matches what was observed ({findings.length} checks).</Notice>
      ) : (
        <>
          <Findings findings={attention.slice(0, 8)} showProject />
          <p className="mt-3 text-sm"><a className="underline" href="/drift">All {attention.length} findings</a> · overall {worst(findings.map((f) => f.colour))}</p>
        </>
      )}
      {signOutForm}
    </div>
  );
}
