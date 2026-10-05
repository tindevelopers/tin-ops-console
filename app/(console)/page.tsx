import { requireUser } from "@/src/auth/auth";
import { signOut } from "../signin/actions";

// ponytail: placeholder until T8 builds the Overview panel. requireUser() is replaced by proxy.ts in T6.
export default async function OverviewPage() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <h1 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">Overview</h1>
      <p>Signed in as {user.email}</p>
      <form action={signOut}><button className="underline">Sign out</button></form>
    </div>
  );
}
