import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// #30: the mockup's desktop (1040px) and phone (390px) widths. Checks layout
// and accessibility rules a browser can measure (AGENTS.md §7, §13). Waits
// only on Playwright's auto-retrying assertions.
const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1040, height: 800 },
] as const;
const PHONE_MIN_INPUT_PX = 16;
const PASSWORD = "a11y-pass-30"; // 12 characters

async function signUp(page: Page): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`a11y-${randomUUID()}@example.com`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function startSession(page: Page, taskName: string): Promise<void> {
  await page.goto("/focus");
  await page.getByLabel("Task").fill(taskName);
  await page
    .locator("label")
    .filter({ has: page.getByRole("radio", { name: "15 minutes" }) })
    .click();
  await page.getByRole("button", { name: "Start 15 minutes" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: taskName }),
  ).toBeVisible();
}

// One h1, a main landmark, and no sideways scrolling.
async function expectPageBasics(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectPhoneInputs(page: Page): Promise<void> {
  const sizes = await page
    .locator("input:not([type=radio]):not([type=hidden])")
    .evaluateAll((inputs) =>
      inputs.map((input) => parseFloat(getComputedStyle(input).fontSize)),
    );
  for (const size of sizes) {
    expect(size).toBeGreaterThanOrEqual(PHONE_MIN_INPUT_PX);
  }
}

for (const viewport of WIDTHS) {
  test.describe(`${viewport.name} (${viewport.width}px)`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
    });

    test("auth screens fit, have one h1, and phone inputs use 16px text", async ({
      page,
    }) => {
      for (const route of ["/login", "/signup", "/forgot-password"]) {
        await page.goto(route);
        await expectPageBasics(page);
        if (viewport.name === "phone") await expectPhoneInputs(page);
      }
    });

    test("signed-in screens fit, keep the main nav, and have one h1", async ({
      page,
    }) => {
      await signUp(page);
      for (const route of ["/dashboard", "/focus", "/history", "/settings"]) {
        await page.goto(route);
        const nav = page.getByRole("navigation", { name: "Main" });
        for (const label of ["Home", "History", "Settings"]) {
          await expect(nav.getByRole("link", { name: label })).toBeVisible();
        }
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectPageBasics(page);
        if (viewport.name === "phone") await expectPhoneInputs(page);
      }
    });

    test("the active session bar fits on other screens", async ({ page }) => {
      await signUp(page);
      await startSession(page, `a11y bar ${randomUUID().slice(0, 6)}`);

      await page.goto("/history");

      await expect(
        page.getByRole("link", { name: "Return to session" }),
      ).toBeVisible();
      await expectPageBasics(page);
    });

    test("the Give up dialog is a bottom sheet on phones and centered on desktop", async ({
      page,
    }) => {
      await signUp(page);
      await startSession(page, `a11y dialog ${randomUUID().slice(0, 6)}`);

      await page.getByRole("button", { name: "Give up" }).click();
      const dialog = page.getByRole("dialog", {
        name: "Give up this session?",
      });
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      const bottom = (box?.y ?? 0) + (box?.height ?? 0);
      if (viewport.name === "phone") {
        expect(Math.abs(bottom - viewport.height)).toBeLessThanOrEqual(1);
        expect(
          Math.abs((box?.width ?? 0) - viewport.width),
        ).toBeLessThanOrEqual(1);
      } else {
        expect(bottom).toBeLessThan(viewport.height - 40);
      }
    });
  });
}

test("keyboard focus shows a visible ring", async ({ page }) => {
  await page.goto("/login");

  await page.keyboard.press("Tab");

  const ring = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(ring).not.toBeNull();
  expect(ring?.style).not.toBe("none");
  expect(ring?.width ?? 0).toBeGreaterThanOrEqual(2);
});
