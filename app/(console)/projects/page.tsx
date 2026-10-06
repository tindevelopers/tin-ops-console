import { currentOperator, requireOperator } from "@/src/auth/access";
import { loadObserved, loadRegistry, registryConfigured, registryWritable } from "@/src/registry/db";
import ProjectsView from "@/components/ProjectsView";
import { Notice, PageHeading } from "@/components/StatusUi";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireOperator();
  const sp = await searchParams;
  if (!registryConfigured()) return <div><PageHeading title="Projects" /><Notice>The status store is not connected. Set CONSOLE_DATABASE_URL.</Notice></div>;
  const [reg, observed, op] = await Promise.all([loadRegistry(), loadObserved(), currentOperator()]);
  return <ProjectsView reg={reg} observed={observed} sp={sp} canEdit={op?.role === "admin" && registryWritable()} isAdmin={op?.role === "admin"} error={typeof sp.error === "string" ? sp.error : undefined} />;
}
