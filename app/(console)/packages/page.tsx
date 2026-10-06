import { requireOperator } from "@/src/auth/access";
import { latestDataRun, packageSnapshots, statusStoreConfigured } from "@/src/status/db";
import { packageColour } from "@/src/status/rules";
import { Notice, PageHeading, StatusDot, Table, fmt, td } from "@/components/StatusUi";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  await requireOperator();
  if (!statusStoreConfigured()) return <Unconfigured title="Hubs and packages" />;
  const run = await latestDataRun();
  const rows = run ? await packageSnapshots(run.id) : [];
  return (
    <div>
      <PageHeading title="Hubs and packages" subtitle={run ? `From collector run ${run.id}, finished ${fmt(run.finishedAt)}` : undefined} />
      {rows.length === 0 ? (
        <Notice>No package data yet. The collector has not completed a run.</Notice>
      ) : (
        <Table head={["Package", "Repo", "Branch", "Latest", "Next", "Divergence", "Status"]}>
          {rows.map((r) => (
            <tr key={r.package}>
              <td className={`${td} font-medium`}>{r.package}</td>
              <td className={td}>{r.repo}</td>
              <td className={td}>{r.branchVersion ?? "—"}</td>
              <td className={td}>{r.latest ?? "—"}</td>
              <td className={td}>{r.next ?? "—"}</td>
              <td className={td}>{r.divergence}</td>
              <td className={td}><StatusDot colour={packageColour(r)} /></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function Unconfigured({ title }: { title: string }) {
  return (
    <div>
      <PageHeading title={title} />
      <Notice>The status store is not connected. Set CONSOLE_DATABASE_URL to the console_reader connection string in .env.local.</Notice>
    </div>
  );
}
