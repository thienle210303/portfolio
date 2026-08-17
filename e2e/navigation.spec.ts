import { test, expect, type Page } from "@playwright/test";
import { navItems } from "../src/content/portfolio";

// Matches SiteNav.tsx's own `lg:` breakpoint (1024px) — below it the
// desktop <nav aria-label="Primary"> is CSS-hidden and the hamburger drives
// a separate <nav aria-label="Mobile"> instead.
const DESKTOP_MIN_WIDTH = 1024;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

test.beforeEach(async ({ page }) => {
  // Playwright retries clicks until an element is actionable, but it dispatches
  // key presses immediately and reads the DOM immediately. Both race React's
  // hydration on a page this long, which is how a suite that passed became
  // intermittently red once sections were reordered. Waiting for the network to
  // settle is the closest available "the islands are live now" signal.
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});

test.describe("desktop primary nav", () => {
  test("every nav link scrolls to its section and updates the active indicator", async ({ page }) => {
    test.skip(viewportWidth(page) < DESKTOP_MIN_WIDTH, "desktop-only nav");

    const nav = page.getByRole("navigation", { name: "Primary" });
    for (const item of navItems) {
      // exact: true — "Work" is otherwise a substring match of "AI Workflow Lab".
      await nav.getByRole("link", { name: item.label, exact: true }).click();
      await expect(page.locator(`#${item.sectionId}`)).toBeInViewport();
      await expect(nav.getByRole("link", { name: item.label, exact: true })).toHaveAttribute(
        "aria-current",
        "true",
      );
    }
  });
});

test.describe("mobile nav", () => {
  test.beforeEach(({ page }) => {
    test.skip(viewportWidth(page) >= DESKTOP_MIN_WIDTH, "mobile-only nav");
  });

  // The toggle's accessible name flips between "Open menu"/"Close menu" (see
  // SiteNav.tsx), so a single locator must match either state to stay valid
  // across the click it's used to make.
  const TOGGLE_NAME = /Open menu|Close menu/;

  test("hamburger opens the menu", async ({ page }) => {
    const toggle = page.getByRole("button", { name: TOGGLE_NAME });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
  });

  test("Escape closes the menu and returns focus to the toggle", async ({ page }) => {
    const toggle = page.getByRole("button", { name: TOGGLE_NAME });
    await toggle.click();
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  // Regression coverage: the body scroll lock used to make mobile nav links
  // no-ops (the lock left nothing for scrollIntoView to scroll). Assert the
  // destination section is actually in view, not merely that the menu closed.
  test("clicking a nav link closes the menu and actually scrolls to the section", async ({ page }) => {
    for (const item of navItems) {
      const toggle = page.getByRole("button", { name: TOGGLE_NAME });
      await toggle.click();
      const panel = page.getByRole("navigation", { name: "Mobile" });
      await expect(panel).toBeVisible();

      // exact: true — "Work" is otherwise a substring match of "AI Workflow Lab".
      await panel.getByRole("link", { name: item.label, exact: true }).click();

      await expect(panel).toBeHidden();
      await expect(page.locator(`#${item.sectionId}`)).toBeInViewport();
    }
  });
});

test("skip link is the first focusable element and moves focus to #main", async ({ page }) => {
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});
