import { describe, expect, it } from "vitest";
import { cellColour, packageColour, staleness, worst } from "./rules";
import type { CellSnapshot, PackageSnapshot } from "./types";

const H = 3_600_000;
const now = new Date("2026-01-10T12:00:00Z");
const ago = (ms: number): Date => new Date(now.getTime() - ms);

describe("staleness", () => {
  it("null finishedAt is red", () => expect(staleness(null, now)).toBe("red"));
  it("fresh is green", () => expect(staleness(ago(H), now)).toBe("green"));
  it("exactly 26h is green", () => expect(staleness(ago(26 * H), now)).toBe("green"));
  it("just over 26h is amber", () => expect(staleness(ago(26 * H + 1), now)).toBe("amber"));
  it("exactly 50h is amber", () => expect(staleness(ago(50 * H), now)).toBe("amber"));
  it("just over 50h is red", () => expect(staleness(ago(50 * H + 1), now)).toBe("red"));
});

const pkg = (divergence: string): PackageSnapshot => ({
  runId: "r1",
  package: "@tindevelopers/x",
  repo: "x",
  branchVersion: null,
  latest: null,
  next: null,
  divergence,
  dependents: null,
});

describe("packageColour", () => {
  it("OK is green", () => expect(packageColour(pkg("OK"))).toBe("green"));
  it("OK (unpublished) is green", () =>
    expect(packageColour(pkg("OK (unpublished — no registry versions yet)"))).toBe("green"));
  it("OK (forward) is amber", () =>
    expect(
      packageColour(pkg('OK (forward — 1.1.1 published to "next", awaiting G2 promotion to "latest")')),
    ).toBe("amber"));
  it("backward divergence is red", () =>
    expect(packageColour(pkg("BACKWARD — branch 1.0.0 < latest 1.1.0"))).toBe("red"));
  it("KNOWN DRIFT (allowlisted in the registry) is amber", () =>
    expect(packageColour(pkg("KNOWN DRIFT (allowlisted): registry latest 0.4.0 > branch 0.3.1"))).toBe("amber"));

  it("other non-OK string is red", () =>
    expect(packageColour(pkg("KNOWN (allowlisted) — something"))).toBe("red"));
  it("unknown string is red", () => expect(packageColour(pkg("???"))).toBe("red"));
  it("empty string is red", () => expect(packageColour(pkg(""))).toBe("red"));
});

const cell = (healthzStatus: number | null, readyzStatus: number | null): CellSnapshot => ({
  runId: "r1",
  cell: "c1",
  client: "acme",
  ring: 0,
  region: "eu",
  url: null,
  healthzStatus,
  readyzStatus,
  checkedAt: now,
});

describe("cellColour", () => {
  it("both 200 is green", () => expect(cellColour(cell(200, 200))).toBe("green"));
  it("healthz not checked (Cloud Run) with readyz 200 is green", () => expect(cellColour(cell(null, 200))).toBe("green"));
  it("nothing answered is red", () => expect(cellColour(cell(null, null))).toBe("red"));
  it("healthz 404 is red (a non-Cloud-Run cell whose liveness route is missing)", () => expect(cellColour(cell(404, 200))).toBe("red"));
  it("null readyz is red", () => expect(cellColour(cell(200, null))).toBe("red"));
  it("non-200 healthz is red", () => expect(cellColour(cell(500, 200))).toBe("red"));
  it("non-200 readyz is red", () => expect(cellColour(cell(200, 503))).toBe("red"));
});

describe("worst", () => {
  it("empty is green", () => expect(worst([])).toBe("green"));
  it("all green is green", () => expect(worst(["green", "green"])).toBe("green"));
  it("amber beats green", () => expect(worst(["green", "amber"])).toBe("amber"));
  it("red beats amber", () => expect(worst(["amber", "red", "green"])).toBe("red"));
});
