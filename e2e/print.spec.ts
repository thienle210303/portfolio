import { test, expect } from "@playwright/test";

/**
 * The print stylesheet (globals.css `@media print`) has never been
 * exercised by a test before this file. Every test here emulates print
 * media rather than reading CSS text, so these assert the stylesheet's
 * actual rendered *effect*, not its source.
 */
test.beforeEach(async ({ page }) => {
  // Playwright retries clicks until an element is actionable, but it dispatches
  // key presses immediately and reads the DOM immediately. Both race React's
  // hydration on a page this long, which is how a suite that passed became
  // intermittently red once sections were reordered. Waiting for the network to
  // settle is the closest available "the islands are live now" signal.
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.emulateMedia({ media: "print" });
});

test("the site header is not visible in print", async ({ page }) => {
  // Scoped to the sticky nav header's own class (not a bare `header`
  // selector): the résumé section also renders a `.print-only` identity
  // `<header>` for print, so an unscoped locator would match both.
  await expect(page.locator("header.no-print")).toBeHidden();
});

test("no contact form is visible in print", async ({ page }) => {
  // Two of them now — the one-field quick-connect and the full form — so this
  // asserts over every match rather than assuming a single one.
  const forms = page.locator("#contact form");
  expect(await forms.count()).toBeGreaterThan(0);
  for (const form of await forms.all()) {
    await expect(form).toBeHidden();
  }
});

test("the closing section is not visible in print", async ({ page }) => {
  await expect(page.locator("#closing")).toBeHidden();
});

test("the résumé section is visible in print, with its content present", async ({ page }) => {
  const resume = page.locator("#resume");
  await expect(resume).toBeVisible();
  await expect(resume.getByRole("heading", { name: "Résumé", level: 2 })).toBeVisible();
  await expect(resume.getByText(/Experience \(\d+\)/)).toBeVisible();
  await expect(resume.getByText(/Skills \(\d+\)/)).toBeVisible();
});

// The subtlest part of the print stylesheet: `data-print-expand` must force
// a *collapsed* disclosure's panel open for print, including restoring
// visibility on Disclosure's inner wrapper (the element that pulls collapsed
// content out of the tab order on-screen — see Disclosure.tsx).
//
// Print now renders `#resume` only (`main > section:not(#resume)`), and
// every résumé group defaults to *open*, so there is no naturally-collapsed
// disclosure left inside the printable section — this collapses one on
// screen first (a real, reachable user action) to construct that state.
test("a collapsed disclosure's content is forced open for print", async ({ page }) => {
  const resume = page.locator("#resume");
  await page.emulateMedia({ media: "screen" });
  const trigger = resume.getByRole("button", { name: /^Skills/ });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  const panelId = await trigger.getAttribute("aria-controls");

  await page.emulateMedia({ media: "print" });
  const panel = page.locator(`#${panelId}`);
  await expect(panel).toHaveAttribute("data-print-expand", "");

  const panelDisplay = await panel.evaluate((el) => getComputedStyle(el).display);
  expect(panelDisplay, "[data-print-expand] must force display: block in print").toBe("block");

  const innerWrapper = panel.locator("> div").first();
  const innerVisibility = await innerWrapper.evaluate((el) => getComputedStyle(el).visibility);
  expect(innerVisibility, "the inner wrapper that hides collapsed content on-screen must be visible in print").toBe(
    "visible",
  );

  await expect(panel.getByRole("heading", { name: "Languages", level: 4 })).toBeVisible();
});

// Practical, not textual: reads the resolved ::after content off a real
// external link rather than the stylesheet source, so it reflects what a
// printed page would actually show. Scoped to #resume — the only section
// print renders — and switched to Deep Dive first, the depth at which a
// project's external demo/source links actually render.
test("external link hrefs are appended after the link text for print", async ({ page }) => {
  const resume = page.locator("#resume");
  await page.emulateMedia({ media: "screen" });
  await resume.getByRole("group", { name: "Résumé detail level" }).getByRole("button", { name: "Deep Dive" }).click();
  await page.emulateMedia({ media: "print" });

  const link = resume.locator('a[href^="http"]').first();
  await expect(link).toBeAttached();

  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();

  const afterContent = await link.evaluate((el) => window.getComputedStyle(el, "::after").content);
  expect(afterContent, `::after content for ${href} was "${afterContent}"`).toContain(href ?? "");
});
