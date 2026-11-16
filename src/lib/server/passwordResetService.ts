import { createHash, timingSafeEqual } from "node:crypto";
import {
  RESET_REQUESTS_PER_EMAIL,
  RESET_REQUESTS_PER_IP,
  isOverLimit,
  rateWindowStart,
} from "@/lib/domain/rateLimit";
import type {
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
} from "@/lib/validation/auth";
import { prisma } from "./db";
import { AppError } from "./errors";
import { hashPassword } from "./password";
import {
  buildResetLink,
  sendPasswordResetEmail,
  type ResetEmailEnv,
} from "./passwordResetEmail";
import {
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
} from "./resetToken";

const TOO_MANY_MESSAGE =
  "Too many reset requests. Wait a few minutes, then try again.";

// Atomic increment, so concurrent requests on several instances cannot both
// read the same count (auth.md A10).
async function countRequest(key: string, now: Date): Promise<number> {
  const windowStart = rateWindowStart(now);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitCounter" ("key", "windowStart", "count")
    VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "RateLimitCounter"."count" + 1
    RETURNING "count"`;
  return rows[0]?.count ?? 0;
}

// Unknown emails count too, so the limit cannot reveal which accounts exist.
async function enforceRateLimits(
  email: string,
  ip: string,
  now: Date,
): Promise<void> {
  const emailKey = `reset:email:${createHash("sha256").update(email).digest("hex")}`;
  const emailCount = await countRequest(emailKey, now);
  const ipCount = await countRequest(`reset:ip:${ip}`, now);
  if (
    isOverLimit(emailCount, RESET_REQUESTS_PER_EMAIL) ||
    isOverLimit(ipCount, RESET_REQUESTS_PER_IP)
  ) {
    throw new AppError("TOO_MANY_REQUESTS", TOO_MANY_MESSAGE);
  }
}

// A new request replaces the user's unused tokens (PRD v2.9 US2).
async function issueToken(userId: string, now: Date): Promise<string> {
  const token = generateResetToken();
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashResetToken(token),
        expiresAt: resetTokenExpiry(now),
      },
    }),
  ]);
  return token;
}

// auth.md A11: the caller returns the same response whatever happens here,
// apart from validation and rate limiting.
export async function requestPasswordReset(
  input: PasswordResetRequestInput,
  ip: string,
  now: Date,
  env: ResetEmailEnv,
): Promise<void> {
  await enforceRateLimits(input.email, ip, now);
  const user = await prisma.user.findFirst({ where: { email: input.email } });
  if (!user) return;

  const token = await issueToken(user.id, now);
  try {
    const link = buildResetLink(token, env);
    await sendPasswordResetEmail({ to: user.email, link }, env);
  } catch (error) {
    // Never log the token or link (AGENTS.md §12).
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`Password reset email was not sent: ${reason}`);
  }
}

const INVALID_LINK_MESSAGE = "This link no longer works.";

function invalidLink(): AppError {
  return new AppError("RESET_LINK_INVALID", INVALID_LINK_MESSAGE);
}

// AGENTS.md §12: compare in constant time, even though the row was found by
// this hash.
function hashesMatch(stored: string, computed: string): boolean {
  const left = Buffer.from(stored, "hex");
  const right = Buffer.from(computed, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

async function findUsableToken(
  token: string | undefined,
  now: Date,
): Promise<{ id: string; userId: string }> {
  if (!token) throw invalidLink();
  const tokenHash = hashResetToken(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!row || !hashesMatch(row.tokenHash, tokenHash)) throw invalidLink();
  if (row.usedAt || now.getTime() >= row.expiresAt.getTime()) {
    throw invalidLink();
  }
  return row;
}

// auth.md A15: password, tokenVersion, and the link change together. The
// conditional update means two tabs cannot both use one link. No
// FocusSession is touched (PRD v2.9 US2).
export async function confirmPasswordReset(
  input: PasswordResetConfirmInput,
  now: Date,
): Promise<void> {
  const row = await findUsableToken(input.token, now);
  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction(async (tx) => {
    const used = await tx.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    if (used.count !== 1) throw invalidLink();
    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await tx.passwordResetToken.deleteMany({
      where: { userId: row.userId, usedAt: null },
    });
  });
}
