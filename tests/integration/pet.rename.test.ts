import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PATCH as patchPet } from "@/app/api/pet/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { AUTH_COOKIE_NAME } from "@/lib/server/authToken";
import { resetTestDatabase, testPrisma } from "./testDb";

const TOO_LONG = "Mochi the Magnificent Apple Muncher"; // 35 characters (mockup)

function authTokenFrom(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  const match = new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`).exec(header);
  return match?.[1] ?? "";
}

async function signUp(email: string): Promise<{ id: string; token: string }> {
  const response = await signup(
    new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password: "sunflower22",
        timezone: "America/New_York",
      }),
    }),
  );
  expect(response.status).toBe(201);
  const body = (await response.json()) as { user: { id: string } };
  return { id: body.user.id, token: authTokenFrom(response) };
}

function rename(token: string | undefined, body: unknown): Promise<Response> {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("cookie", `${AUTH_COOKIE_NAME}=${token}`);
  return patchPet(
    new Request("http://localhost/api/pet", {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

async function storedName(userId: string): Promise<string> {
  const pet = await testPrisma.pet.findUniqueOrThrow({ where: { userId } });
  return pet.name;
}

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("PATCH /api/pet (US3, #10)", () => {
  it("requires authentication", async () => {
    const response = await rename(undefined, { name: "Biscuit" });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });
  });

  it("saves the trimmed name and returns the pet progress", async () => {
    const user = await signUp("owner@school.edu");

    const response = await rename(user.token, { name: "  Biscuit  " });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      name: "Biscuit",
      coins: 0,
      applesToday: 0,
      feedingMinutesTowardNextApple: 0,
      feedingState: "STARVING",
    });
    await expect(storedName(user.id)).resolves.toBe("Biscuit");
  });

  it.each(["", "   "])("restores Mochi for a blank name %j", async (name) => {
    const user = await signUp("owner@school.edu");
    await rename(user.token, { name: "Biscuit" });

    const response = await rename(user.token, { name });

    expect(response.status).toBe(200);
    await expect(storedName(user.id)).resolves.toBe("Mochi");
  });

  it("accepts exactly 30 characters", async () => {
    const user = await signUp("owner@school.edu");
    const name = "c".repeat(30);

    const response = await rename(user.token, { name });

    expect(response.status).toBe(200);
    await expect(storedName(user.id)).resolves.toBe(name);
  });

  it("rejects a name over 30 characters and keeps the old one", async () => {
    const user = await signUp("owner@school.edu");

    const response = await rename(user.token, { name: TOO_LONG });

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: { code: string; fields?: Record<string, string> };
    };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fields?.name).toBe(
      "Pet names can be up to 30 characters. This one has 35.",
    );
    await expect(storedName(user.id)).resolves.toBe("Mochi");
  });

  it("renames only the signed-in account's pet", async () => {
    const owner = await signUp("owner@school.edu");
    const other = await signUp("other@school.edu");

    await rename(owner.token, { name: "Biscuit" });

    await expect(storedName(owner.id)).resolves.toBe("Biscuit");
    await expect(storedName(other.id)).resolves.toBe("Mochi");
  });
});
