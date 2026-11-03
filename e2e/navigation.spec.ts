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
      // exact: true — "Work" was otherwise a substring match of "AI Workflow Lab" before round 16 removed that nav item; kept defensively.
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

      // exact: true — "Work" was otherwise a substring match of "AI Workflow Lab" before round 16 removed that nav item; kept defensively.
      await panel.getByRole("link", { name: item.label, exact: true }).click();

      await expect(panel).toBeHidden();
      await expect(page.locator(`#${item.sectionId}`)).toBeInViewport();
    }
  });
});

/*
 * Round 23: the paper strip. No bar, no numbers; the current section carries an
 * ink swash (drawn on by its link's `aria-current`); every target is 44px; the
 * stamp is there from 640px and the strip's sun or moon at every width.
 */
test.describe("the header's paper strip", () => {
  test("the links are labels only, the current one is drawn under, every target is 44px", async ({ page }) => {
    test.skip(viewportWidth(page) < DESKTOP_MIN_WIDTH, "desktop-only nav");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link")).toHaveText(navItems.map((item) => item.label));
    await nav.getByRole("link", { name: navItems[1].label, exact: true }).click();
    const current = nav.locator("a[aria-current='true']");
    await expect(current).toHaveCount(1);
    // The swash is revealed by clip-path; wait out its 0.5s draw.
    await expect(current.locator(".nav-swash")).toHaveCSS("clip-path", "inset(0px)");
    await expect(nav.locator("a:not([aria-current]) .nav-swash").first()).not.toHaveCSS("clip-path", "inset(0px)");
    for (const link of await nav.getByRole("link").all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("the theme switch is a 44px drawing with no box, and flips the theme", async ({ page }) => {
    const toggle = page.getByRole("button", { name: /Switch to (night|day) theme/ });
    const box = (await toggle.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await expect(toggle).toHaveCSS("border-top-width", "0px");
    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    await toggle.click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe(before);
  });

  test("the stamp is a link to Contact from 640px, and is not on a phone", async ({ page }) => {
    const stamp = page.getByRole("link", { name: "Let’s talk" });
    if (viewportWidth(page) >= 640) {
      await expect(stamp).toBeVisible();
      expect((await stamp.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    } else {
      await expect(stamp).toBeHidden();
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
