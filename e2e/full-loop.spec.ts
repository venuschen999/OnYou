import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { reachScheduledEnd } from "./scheduledEnd";

// Full-loop browser tests for #26. They wait on Playwright assertions and the
// server's stored timestamps. They do not sleep, and they never read or write
// sessionStorage: presence and outcomes are server-decided (AGENTS.md §8).
// Each test signs up its own account, so session rows cannot leak across tests.
//
// History list, empty state, and Load more stay out of this file until the
// History screen from #23 is on main. /history is still the placeholder.

const VALID_PASSWORD = "loop-pass-26"; // 12 characters, inside the 8–15 rule
const HEARTBEAT_WAIT_MS = 20_000;
const SECONDS_PER_MINUTE = 60;

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

function uniqueTask(label: string): string {
  return `E2E ${label} ${randomUUID()}`;
}

async function signUp(page: Page): Promise<void> {
  const email = `e2e-${randomUUID()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(VALID_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
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
