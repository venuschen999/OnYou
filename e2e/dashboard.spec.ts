import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { getFeedingDay } from "../src/lib/domain/feedingDay";
import { reachScheduledEnd } from "./scheduledEnd";

// Home reads GET /api/pet (#20). These tests use a real account and the
// stored feeding rows. They do not sleep, and they do not read sessionStorage.

const VALID_PASSWORD = "dash-pass-20";
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1040, height: 900 };

test("a new account shows Mochi starving, with no coins or apples", async ({
  page,
}) => {
  await signUp(page);

  await expectStarving(page, "0");
  await expect(
    page.getByRole("heading", { name: "Mochi hasn’t eaten today." }),
  ).toBeVisible();
  await expect(page.getByText("0 of 25 min to the next apple")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start focusing" }),
  ).toBeVisible();
});

test("completed sessions update coins, apples, and the pet state", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signUp(page);

  await finishSession(page, uniqueTask("first-apple"), 25);
  await page.goto("/dashboard");
  await expect(page.getByText("Hungry", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Mochi is hungry" }),
  ).toBeVisible();
  await expect(page.getByLabel("Coins")).toContainText("25");
  await expect(page.getByRole("img", { name: "1 of 2 apples" })).toBeVisible();
  await expect(page.getByText("0 of 25 min to the next apple")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "One apple down, one to go." }),
  ).toBeVisible();

  await finishSession(page, uniqueTask("second-apple"), 25);
  await page.goto("/dashboard");
  await expect(page.getByText("Full", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Mochi is full" })).toBeVisible();
  await expect(page.getByLabel("Coins")).toContainText("50");
  await expect(page.getByRole("img", { name: "2 of 2 apples" })).toBeVisible();
  await expect(page.getByText("Full for today", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mochi is full for today." }),
  ).toBeVisible();
});

test("an active session disables Start focusing", async ({ page }) => {
  const taskName = uniqueTask("active");
  await signUp(page);
  await startFocus(page, taskName, 15);
  await page.goto("/dashboard");

  await expect(page.getByRole("status")).toContainText(
    `“${taskName}” is running.`,
  );
  await expect(
    page.getByRole("button", { name: "Start focusing" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "One session at a time. Finish or give up the current one first.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start focusing" })).toHaveCount(
    0,
  );
});

test("a failed pet load shows Couldn’t load and Try again", async ({
  page,
}) => {
  await signUp(page);
  await page.route("**/api/pet", (route) => route.abort());
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Couldn’t load your dashboard" }),
  ).toBeVisible();
  await page.unroute("**/api/pet");
  await page.getByRole("button", { name: "Try again" }).click();

  await expectStarving(page, "0");
});

test("yesterday’s apples reset on Home while coins remain", async ({
  page,
}) => {
  const email = await signUp(page);
  await seedYesterdayFull(email, 460);
  await page.reload();

  await expectStarving(page, "460");
  await expect(page.getByText("Full", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Full for today")).toHaveCount(0);
});

test("the pet, coins, and Start focusing fit a phone and a desktop window", async ({
  page,
}) => {
  await signUp(page);

  await page.setViewportSize(PHONE);
  await expect(page.getByText("Starving", { exact: true })).toBeVisible();
  const phoneArt = await page.locator("[data-pet-art]").boundingBox();
  const phoneStart = await page
    .getByRole("link", { name: "Start focusing" })
    .boundingBox();
  expect(phoneArt?.width ?? 0).toBeLessThan(180);
  expect(phoneStart?.width ?? 0).toBeGreaterThan(300);

  await page.setViewportSize(DESKTOP);
  await expect(page.getByLabel("Coins")).toBeVisible();
  const desktopArt = await page.locator("[data-pet-art]").boundingBox();
  const desktopStart = await page
    .getByRole("link", { name: "Start focusing" })
    .boundingBox();
  expect(desktopArt?.width ?? 0).toBeGreaterThan(190);
  expect(desktopStart?.width ?? 0).toBeLessThan(280);
});

function uniqueTask(label: string): string {
  return `Dashboard ${label} ${randomUUID()}`;
}

async function signUp(page: Page): Promise<string> {
  const email = `dash-${randomUUID()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(VALID_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}

async function expectStarving(page: Page, coins: string): Promise<void> {
  await expect(
    page.getByRole("img", { name: "Mochi is starving" }),
  ).toBeVisible();
  await expect(page.getByText("Mochi", { exact: true })).toBeVisible();
  await expect(page.getByText("Starving", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Coins")).toContainText(coins);
  await expect(page.getByRole("img", { name: "0 of 2 apples" })).toBeVisible();
}

async function startFocus(
  page: Page,
  taskName: string,
  minutes: 15 | 25,
): Promise<void> {
  await page.goto("/focus");
  await expect(
    page.getByRole("heading", { name: "What are you working on?" }),
  ).toBeVisible();
  await page.getByLabel("Task").fill(taskName);
  await page
    .locator("label")
    .filter({ has: page.getByRole("radio", { name: `${minutes} minutes` }) })
    .click();
  await page.getByRole("button", { name: `Start ${minutes} minutes` }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: taskName }),
  ).toBeVisible();
}

async function finishSession(
  page: Page,
  taskName: string,
  minutes: 25,
): Promise<void> {
  await startFocus(page, taskName, minutes);
  await reachScheduledEnd(taskName);
  await page.goto("/focus");
  await expect(
    page.getByRole("heading", { level: 1, name: "Session complete" }),
  ).toBeVisible();
}

function previousCalendarDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) {
    throw new Error(`Expected a feeding day, received ${day}`);
  }
  const utc = new Date(Date.UTC(year, month - 1, date));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}

async function seedYesterdayFull(email: string, coins: number): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set before an e2e test seeds yesterday's feeding",
    );
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  try {
    const user = await prisma.user.findFirst({
      where: { email },
      include: { pet: true },
    });
    if (!user?.pet) {
      throw new Error(`Expected a pet for ${email}`);
    }
    const yesterday = previousCalendarDay(
      getFeedingDay(new Date(), user.timezone),
    );
    await prisma.pet.update({
      where: { id: user.pet.id },
      data: { coins },
    });
    await prisma.dailyFeeding.create({
      data: {
        petId: user.pet.id,
        feedingDay: new Date(`${yesterday}T00:00:00.000Z`),
        feedingMinutes: 50,
        apples: 2,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
