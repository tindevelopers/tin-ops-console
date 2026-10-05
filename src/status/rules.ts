import type { CellSnapshot, Colour, PackageSnapshot } from "./types";

const HOUR_MS = 3_600_000;

export function staleness(finishedAt: Date | null, now: Date): Colour {
  if (finishedAt === null) return "red";
  const ageMs = now.getTime() - finishedAt.getTime();
  if (ageMs > 50 * HOUR_MS) return "red";
  if (ageMs > 26 * HOUR_MS) return "amber";
  return "green";
}

export function packageColour(row: PackageSnapshot): Colour {
  // Forward drift awaits promotion; KNOWN DRIFT is a backward divergence allowlisted in the registry's known-divergences.json.
  if (row.divergence.startsWith("OK (forward") || row.divergence.startsWith("KNOWN DRIFT")) return "amber";
  if (row.divergence.startsWith("OK")) return "green";
  return "red";
}

export function cellColour(row: CellSnapshot): Colour {
  return row.healthzStatus === 200 && row.readyzStatus === 200 ? "green" : "red";
}

export function worst(colours: Colour[]): Colour {
  if (colours.includes("red")) return "red";
  if (colours.includes("amber")) return "amber";
  return "green";
}
