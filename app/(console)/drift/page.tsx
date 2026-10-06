import { requireOperator } from "@/src/auth/access";
import { agentConfigured } from "@/src/agent/github";
import { fixWithAgent } from "./actions";
import { loadObserved, loadRegistry, registryConfigured } from "@/src/registry/db";
import DriftView from "@/components/DriftView";
import { Notice, PageHeading } from "@/components/StatusUi";

export const dynamic = "force-dynamic";

export default async function DriftPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const op = await requireOperator();
  const sp = await searchParams;
  if (!registryConfigured()) return <div><PageHeading title="Drift" /><Notice>The status store is not connected. Set CONSOLE_DATABASE_URL.</Notice></div>;
  const [reg, observed] = await Promise.all([loadRegistry(), loadObserved()]);
  return <DriftView reg={reg} observed={observed} sp={sp} onFix={op.role === "admin" && agentConfigured() ? fixWithAgent : undefined} />;
}
