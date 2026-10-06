import { afterEach, describe, expect, it, vi } from "vitest";
import { createIssue } from "./github";
import { buildPinTask, bumpSize, validRepo } from "./task";

const input = { repo: "tindevelopers/konnect-caas-base", project: "konnect-app", environment: "development", pkg: "@tindevelopers/domain-support", declared: "5.1.0", latest: "6.0.0", requestedBy: "a@tin.info" };

describe("agent task", () => {
  it("classifies the step", () => {
    expect(bumpSize("5.1.0", "6.0.0")).toBe("major");
    expect(bumpSize("1.2.0", "1.12.2")).toBe("minor");
    expect(bumpSize("0.2.0", "0.2.1")).toBe("patch");
    expect(bumpSize("1.0.0", "1.0.0")).toBeNull();
    expect(bumpSize("^1.0.0", "2.0.0")).toBeNull();
  });
  it("asks for a draft PR only and warns on majors", () => {
    const t = buildPinTask(input);
    expect(t.body).toMatch(/^@claude /);
    expect(t.body).toContain("**draft** pull request");
    expect(t.body).toContain("MAJOR upgrade");
    expect(t.title).toContain("5.1.0 to 6.0.0");
  });
  it("refuses a pin that is not behind", () => {
    expect(() => buildPinTask({ ...input, declared: "6.0.0" })).toThrow();
  });
  it("only accepts owner/name repos", () => {
    expect(validRepo("tindevelopers/konnect-caas-base")).toBe(true);
    for (const bad of ["", null, "x", "a/b/c", "a/b?x=1", "../a/b"]) expect(validRepo(bad as string)).toBe(false);
  });
});

describe("createIssue", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("posts to the repo and returns the issue url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ html_url: "https://github.com/o/r/issues/1" }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await createIssue(buildPinTask(input), "tok")).toBe("https://github.com/o/r/issues/1");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.github.com/repos/tindevelopers/konnect-caas-base/issues");
  });
  it("fails clearly without a token or on an error status", async () => {
    await expect(createIssue(buildPinTask(input), "")).rejects.toThrow(/AGENT_GITHUB_TOKEN/);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(createIssue(buildPinTask(input), "tok")).rejects.toThrow(/404/);
  });
});
