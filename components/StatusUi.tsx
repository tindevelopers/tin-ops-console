import type { Colour } from "@/src/status/types";

const dot: Record<Colour, string> = { green: "bg-green-500", amber: "bg-amber-500", red: "bg-red-500" };
const label: Record<Colour, string> = { green: "Healthy", amber: "Attention", red: "Failing" };

export function StatusDot({ colour }: { colour: Colour }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${dot[colour]}`} aria-hidden />
      <span>{label[colour]}</span>
    </span>
  );
}

export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <p role="status" className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/5 dark:text-gray-300">{children}</p>;
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-4 py-3";
export const fmt = (d: Date | null) => (d ? d.toISOString().replace("T", " ").slice(0, 16) + " UTC" : "—");
