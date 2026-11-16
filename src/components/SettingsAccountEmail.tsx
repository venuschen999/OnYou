import type { ReactElement } from "react";
import { AccountEmail } from "@/components/AccountEmail";
import { requireUser } from "@/lib/server/session";

// Server read of the signed-in email; the page wraps this in Suspense
// (cacheComponents).
export async function SettingsAccountEmail(): Promise<ReactElement> {
  const user = await requireUser();
  return <AccountEmail email={user.email} />;
}
