import { test, expect, type Page } from "@playwright/test";

/**
 * "Ask this site".
 *
 * The property worth testing is not answer quality — that is pinned by unit
 * tests against the index in tests/lib/answers.test.ts. What matters here is
 * the promise the surrounding section makes: this box answers questions
 * *without* running a model, so it must work with no network, invent nothing,
 * and say plainly when the site has no answer.
 */

const DESKTOP_WIDTH = 1440;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

test.describe("ask this site", () => {
  test("answers a suggested question with sourced, linked evidence", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");

    await page.getByRole("button", { name: "What does he do at DoorDash?" }).click();

    const results = page.locator("#lab ol li");
    await expect(results.first()).toBeVisible();

    // Every answer carries a source and a route back to where it lives.
    const first = results.first();
    await expect(first).toContainText(/DoorDash/i);
    await expect(first.getByRole("link", { name: /Read it in/ })).toHaveAttribute(
      "href",
      /^#(about|philosophy|work|lab|journey|resume)$/,
    );
  });

  test("says so plainly when the site has no answer, and invents nothing", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");

    await page.getByPlaceholder("or ask your own").fill("what is the capital of France");
    await page.keyboard.press("Enter");

    await expect(page.getByText(/Nothing on this page answers that/)).toBeVisible();
    await expect(page.locator("#lab ol li")).toHaveCount(0);
  });

  test("works with the network offline — there is no model to fetch", async ({ page, context }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Everything the feature needs already shipped with the page. If a model
    // or an API ever creeps in behind this box, this test is what catches it.
    await context.setOffline(true);
    await page.getByRole("button", { name: "Where did he study?" }).click();
    await expect(page.locator("#lab ol li").first()).toBeVisible();
    await context.setOffline(false);
  });

  test("every suggested question is a live control, not a dead one", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");

    const suggestions = page.locator("#lab ul li button");
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index++) {
      await suggestions.nth(index).click();
      // Either real results or the honest "nothing here" line — never blank.
      const answered = await page.locator("#lab ol li").count();
      const declined = await page.getByText(/Nothing on this page answers that/).count();
      expect(answered + declined, `suggestion ${index} produced no response`).toBeGreaterThan(0);
      expect(answered, `suggestion ${index} is a dead control`).toBeGreaterThan(0);
    }
  });

  test("is keyboard operable end to end", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");

    const field = page.getByPlaceholder("or ask your own");
    await field.focus();
    await field.fill("scraper");
    await page.keyboard.press("Enter");
    await expect(page.locator("#lab ol li").first()).toBeVisible();
  });
});
