import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/server/authToken";

const LOGIN_PATH = "/login";

// App routes behind login (AGENTS.md §3, src/app/(app)/).
const PROTECTED_PREFIXES = ["/dashboard", "/focus", "/history", "/settings"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// docs/agent-memory/auth.md A9: optimistic check only. It verifies the JWT
// signature and expiry from the cookie and never queries the database; the
// (app) layout runs the full tokenVersion check.
export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (!isProtectedPath(request.nextUrl.pathname)) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const claims = token ? await verifyAuthToken(token, new Date()) : null;
  if (claims) return NextResponse.next();

  return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/focus/:path*",
    "/history/:path*",
    "/settings/:path*",
  ],
};
