import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIE_NAME, signAuthToken } from "@/lib/server/authToken";
import { redirectIfSignedIn, requireUser } from "@/lib/server/session";
import { buildUser } from "../factories";
import { resetTestDatabase, testPrisma } from "./testDb";

// Server Components read the cookie through next/headers; tests supply it.
let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === AUTH_COOKIE_NAME && cookieValue !== undefined
        ? { name, value: cookieValue }
        : undefined,
  }),
}));

async function createUser(tokenVersion = 0) {
  return testPrisma.user.create({
    data: { ...buildUser(), tokenVersion, pet: { create: {} } },
  });
}

async function signInAs(userId: string, tokenVersion: number): Promise<void> {
  cookieValue = await signAuthToken({ userId, tokenVersion }, new Date());
}

async function redirectTargetOf(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    const digest = (error as { digest?: unknown }).digest;
    // Next encodes redirects as "NEXT_REDIRECT;<type>;<url>;<status>;".
    if (typeof digest === "string") return digest.split(";")[2];
    throw error;
  }
  return undefined;
}

beforeEach(async () => {
  await resetTestDatabase();
  cookieValue = undefined;
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("requireUser (docs/agent-memory/auth.md A9)", () => {
  it("returns the public user for a valid session", async () => {
    const user = await createUser();
    await signInAs(user.id, 0);

    await expect(requireUser()).resolves.toEqual({
      id: user.id,
      email: user.email,
      timezone: user.timezone,
    });
  });

  it("redirects to /login when there is no auth cookie", async () => {
    await expect(redirectTargetOf(requireUser)).resolves.toBe("/login");
  });

  it("redirects to /login when tokenVersion is stale (password reset)", async () => {
    const user = await createUser(1);
    await signInAs(user.id, 0);

    await expect(redirectTargetOf(requireUser)).resolves.toBe("/login");
  });
});

describe("redirectIfSignedIn (auth.md A8.3)", () => {
  it("sends a valid session to /dashboard", async () => {
    const user = await createUser();
    await signInAs(user.id, 0);

    await expect(redirectTargetOf(redirectIfSignedIn)).resolves.toBe(
      "/dashboard",
    );
  });

  it("does not redirect when there is no session", async () => {
    await expect(redirectTargetOf(redirectIfSignedIn)).resolves.toBeUndefined();
  });

  it("does not redirect a stale session, so login and Home cannot loop", async () => {
    const user = await createUser(2);
    await signInAs(user.id, 1);

    await expect(redirectTargetOf(redirectIfSignedIn)).resolves.toBeUndefined();
  });
});
