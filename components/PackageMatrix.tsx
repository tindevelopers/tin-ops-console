import Link from "next/link";
import type { PackageRow } from "@/src/registry/view";
import { StatusDot, Table, td } from "@/components/StatusUi";

const pill: Record<string, string> = {
  red: "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200",
  amber: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  green: "border-green-300 bg-green-50 text-green-800 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200",
};

/** One row per package; each declared version is a chip listing the projects that use it. */
export default function PackageMatrix({ rows }: { rows: PackageRow[] }) {
  return (
    <Table head={["Package", "Latest", "Next", "Declared versions and who uses them", "Status"]}>
      {rows.map((r) => (
        <tr key={r.package}>
          <td className={`${td} font-medium`}>{r.package}{r.behind > 0 && <span className="ml-2 text-xs font-normal text-gray-500">{r.behind} behind</span>}</td>
          <td className={td}>{r.latest ?? "—"}</td>
          <td className={td}>{r.next ?? "—"}</td>
          <td className={td}>
            <ul className="space-y-2">
              {r.groups.map((g) => (
                <li key={g.version} className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${pill[g.colour]}`} title={g.message}>{g.version}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {g.projects.map((p, i) => (
                      <span key={`${p.slug}-${p.environment}`}>{i > 0 && ", "}<Link href={`/projects/${p.slug}`} className="underline" title={p.environment}>{p.slug}</Link></span>
                    ))}
                  </span>
                  {g.colour !== "green" && <span className="text-xs text-gray-500 dark:text-gray-400">{g.message}</span>}
                </li>
              ))}
            </ul>
          </td>
          <td className={td}><StatusDot colour={r.worst} /></td>
        </tr>
      ))}
    </Table>
  );
}
