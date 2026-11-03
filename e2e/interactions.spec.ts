import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Playwright retries clicks until an element is actionable, but it dispatches
  // key presses immediately and reads the DOM immediately. Both race React's
  // hydration on a page this long, which is how a suite that passed became
  // intermittently red once sections were reordered. Waiting for the network to
  // settle is the closest available "the islands are live now" signal.
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});

test.describe("reduced motion", () => {
  /*
   * The Diary under reduced motion, at every width (round 23: it was the
   * Record's one-open rows until then). A page still turns, at once, from the
   * keyboard once the book has focus, and the corners still work.
   */
  test("a page still turns, and the book stays keyboard-reachable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("#record .diary-track").scrollIntoViewIfNeeded();
    await expect(page.locator("#record [data-diary]")).toHaveAttribute("data-live", "");

    const book = page.getByRole("region", { name: /My diary/ });
    await expect(book, "the book is a named region").toHaveCount(1);
    await book.focus();
    await expect(book).toBeFocused();
    const left = () => book.evaluate((el) => Math.round(el.scrollLeft));
    expect(await left()).toBe(0);

    await page.keyboard.press("ArrowRight");
    expect(await left(), "→ turns a page at once under reduced motion").toBeGreaterThan(0);
    await page.keyboard.press("ArrowLeft");
    expect(await left()).toBe(0);

    await page.getByRole("button", { name: "Next page" }).click();
    expect(await left(), "the corner turns a page at once under reduced motion").toBeGreaterThan(0);
    await page.getByRole("button", { name: "Previous page" }).click();
    expect(await left()).toBe(0);
  });
});
