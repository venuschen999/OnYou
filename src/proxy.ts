import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/server/authToken";
import { PROTECTED_ROUTES, ROUTES } from "@/lib/routes";

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
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

  return NextResponse.redirect(new URL(ROUTES.login, request.url));
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/focus/:path*",
    "/history/:path*",
    "/settings/:path*",
  ],
};
