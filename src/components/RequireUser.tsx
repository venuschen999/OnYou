import type { ReactNode } from "react";
import { requireUser } from "@/lib/server/session";

type RequireUserProps = { children: ReactNode };

// Full session check for app routes (docs/agent-memory/auth.md A9). The proxy
// already redirected requests without a valid JWT; this also catches a stale
// tokenVersion after a password reset.
export async function RequireUser({
  children,
}: RequireUserProps): Promise<ReactNode> {
  await requireUser();
  return children;
}
