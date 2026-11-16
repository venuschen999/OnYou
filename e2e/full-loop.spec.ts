import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { historyEndNote } from "../src/lib/domain/historyDisplay";
import { HISTORY_PAGE_SIZE, seedOwnedHistoryPage } from "./historyData";
import { reachScheduledEnd } from "./scheduledEnd";

// Full-loop browser tests for #26. They wait on Playwright assertions and the
// server's stored timestamps. They do not sleep, and they never read or write
// sessionStorage: presence and outcomes are server-decided (AGENTS.md §8).
// Each test signs up its own account, so session rows cannot leak across tests.

const VALID_PASSWORD = "loop-pass-26"; // 12 characters, inside the 8–15 rule
const HEARTBEAT_WAIT_MS = 20_000;
const SECONDS_PER_MINUTE = 60;
const HISTORY_ZONE = "America/New_York";
const HISTORY_NOW = new Date("2026-11-15T20:00:00.000Z");

test("completing a focus session shows coins, feeding minutes, and one apple", async ({
  page,
}) => {
  const taskName = uniqueTask("complete");
  await signUp(page);
  await startFocus(page, taskName, 25);

  // 25 minutes from zero feeding is 25 coins, 25 feeding minutes, and 1 apple.
  await reachScheduledEnd(taskName);
  await page.goto("/focus");

  await expect(
    page.getByRole("heading", { level: 1, name: "Session complete" }),
  ).toBeVisible();
  await expect(page.getByText(`${taskName}, 25 minutes`)).toBeVisible();
  await expect(rewardAmount(page, "coins")).toHaveText("+25");
  await expect(rewardAmount(page, "feeding minutes")).toHaveText("+25");
  await expect(rewardAmount(page, "apple")).toHaveText("+1");
  await expect(page.getByText("Hungry", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Mochi is hungry" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start another session" }),
  ).toBeVisible();
});

test("giving up before the scheduled end shows zero rewards and the slap", async ({
  page,
}) => {
  const taskName = uniqueTask("give-up");
  await signUp(page);
  await startFocus(page, taskName, 15);

  await page.getByRole("button", { name: "Give up" }).click();
  const dialog = page.getByRole("dialog", { name: "Give up this session?" });
  await expect(dialog).toContainText("Mochi gets nothing from this session");
  await dialog.getByRole("button", { name: "Give up" }).click();

  await expectAbandoned(page, taskName, 15);
});

test("a second tab shares the countdown and can give the session up", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const taskName = uniqueTask("second-tab");
  await signUp(page);
  await startFocus(page, taskName, 15);

  const secondTab = await page.context().newPage();
  // The session bar is hidden on Focus. Home is where a second tab shows it.
  await secondTab.goto("/dashboard");
  await expect(secondTab.getByRole("status")).toContainText(
    `“${taskName}” is running.`,
  );
  await secondTab.getByRole("link", { name: "Return to session" }).click();
  await expect(secondTab).toHaveURL(/\/focus$/);
  await expect(
    secondTab.getByRole("heading", { level: 1, name: taskName }),
  ).toBeVisible();
  await expectSameSchedule(page, secondTab);

  await secondTab.getByRole("button", { name: "Give up" }).click();
  const dialog = secondTab.getByRole("dialog", {
    name: "Give up this session?",
  });
  await dialog.getByRole("button", { name: "Give up" }).click();

  await expectAbandoned(secondTab, taskName, 15);
  // The first tab learns the outcome from its next heartbeat, not a reload.
  await expect(
    page.getByRole("heading", { level: 1, name: "Session ended early" }),
  ).toBeVisible({ timeout: HEARTBEAT_WAIT_MS });
  await expectAbandoned(page, taskName, 15);
});

