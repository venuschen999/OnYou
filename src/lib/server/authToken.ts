import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE_NAME = "onyou_auth";

const SECONDS_PER_DAY = 24 * 60 * 60;
const AUTH_TOKEN_TTL_DAYS = 7;
// docs/agent-memory/auth.md A1: fixed 7-day lifetime, no sliding renewal.
export const AUTH_TOKEN_TTL_SECONDS = AUTH_TOKEN_TTL_DAYS * SECONDS_PER_DAY;

const JWT_ALGORITHM = "HS256";
const MIN_SECRET_LENGTH = 32;
const MS_PER_SECOND = 1000;

export type AuthTokenClaims = { userId: string; tokenVersion: number };

export type AuthCookie = {
  name: string;
  value: string;
  httpOnly: true;
  secure: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  return new TextEncoder().encode(secret);
}

function toEpochSeconds(date: Date): number {
  return Math.floor(date.getTime() / MS_PER_SECOND);
}

export async function signAuthToken(
  claims: AuthTokenClaims,
  now: Date,
): Promise<string> {
  const issuedAt = toEpochSeconds(now);
  // `tv` carries tokenVersion; password reset increments it (PRD v2.9 §10).
  return new SignJWT({ tv: claims.tokenVersion })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(claims.userId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + AUTH_TOKEN_TTL_SECONDS)
    .sign(getSecretKey());
}

export async function verifyAuthToken(
  token: string,
  now: Date,
): Promise<AuthTokenClaims | null> {
  const key = getSecretKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [JWT_ALGORITHM],
      currentDate: now,
    });
    if (typeof payload.sub !== "string" || typeof payload.tv !== "number") {
      return null;
    }
    return { userId: payload.sub, tokenVersion: payload.tv };
  } catch {
    // Bad signature, malformed, or expired: all mean "not signed in".
    return null;
  }
}

export function buildAuthCookie(token: string): AuthCookie {
  // AGENTS.md §12: unreadable by client JavaScript, HTTPS only, sent on top-level navigation.
  return {
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_TOKEN_TTL_SECONDS,
  };
}
