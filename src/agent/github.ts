import type { AgentTask } from "./task";

export const agentConfigured = () => !!process.env.AGENT_GITHUB_TOKEN;

/** Opens the work order as a GitHub issue; the Claude GitHub app picks up the @claude mention. Returns the issue URL. */
export async function createIssue(task: AgentTask, token = process.env.AGENT_GITHUB_TOKEN): Promise<string> {
  if (!token) throw new Error("AGENT_GITHUB_TOKEN is not set.");
  const res = await fetch(`https://api.github.com/repos/${task.repo}/issues`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json", "x-github-api-version": "2022-11-28" },
    body: JSON.stringify({ title: task.title, body: task.body }),
  });
  if (!res.ok) throw new Error(`GitHub returned ${res.status} creating the issue in ${task.repo}.`);
  const json = (await res.json()) as { html_url?: string };
  if (!json.html_url) throw new Error("GitHub did not return an issue URL.");
  return json.html_url;
}
