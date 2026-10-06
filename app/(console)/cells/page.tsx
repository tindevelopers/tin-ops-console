import { requireOperator } from "@/src/auth/access";
import { cellSnapshots, latestDataRun, statusStoreConfigured } from "@/src/status/db";
import { cellColour } from "@/src/status/rules";
import { Notice, PageHeading, StatusDot, Table, fmt, td } from "@/components/StatusUi";

export const dynamic = "force-dynamic";

export default async function CellsPage() {
  await requireOperator();
  if (!statusStoreConfigured()) {
    return (
      <div>
        <PageHeading title="Cells" />
        <Notice>The status store is not connected. Set CONSOLE_DATABASE_URL to the console_reader connection string in .env.local.</Notice>
      </div>
    );
  }
  const run = await latestDataRun();
  const rows = run ? await cellSnapshots(run.id) : [];
  return (
    <div>
      <PageHeading title="Cells" subtitle={run ? `From collector run ${run.id}, finished ${fmt(run.finishedAt)}` : undefined} />
      {rows.length === 0 ? (
        <Notice>No cell data yet. The collector has not completed a run.</Notice>
      ) : (
        <Table head={["Cell", "Client", "Ring", "Region", "healthz", "readyz", "Checked", "Status"]}>
          {rows.map((r) => (
            <tr key={r.cell}>
              <td className={`${td} font-medium`}>{r.url ? <a className="underline" href={r.url} target="_blank" rel="noreferrer">{r.cell}</a> : r.cell}</td>
              <td className={td}>{r.client}</td>
              <td className={td}>{r.ring}</td>
              <td className={td}>{r.region}</td>
              <td className={td}>{r.healthzStatus ?? "—"}</td>
              <td className={td}>{r.readyzStatus ?? "—"}</td>
              <td className={td}>{fmt(r.checkedAt)}</td>
              <td className={td}><StatusDot colour={cellColour(r)} /></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
