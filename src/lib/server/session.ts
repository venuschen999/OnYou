import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserByAuthToken } from "./auth";
import type { PublicUser } from "./authService";
import { AUTH_COOKIE_NAME } from "./authToken";
import { ROUTES } from "@/lib/routes";

// Server Components have no Request; they read the auth cookie via next/headers.
async function getSessionUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  return findUserByAuthToken(token, new Date());
}

// Full check (JWT plus tokenVersion) for app pages (docs/agent-memory/auth.md A9).
export async function requireUser(): Promise<PublicUser> {
  const user = await getSessionUser();
  if (!user) redirect(ROUTES.login);
  return user;
}

// auth.md A8.3: signed-in users skip the auth screens. A stale token does not
// redirect, so /login and /dashboard cannot bounce between each other.
export async function redirectIfSignedIn(): Promise<void> {
  const user = await getSessionUser();
  if (user) redirect(ROUTES.home);
}