test.describe("history (US8, #26)", () => {
  test.use({ timezoneId: HISTORY_ZONE });

  test("an empty history shows No sessions yet and Start focusing", async ({
    page,
  }) => {
    await signUp(page);
    await page.goto("/history");

    await expect(
      page.getByRole("heading", { name: "No sessions yet" }),
    ).toBeVisible();
    const start = page.getByRole("link", { name: "Start focusing" });
    await expect(start).toHaveAttribute("href", "/focus");
    await start.click();
    await expect(page).toHaveURL(/\/focus$/);
    await expect(
      page.getByRole("heading", { name: "What are you working on?" }),
    ).toBeVisible();
  });

  test("history lists a completed session and a given-up session newest first", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const completedTask = uniqueTask("history-complete");
    const abandonedTask = uniqueTask("history-give-up");
    await signUp(page);
    await startFocus(page, completedTask, 25);
    await reachScheduledEnd(completedTask);
    await page.goto("/focus");
    await expect(
      page.getByRole("heading", { level: 1, name: "Session complete" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start another session" }).click();
    await startFocus(page, abandonedTask, 15);
    await page.getByRole("button", { name: "Give up" }).click();
    await page
      .getByRole("dialog", { name: "Give up this session?" })
      .getByRole("button", { name: "Give up" })
      .click();
    await expectAbandoned(page, abandonedTask, 15);

    await page.goto("/history");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText(abandonedTask);
    await expect(rows.nth(0)).toContainText("Abandoned");
    await expect(rows.nth(0)).toContainText("No rewards");
    await expect(rows.nth(1)).toContainText(completedTask);
    await expect(rows.nth(1)).toContainText("Completed");
    await expect(rows.nth(1)).toContainText("+25 coins");
    await expect(rows.nth(1)).toContainText("+25 feeding min");
  });

  test("Load more fetches the next history page then the end-of-list note", async ({
    page,
  }) => {
    const email = await signUp(page);
    const seeded = await seedOwnedHistoryPage(
      email,
      `History ${randomUUID()}`,
      HISTORY_NOW,
    );

    await page.goto("/history");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(HISTORY_PAGE_SIZE);
    await expect(page.getByText(seeded.newestTaskName)).toBeVisible();
    await expect(page.getByText(seeded.oldestTaskName)).toHaveCount(0);
    await page.getByRole("button", { name: "Load more" }).click();

    await expect(rows).toHaveCount(HISTORY_PAGE_SIZE + 1);
    await expect(page.getByText(seeded.oldestTaskName)).toBeVisible();
    await expect(
      page.getByText(historyEndNote(seeded.oldestStartedAt, HISTORY_ZONE)),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Load more" }),
    ).toHaveCount(0);
  });
});

function uniqueTask(label: string): string {
  return `E2E ${label} ${randomUUID()}`;
}

async function signUp(page: Page): Promise<string> {
  const email = `e2e-${randomUUID()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(VALID_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
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
  // The radio is visually hidden (sr-only). The visible choice is its label.
  await page
    .locator("label")
    .filter({ has: page.getByRole("radio", { name: `${minutes} minutes` }) })
    .click();
  await page.getByRole("button", { name: `Start ${minutes} minutes` }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: taskName }),
  ).toBeVisible();
}

function rewardAmount(page: Page, label: string): Locator {
  return page
    .locator("span")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("xpath=..")
    .locator("b");
}

async function expectAbandoned(
  page: Page,
  taskName: string,
  minutes: number,
): Promise<void> {
  await expect(
    page.getByRole("heading", { level: 1, name: "Session ended early" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      `${taskName}, ${minutes} minutes. The session was given up, or no OnYou tab was connected for 30 seconds.`,
    ),
  ).toBeVisible();
  await expect(rewardAmount(page, "coins")).toHaveText("0");
  await expect(rewardAmount(page, "feeding minutes")).toHaveText("0");
  await expect(rewardAmount(page, "apples")).toHaveText("0");
  await expect(page.getByText("No rewards this time.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start another session" }),
  ).toHaveCount(0);
  const slap = page.locator(".pet-slap");
  await expect(
    slap.getByRole("img", { name: "Mochi got slapped" }),
  ).toBeVisible();
  const durationMs = await slap.evaluate((element) => {
    const value = getComputedStyle(element).animationDuration;
    if (value.endsWith("ms")) return Number.parseFloat(value);
    if (value.endsWith("s")) return Number.parseFloat(value) * 1000;
    return Number.NaN;
  });
  expect(durationMs).toBeGreaterThan(0);
  expect(durationMs).toBeLessThan(1000);
}

async function expectSameSchedule(first: Page, second: Page): Promise<void> {
  const firstSchedule = first.locator("p", { hasText: "minutes, ends at" });
  const secondSchedule = second.locator("p", { hasText: "minutes, ends at" });
  await expect(secondSchedule).toHaveText(
    (await firstSchedule.textContent()) ?? "",
  );
  const firstSeconds = secondsRemaining(
    await first.locator(".countdown-digits").getAttribute("aria-label"),
  );
  const secondSeconds = secondsRemaining(
    await second.locator(".countdown-digits").getAttribute("aria-label"),
  );
  expect(Math.abs(firstSeconds - secondSeconds)).toBeLessThanOrEqual(1);
  expect(firstSeconds).toBeGreaterThan(14 * SECONDS_PER_MINUTE);
}

function secondsRemaining(label: string | null): number {
  if (label === "0 minutes remaining") return 0;
  const match = /^(\d+) minutes (\d+) seconds remaining$/.exec(label ?? "");
  if (!match?.[1] || !match[2]) {
    throw new Error(`Unexpected countdown announcement: ${label}`);
  }
  return Number(match[1]) * SECONDS_PER_MINUTE + Number(match[2]);
}
