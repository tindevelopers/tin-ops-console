import { compareVersions, parseVersion } from "@/src/registry/drift";

export type AgentTask = { repo: string; title: string; body: string };

type PinTaskInput = { repo: string; project: string; environment: string; pkg: string; declared: string; latest: string; requestedBy: string };

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export const validRepo = (s: string | null | undefined): s is string => !!s && REPO.test(s);

/** major / minor / patch step from declared to latest, or null when either is not an exact version. */
export function bumpSize(declared: string, latest: string): "major" | "minor" | "patch" | null {
  const d = parseVersion(declared);
  const l = parseVersion(latest);
  if (!d || !l || compareVersions(d, l) >= 0) return null;
  return d.core[0] < l.core[0] ? "major" : d.core[1] < l.core[1] ? "minor" : "patch";
}

/**
 * The work order handed to the agent. It asks for a draft PR only: a person merges, and the console's declared pin is
 * changed afterwards, so the registry stays the authority on what should be running.
 */
export function buildPinTask(i: PinTaskInput): AgentTask {
  const size = bumpSize(i.declared, i.latest);
  if (!size) throw new Error(`${i.pkg} ${i.declared} is not behind ${i.latest}.`);
  const careful = size === "major"
    ? "This is a MAJOR upgrade. Read the package's changelog or release notes first, list the breaking changes that affect this repo, and fix every call site."
    : "This is a minor or patch upgrade; it should be low risk, but still run the full test suite.";
  return {
    repo: i.repo,
    title: `Upgrade ${i.pkg} ${i.declared} to ${i.latest} (${i.project}, ${i.environment})`,
    body: [
      `@claude Upgrade \`${i.pkg}\` from \`${i.declared}\` to \`${i.latest}\` for \`${i.project}\` (${i.environment}).`,
      "",
      careful,
      "",
      "Rules:",
      "- Change only what this upgrade needs. Do not bump other packages.",
      "- Run the repo's lint, type-check and tests, and fix failures this upgrade causes.",
      "- Open a **draft** pull request. Do not merge it and do not enable auto-merge.",
      "- In the PR description, say what changed and anything a reviewer must check.",
      "",
      `Requested by ${i.requestedBy} from the TIN ops console, which declares \`${i.pkg}\` at \`${i.declared}\` for this project. After this merges, update the declared pin in the console.`,
    ].join("\n"),
  };
}
