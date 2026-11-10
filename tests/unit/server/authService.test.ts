import { Prisma, type User } from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyAuthToken } from "@/lib/server/authToken";
import { AppError } from "@/lib/server/errors";
import {
  BCRYPT_COST,
  hashPassword,
  verifyPassword,
} from "@/lib/server/password";
import { logIn, signUp, type AuthResult } from "@/lib/server/authService";
import type { LoginInput, SignupInput } from "@/lib/validation/auth";

const TEST_SECRET = "unit-test-secret-that-is-at-least-32-chars";
const PASSWORD = "sunflower22";
const NOW = new Date("2026-11-03T15:00:00.000Z");
const INVALID_CREDENTIALS_MESSAGE =
  "Email or password is incorrect. Check both and try again.";

const SIGNUP: SignupInput = {
  email: "jo@school.edu",
  password: PASSWORD,
  timezone: "America/New_York",
};

const { prisma, tx } = vi.hoisted(() => {
  const tx = {
    user: { create: vi.fn() },
    pet: { create: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(),
    user: { findFirst: vi.fn() },
  };
  return { prisma, tx };
});

vi.mock("@/lib/server/db", () => ({ prisma }));

vi.mock("@/lib/server/password", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/password")>(
    "@/lib/server/password",
  );
  return {
    ...actual,
    hashPassword: vi.fn(actual.hashPassword),
    verifyPassword: vi.fn(actual.verifyPassword),
  };
});

let passwordHash = "";

function storedUser(overrides: Partial<User> = {}): User {
  return {
    id: "user_123",
    email: SIGNUP.email,
    passwordHash,
    timezone: SIGNUP.timezone,
    tokenVersion: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function loginInput(email: string, password = PASSWORD): LoginInput {
  return { email, password };
}

async function latestHash(): Promise<string> {
  const result = vi.mocked(hashPassword).mock.results.at(-1);
  if (result?.type !== "return") throw new Error("hashPassword was not called");
  return result.value;
}

function expectInvalidCredentials(error: unknown): void {
  expect(error).toBeInstanceOf(AppError);
  if (!(error instanceof AppError)) return;
  expect(error.code).toBe("INVALID_CREDENTIALS");
  expect(error.status).toBe(401);
  expect(error.message).toBe(INVALID_CREDENTIALS_MESSAGE);
  expect(error.fields).toBeUndefined();
}

async function rejected(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

beforeAll(async () => {
  vi.stubEnv("JWT_SECRET", TEST_SECRET);
  passwordHash = await hashPassword(PASSWORD);
});

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", TEST_SECRET);
  prisma.$transaction.mockReset();
  prisma.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback !== "function") {
      throw new Error("expected a transaction callback");
    }
    return callback(tx);
  });
  tx.user.create.mockReset();
  tx.pet.create.mockReset();
  prisma.user.findFirst.mockReset();
  vi.mocked(hashPassword).mockClear();
  vi.mocked(verifyPassword).mockClear();
});

