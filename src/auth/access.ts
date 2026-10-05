import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { requireUser } from "./auth";

export type Operator = { userId: string; email: string; role: "viewer" | "admin" };

/** The signed-in user's active console_operators row, or null. Neon Auth sign-up can't be closed to OAuth, so signing in alone grants nothing here (spec C6). */
export async function currentOperator(): Promise<Operator | null> {
  const user = await requireUser();
  if (!process.env.CONSOLE_DATABASE_URL) return null;
  const rows = (await neon(process.env.CONSOLE_DATABASE_URL).query(
    "select role from console_operators where user_id = $1 and removed_at is null",
    [user.id],
  )) as { role: "viewer" | "admin" }[];
  return rows[0] ? { userId: user.id, email: user.email!, role: rows[0].role } : null;
}

export async function requireOperator(): Promise<Operator> {
  const op = await currentOperator();
  if (!op) redirect("/signin?error=" + encodeURIComponent("This account is not authorised for the console."));
  return op;
}

/** For every write. Server actions are public endpoints, so each one checks this itself rather than relying on the page hiding the form. */
export async function requireAdmin(): Promise<Operator> {
  const op = await requireOperator();
  if (op.role !== "admin") throw new Error("Admin access required.");
  return op;
}
