import type { Colour } from "@/src/status/types";

// These lists mirror the CHECK constraints in db/002_authority.sql; the database is the backstop.
export const KINDS = ["boss", "hub", "spoke", "package", "shell-base", "app"] as const;
export const LIFECYCLES = ["planned", "active", "retired"] as const;
export const ENV_NAMES = ["development", "staging", "production"] as const;
export const DOMAIN_MODES = ["inprocess", "shadow", "remote"] as const;
export const RELATIONS = ["consumes", "calls", "hosts"] as const;
export const ASSIGN_ROLES = ["owner", "maintainer"] as const;

export type Kind = (typeof KINDS)[number];
export type Lifecycle = (typeof LIFECYCLES)[number];
export type EnvName = (typeof ENV_NAMES)[number];
export type DomainMode = (typeof DOMAIN_MODES)[number];
export type Relation = (typeof RELATIONS)[number];
export type AssignRole = (typeof ASSIGN_ROLES)[number];

export type Project = { slug: string; name: string; kind: Kind; client: string | null; repo: string | null; lifecycle: Lifecycle; notes: string | null; ownerProject: string | null; path: string | null };
export type Environment = { projectSlug: string; name: EnvName; cell: string | null; region: string | null; url: string | null };
export type Pin = { projectSlug: string; environment: EnvName; package: string; version: string };
export type Adoption = { projectSlug: string; environment: EnvName; domainMode: DomainMode };
export type Assignment = { id: string; projectSlug: string; assignee: string; role: AssignRole; assignedBy: string; assignedAt: Date };
export type ProjectRelation = { fromSlug: string; toSlug: string; relation: Relation };

export type Registry = {
  projects: Project[];
  environments: Environment[];
  pins: Pin[];
  adoption: Adoption[];
  assignments: Assignment[]; // active only
  relations: ProjectRelation[];
};

export type Finding = {
  projectSlug: string;
  environment: EnvName | null;
  kind: "pin" | "cell" | "owner";
  subject: string;
  colour: Colour;
  message: string;
};
