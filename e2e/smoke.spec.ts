import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

// Smoke tests for #6. They wait only on Playwright's auto-retrying assertions
// (no sleeps), and they never read or write sessionStorage: presence and
// outcomes are server-decided (AGENTS.md §8).

const VALID_PASSWORD = "smoke-pass1"; // 11 characters, inside the 8–15 rule (PRD v2.9 §7)

test("a signed-out visitor opening Home lands on the login screen", async ({
  page,
}) => {
  // docs/agent-memory/auth.md A8.7: browser-level check of the route guard.
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome back" }),
  ).toBeVisible();
});

test("signing up creates an account and opens Home with the main nav", async ({
  page,
}) => {
  // A unique email per run, because emails are unique (AGENTS.md §8).
  const email = `smoke-${randomUUID()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(VALID_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: "History" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();
});
