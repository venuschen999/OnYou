import { Prisma, type User } from "@prisma/client";
import type { LoginInput, SignupInput } from "@/lib/validation/auth";
import { signAuthToken } from "./authToken";
import { prisma } from "./db";
import { AppError } from "./errors";
import { hashPassword, verifyPassword } from "./password";

export type PublicUser = { id: string; email: string; timezone: string };
export type AuthResult = { user: PublicUser; token: string };

const UNIQUE_VIOLATION = "P2002";

const EMAIL_IN_USE_MESSAGE = "An account with this email already exists.";
// PRD v2.9 §9: one message that does not reveal which field was wrong.
const INVALID_CREDENTIALS_MESSAGE =
  "Email or password is incorrect. Check both and try again.";

let dummyHash: Promise<string> | undefined;

// Compared against when the email is unknown, so response time does not
// reveal whether an account exists (docs/agent-memory/auth.md A5).
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("timing-equalizer");
  return dummyHash;
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, timezone: user.timezone };
}

async function issueAuthResult(user: User, now: Date): Promise<AuthResult> {
  const token = await signAuthToken(
    { userId: user.id, tokenVersion: user.tokenVersion },
    now,
  );
  return { user: toPublicUser(user), token };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_VIOLATION
  );
}

async function createUserWithPet(
  input: SignupInput,
  passwordHash: string,
): Promise<User> {
  try {
    // US3, docs/agent-memory/pet.md P1: no account exists without Mochi.
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, passwordHash, timezone: input.timezone },
      });
      // The Pet.name column defaults to "Mochi" (prisma/schema.prisma).
      await tx.pet.create({ data: { userId: user.id } });
      return user;
    });
  } catch (error) {
    // The LOWER(email) unique index also catches concurrent signups.
    if (!isUniqueViolation(error)) throw error;
    throw new AppError("EMAIL_IN_USE", EMAIL_IN_USE_MESSAGE, {
      email: EMAIL_IN_USE_MESSAGE,
    });
  }
}

export async function signUp(
  input: SignupInput,
  now: Date,
): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);
  const user = await createUserWithPet(input, passwordHash);
  return issueAuthResult(user, now);
}

export async function logIn(input: LoginInput, now: Date): Promise<AuthResult> {
  // Emails are stored lowercased (auth.md A4), so equality is case-insensitive.
  const user = await prisma.user.findFirst({ where: { email: input.email } });
  const passwordHash = user?.passwordHash ?? (await getDummyHash());
  const isPasswordValid = await verifyPassword(input.password, passwordHash);
  if (!user || !isPasswordValid) {
    throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
  }
  return issueAuthResult(user, now);
}
