"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/src/auth/access";
import { createIssue } from "@/src/agent/github";
import { buildPinTask, validRepo } from "@/src/agent/task";
import { loadObserved, loadRegistry } from "@/src/registry/db";
import { pinFinding } from "@/src/registry/drift";

/** Hand one drifting pin to an agent. Everything is re-derived from the registry here; the form only names the pin. */
export async function fixWithAgent(f: FormData) {
  const admin = await requireAdmin();
  const [project, environment, pkg] = ["project", "environment", "package"].map((k) => String(f.get(k) ?? ""));
  let result = "";
  try {
    const [reg, observed] = await Promise.all([loadRegistry(), loadObserved()]);
    const pin = reg.pins.find((p) => p.projectSlug === project && p.environment === environment && p.package === pkg);
    const proj = reg.projects.find((p) => p.slug === project);
    const snap = observed.packages?.find((s) => s.package === pkg);
    if (!pin || !proj) throw new Error("That pin is not in the registry.");
    if (!validRepo(proj.repo)) throw new Error("The project has no repository set.");
    if (!snap?.latest || pinFinding(pin, snap).colour === "green") throw new Error("Nothing to upgrade: the pin is not behind a published version.");
    const url = await createIssue(buildPinTask({ repo: proj.repo, project, environment, pkg, declared: pin.version, latest: snap.latest, requestedBy: admin.email }));
    result = `agent=${encodeURIComponent(url)}`;
  } catch (e) {
    console.error("fix with agent failed", e);
    result = `agentError=${encodeURIComponent(e instanceof Error ? e.message : "Could not start the agent.")}`;
  }
  redirect(`/drift?${result}`);
}
