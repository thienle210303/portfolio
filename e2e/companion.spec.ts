import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The companion cat and its quick-actions toolkit.
 *
 * The cat is decoration with a job attached, and the job is what these tests
 * cover: it must be operable by keyboard, must never be the only route to
 * anything, must stay out of the way when a visitor asks for less motion, and
 * must be dismissible for good. Its animation is deliberately not asserted —
 * pose and position are cosmetic, and pinning them would make the suite fail
 * every time the drawing is retouched.
 */

const DESKTOP_WIDTH = 1440;
const MOBILE_WIDTH = 375;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

function catButton(page: Page) {
  return page.getByRole("button", { name: /quick actions/i });
}

test.describe("companion", () => {
  test("opens and closes its toolkit, and Escape returns focus to the cat", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");

    const cat = catButton(page);
    await expect(cat).toHaveAttribute("aria-expanded", "false");

    await cat.click();
    await expect(cat).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: /^GitHub/ }).last()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(cat).toHaveAttribute("aria-expanded", "false");
    await expect(cat).toBeFocused();
  });

  test("is reachable and operable by keyboard alone", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");

    const cat = catButton(page);
    await cat.focus();
    await expect(cat).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(cat).toHaveAttribute("aria-expanded", "true");

    // Opening moves focus into the panel, so the first Tab stays inside it
    // rather than stranding the visitor back at the top of the document.
    const focusedInPanel = await page.evaluate(() =>
      document.getElementById("companion-actions")?.contains(document.activeElement),
    );
    expect(focusedInPanel).toBe(true);
  });

  test("every toolkit action also exists elsewhere on the page", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "content is viewport-independent; run once");
    await page.goto("/");
    await catButton(page).click();

    const panel = page.locator("#companion-actions");

    // Section jumps resolve to real sections.
    for (const id of ["work", "journey", "resume", "contact"]) {
      const link = panel.locator(`a[href="#${id}"]`);
      await expect(link).toHaveCount(1);
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    // The social links point at the same URLs the footer already carries, so
    // the cat is a shortcut rather than a second source of truth.
    for (const name of [/^GitHub/, /^LinkedIn/]) {
      const inPanel = panel.getByRole("link", { name });
      const href = await inPanel.getAttribute("href");
      expect(href).toBeTruthy();
      await expect(page.locator(`footer a[href="${href}"]`)).toHaveCount(1);
      await expect(inPanel).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  test("can be dismissed for good, and stays gone across a reload", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");

    await catButton(page).click();
    await page.getByRole("button", { name: /send the cat away/i }).click();
    await expect(catButton(page)).toHaveCount(0);

    await page.reload();
    await expect(catButton(page)).toHaveCount(0);

    // Nothing else on the page depends on it: contact routes still resolve.
    await expect(page.locator("#contact")).toBeVisible();
  });

  test("does not roam when the visitor asks for reduced motion", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: DESKTOP_WIDTH, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/");

    const cat = catButton(page);
    const before = await cat.boundingBox();
    await page.mouse.move(300, 300);
    await page.mouse.move(1100, 700);
    await page.waitForTimeout(600);
    const after = await cat.boundingBox();

    expect(before).not.toBeNull();
    expect(after).toEqual(before);
    // Still fully usable — it is parked, not removed.
    await cat.click();
    await expect(cat).toHaveAttribute("aria-expanded", "true");

    await context.close();
  });

  test("adds no WCAG violations with its toolkit open", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await catButton(page).click();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations,
      results.violations.map((violation) => `[${violation.id}] ${violation.help}`).join("\n"),
    ).toEqual([]);
  });

  test("is not printed", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "print CSS is viewport-independent; run once");
    await page.goto("/");
    await page.emulateMedia({ media: "print" });
    await expect(catButton(page)).toBeHidden();
  });
});
