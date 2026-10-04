import { requireUser } from "@/src/auth/auth";
import { recentRuns, statusStoreConfigured } from "@/src/status/db";
import { staleness } from "@/src/status/rules";
import { Notice, PageHeading, StatusDot, Table, fmt, td } from "@/components/StatusUi";

export const dynamic = "force-dynamic";

export default async function CollectorPage() {
  await requireUser();
  if (!statusStoreConfigured()) {
    return (
      <div>
        <PageHeading title="Collector" />
        <Notice>The status store is not connected. Set CONSOLE_DATABASE_URL to the console_reader connection string in .env.local.</Notice>
      </div>
    );
  }
  const runs = await recentRuns();
  const newestFinished = runs.find((r) => r.finishedAt)?.finishedAt ?? null;
  return (
    <div>
      <PageHeading title="Collector" subtitle="Freshness is green under 26 hours, amber to 50 hours, red beyond." />
      {runs.length === 0 ? (
        <Notice>No collector runs recorded yet.</Notice>
      ) : (
        <>
          <p className="mb-4 text-sm">Latest data: <StatusDot colour={staleness(newestFinished, new Date())} /> ({fmt(newestFinished)})</p>
          <Table head={["Run", "Started", "Finished", "Status", "Error"]}>
            {runs.map((r) => (
              <tr key={r.id}>
                <td className={`${td} font-medium`}>{r.id}</td>
                <td className={td}>{fmt(r.startedAt)}</td>
                <td className={td}>{fmt(r.finishedAt)}</td>
                <td className={td}>{r.status}</td>
                <td className={td}>{r.error ?? "—"}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </div>
  );
}