describe("signUp (US1, US3)", () => {
  it("stores a bcrypt hash, creates Mochi in the same transaction, and returns a token", async () => {
    const created = storedUser({ tokenVersion: 5, passwordHash: "ignored" });
    tx.user.create.mockResolvedValue(created);
    tx.pet.create.mockResolvedValue({ id: "pet_1" });

    const result = await signUp(SIGNUP, NOW);

    const hashed = await latestHash();
    expect(hashed.startsWith(`$2b$${BCRYPT_COST}$`)).toBe(true);
    expect(hashed).not.toContain(PASSWORD);
    expect(hashPassword).toHaveBeenCalledWith(PASSWORD);
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        email: SIGNUP.email,
        passwordHash: hashed,
        timezone: SIGNUP.timezone,
      },
    });
    expect(tx.pet.create).toHaveBeenCalledWith({
      data: { userId: created.id },
    });
    expect(tx.user.create.mock.invocationCallOrder[0]).toBeLessThan(
      tx.pet.create.mock.invocationCallOrder[0] ?? 0,
    );
    expect(result.user).toEqual({
      id: created.id,
      email: SIGNUP.email,
      timezone: SIGNUP.timezone,
    });
    expect(result).not.toHaveProperty("passwordHash");
    await expect(verifyAuthToken(result.token, NOW)).resolves.toEqual({
      userId: created.id,
      tokenVersion: 5,
    });
  });

  it("does not issue a token when creating Mochi fails", async () => {
    tx.user.create.mockResolvedValue(storedUser());
    tx.pet.create.mockRejectedValue(new Error("pet insert failed"));

    await expect(signUp(SIGNUP, NOW)).rejects.toThrow("pet insert failed");
  });

  it("maps a unique email violation to EMAIL_IN_USE without leaking the driver error", async () => {
    const unique = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on User_email_key",
      { code: "P2002", clientVersion: "6.19.3" },
    );
    prisma.$transaction.mockRejectedValue(unique);

    const error = await rejected(signUp(SIGNUP, NOW));

    expect(error).toBeInstanceOf(AppError);
    if (!(error instanceof AppError)) return;
    expect(error.code).toBe("EMAIL_IN_USE");
    expect(error.status).toBe(409);
    expect(error.message).toBe("An account with this email already exists.");
    expect(error.fields).toEqual({
      email: "An account with this email already exists.",
    });
    expect(error.message).not.toContain("User_email_key");
  });

  it("rethrows a different Prisma error", async () => {
    const foreignKey = new Prisma.PrismaClientKnownRequestError(
      "Foreign key constraint failed",
      { code: "P2003", clientVersion: "6.19.3" },
    );
    prisma.$transaction.mockRejectedValue(foreignKey);

    await expect(signUp(SIGNUP, NOW)).rejects.toBe(foreignKey);
  });

  it("does not treat a lookalike unique-violation object as EMAIL_IN_USE", async () => {
    const lookalike = { code: "P2002", message: "Unique constraint failed" };
    prisma.$transaction.mockRejectedValue(lookalike);

    await expect(signUp(SIGNUP, NOW)).rejects.toBe(lookalike);
  });
});

describe("logIn (US1, auth.md A5)", () => {
  it("returns the public user and a token carrying the stored tokenVersion", async () => {
    const user = storedUser({ tokenVersion: 4 });
    prisma.user.findFirst.mockResolvedValue(user);

    const result: AuthResult = await logIn(loginInput(user.email), NOW);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: user.email },
    });
    expect(hashPassword).not.toHaveBeenCalled();
    expect(verifyPassword).toHaveBeenCalledWith(PASSWORD, user.passwordHash);
    expect(result.user).toEqual({
      id: user.id,
      email: user.email,
      timezone: user.timezone,
    });
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.user).not.toHaveProperty("tokenVersion");
    await expect(verifyAuthToken(result.token, NOW)).resolves.toEqual({
      userId: user.id,
      tokenVersion: 4,
    });
  });

  it("uses the same error for a wrong password and an unknown email", async () => {
    const user = storedUser();
    prisma.user.findFirst
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);

    const wrongPassword = await rejected(
      logIn(loginInput(user.email, "wrongpass1"), NOW),
    );
    expect(verifyPassword).toHaveBeenCalledWith(
      "wrongpass1",
      user.passwordHash,
    );
    const unknownEmail = await rejected(
      logIn(loginInput("nobody@school.edu", "wrongpass1"), NOW),
    );

    expectInvalidCredentials(wrongPassword);
    expectInvalidCredentials(unknownEmail);
  });

  it("compares an unknown email with one cached dummy hash", async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const first = logIn(loginInput("nobody@school.edu"), NOW);
    await expect(first).rejects.toBeInstanceOf(AppError);
    const hashesAfterFirst = vi.mocked(hashPassword).mock.calls.length;

    const second = logIn(loginInput("other@school.edu"), NOW);
    await expect(second).rejects.toBeInstanceOf(AppError);

    expect(vi.mocked(hashPassword).mock.calls.length).toBe(hashesAfterFirst);
    expect(hashPassword).not.toHaveBeenCalledWith(PASSWORD);
    const compared = vi
      .mocked(verifyPassword)
      .mock.calls.map((call) => call[1]);
    expect(compared).toHaveLength(2);
    expect(compared[0]).toBe(compared[1]);
    expect(compared[0]).toEqual(expect.stringMatching(/^\$2b\$/));
  });

  it("does not accept the dummy comparison password as an unknown user", async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const error = await rejected(
      logIn(loginInput("nobody@school.edu", "timing-equalizer"), NOW),
    );

    expectInvalidCredentials(error);
  });
});
