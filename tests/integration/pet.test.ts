import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { POST as signup } from "@/app/api/auth/signup/route";
import { GET as getPet } from "@/app/api/pet/route";
import { AUTH_COOKIE_NAME } from "@/lib/server/authToken";
import { resetTestDatabase, testPrisma } from "./testDb";

const PASSWORD = "sunflower22";
const NEW_YORK = "America/New_York";
const TOKYO = "Asia/Tokyo";
// 23:30 on Nov 15 in New York (EST, UTC-5); 13:30 on Nov 16 in Tokyo.
const NOW = new Date("2026-11-16T04:30:00.000Z");
const PET_KEYS = [
  "applesToday",
  "coins",
  "feedingMinutesTowardNextApple",
  "feedingState",
  "name",
];

function signupRequest(email: string, timezone: string): Request {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, timezone }),
  });
}

function authTokenFrom(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  const match = new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`).exec(header);
  return match?.[1] ?? "";
}

async function signUp(
  email: string,
  timezone = NEW_YORK,
): Promise<{ id: string; token: string }> {
  const response = await signup(signupRequest(email, timezone));
  expect(response.status).toBe(201);
  const body = (await response.json()) as { user: { id: string } };
  return { id: body.user.id, token: authTokenFrom(response) };
}

function requestPet(token?: string): Promise<Response> {
  const headers = new Headers();
  if (token) headers.set("cookie", `${AUTH_COOKIE_NAME}=${token}`);
  return getPet(new Request("http://localhost/api/pet", { headers }));
}

async function seed(
  userId: string,
  coins: number,
  feeding: { day: string; feedingMinutes: number; apples: number } | null,
): Promise<void> {
  const pet = await testPrisma.pet.update({
    where: { userId },
    data: { coins },
  });
  if (!feeding) return;
  await testPrisma.dailyFeeding.create({
    data: {
      petId: pet.id,
      feedingDay: new Date(`${feeding.day}T00:00:00.000Z`),
      feedingMinutes: feeding.feedingMinutes,
      apples: feeding.apples,
    },
  });
}

beforeEach(async () => {
  await resetTestDatabase();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("GET /api/pet (US4, #19)", () => {
  it("requires authentication", async () => {
    const response = await requestPet();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });
  });

  it("returns Mochi as Starving with no coins for a new account", async () => {
    const user = await signUp("new@school.edu");

    const response = await requestPet(user.token);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      name: "Mochi",
      coins: 0,
      applesToday: 0,
      feedingMinutesTowardNextApple: 0,
      feedingState: "STARVING",
    });
  });

  it("returns today's apples, leftover minutes, state, and coins, and nothing else", async () => {
    const user = await signUp("owner@school.edu");
    await seed(user.id, 385, {
      day: "2026-11-15",
      feedingMinutes: 35,
      apples: 1,
    });

    const response = await requestPet(user.token);

    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(PET_KEYS);
    expect(body).toEqual({
      name: "Mochi",
      coins: 385,
      applesToday: 1,
      feedingMinutesTowardNextApple: 10,
      feedingState: "HUNGRY",
    });
  });

  it("resets apples and feeding minutes on a new day but keeps coins", async () => {
    const user = await signUp("owner@school.edu");
    await seed(user.id, 460, {
      day: "2026-11-14",
      feedingMinutes: 50,
      apples: 2,
    });

    const response = await requestPet(user.token);

    await expect(response.json()).resolves.toMatchObject({
      coins: 460,
      applesToday: 0,
      feedingMinutesTowardNextApple: 0,
      feedingState: "STARVING",
    });
  });

  it("uses each account's saved timezone to decide which day is today", async () => {
    const newYork = await signUp("ny@school.edu", NEW_YORK);
    const tokyo = await signUp("tokyo@school.edu", TOKYO);
    const nov15 = { day: "2026-11-15", feedingMinutes: 50, apples: 2 };
    await seed(newYork.id, 100, nov15);
    await seed(tokyo.id, 100, nov15);

    const newYorkBody = await (await requestPet(newYork.token)).json();
    const tokyoBody = await (await requestPet(tokyo.token)).json();

    // Still Nov 15 in New York, already Nov 16 in Tokyo.
    expect(newYorkBody).toMatchObject({
      applesToday: 2,
      feedingState: "FULL",
    });
    expect(tokyoBody).toMatchObject({
      applesToday: 0,
      feedingState: "STARVING",
    });
  });

  it("shows each account only its own pet", async () => {
    const first = await signUp("first@school.edu");
    const second = await signUp("second@school.edu");
    await seed(first.id, 75, {
      day: "2026-11-15",
      feedingMinutes: 25,
      apples: 1,
    });

    const firstBody = await (await requestPet(first.token)).json();
    const secondBody = await (await requestPet(second.token)).json();

    expect(firstBody).toMatchObject({ coins: 75, applesToday: 1 });
    expect(secondBody).toMatchObject({ coins: 0, applesToday: 0 });
  });
});
