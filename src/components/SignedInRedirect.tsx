import { redirectIfSignedIn } from "@/lib/server/session";

// docs/agent-memory/auth.md A8.3. Reads the cookie, so it renders inside
// <Suspense> (cacheComponents) and outputs nothing.
export async function SignedInRedirect(): Promise<null> {
  await redirectIfSignedIn();
  return null;
}
