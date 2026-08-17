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

/*
 * The résumé is a route now, not a section, so printing splits in two: the
 * home page prints itself, and /resume is the document you actually take away.
 * The old stylesheet hid every section except #resume — with that section gone
 * it would have matched everything and printed a blank sheet, which is what
 * the first test below exists to catch.
 */
test("the home page prints its content rather than a blank sheet", async ({ page }) => {
  const sections = page.locator("main > section");
  expect(await sections.count()).toBeGreaterThan(0);

  let visible = 0;
  for (const section of await sections.all()) {
    if (await section.isVisible()) visible += 1;
  }
  expect(visible, "print CSS hid every section on the page").toBeGreaterThan(0);
});

// The subtlest part of the print stylesheet: `data-print-expand` must force a
// *collapsed* disclosure's panel open for print, including restoring
// visibility on Disclosure's inner wrapper (the element that pulls collapsed
// content out of the tab order on-screen — see Disclosure.tsx). Case studies
// collapse by default, so the state needs no setup.
test("a collapsed disclosure's content is forced open for print", async ({ page }) => {
  await page.emulateMedia({ media: "screen" });
  const trigger = page
    .locator("#work")
    .getByRole("button", { name: /Read the full case study/ })
    .first();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  const panelId = await trigger.getAttribute("aria-controls");

  await page.emulateMedia({ media: "print" });
  const panel = page.locator(`#${panelId}`);
  await expect(panel).toHaveAttribute("data-print-expand", "");

  const panelDisplay = await panel.evaluate((el) => getComputedStyle(el).display);
  expect(panelDisplay, "[data-print-expand] must force display: block in print").toBe("block");

  // Polled, not read once. Disclosure's inner wrapper carries
  // `transition-[visibility] delay-200` so that closing keeps content out of
  // the tab order until the collapse finishes (see Disclosure.tsx). Switching
  // to print media flips the computed value through that same transition, so
  // an immediate read still sees `hidden` — the stylesheet is right, the
  // assertion was just faster than the delay.
  const innerWrapper = panel.locator("> div").first();
  await expect
    .poll(
      () => innerWrapper.evaluate((el) => getComputedStyle(el).visibility),
      { message: "the inner wrapper that hides collapsed content on-screen must be visible in print" },
    )
    .toBe("visible");
});

// Practical, not textual: reads the resolved ::after content off a real
// external link rather than the stylesheet source, so it reflects what a
// printed page would actually show.
test("external link hrefs are appended after the link text for print", async ({ page }) => {
  const link = page.locator('main a[href^="http"]').first();
  await expect(link).toBeAttached();

  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();

  const afterContent = await link.evaluate((el) => window.getComputedStyle(el, "::after").content);
  expect(afterContent, `::after content for ${href} was "${afterContent}"`).toContain(href ?? "");
});

test.describe("the résumé route", () => {
  test("prints its content and drops its screen-only chrome", async ({ page }) => {
    await page.goto("/resume");
    await page.waitForLoadState("networkidle");
    await page.emulateMedia({ media: "print" });

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const heading of ["Experience", "Skills", "Education"]) {
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }

    // The back link and the download button are for the screen only.
    await expect(page.getByRole("link", { name: /Back to the site/ })).toBeHidden();
    await expect(page.getByRole("link", { name: /Download PDF/ })).toBeHidden();
  });
});
