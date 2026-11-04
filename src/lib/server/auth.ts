import { AUTH_COOKIE_NAME, verifyAuthToken } from "./authToken";
import { toPublicUser, type PublicUser } from "./authService";
import { prisma } from "./db";
import { AppError } from "./errors";

const HTTP_UNAUTHORIZED = 401;

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  const prefix = `${name}=`;
  const pair = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return pair?.slice(prefix.length);
}

function unauthenticated(): AppError {
  return new AppError(
    "UNAUTHENTICATED",
    HTTP_UNAUTHORIZED,
    "Log in to continue.",
  );
}

// PRD v2.9 §10: verify the JWT and its tokenVersion on every authenticated
// request, so a password reset signs out every device (auth.md A7).
export async function getAuthenticatedUser(
  request: Request,
  now: Date,
): Promise<PublicUser> {
  const token = readCookie(request, AUTH_COOKIE_NAME);
  if (!token) throw unauthenticated();

  const claims = await verifyAuthToken(token, now);
  if (!claims) throw unauthenticated();

  const user = await prisma.user.findUnique({ where: { id: claims.userId } });
  if (!user || user.tokenVersion !== claims.tokenVersion) {
    throw unauthenticated();
  }
  return toPublicUser(user);
}
