import { test, expect, type Page } from "@playwright/test";

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

test.describe("hero code panel", () => {
  // The panel wraps its lines now (owner feedback, round 6) — the internal
  // horizontal scroll this test used to exercise no longer exists. What
  // survives is the invariant the scroll existed to protect: nothing about
  // the code panel may move the page sideways at the smallest viewport.
  test("wraps at 320px and cannot scroll the page or itself sideways", async ({ page }) => {
    test.skip(viewportWidth(page) !== 320, "smallest configured viewport only");

    const region = page.getByRole("region", { name: "builder.ts" });
    await region.evaluate((el) => {
      el.scrollLeft = 200;
    });
    const panelScroll = await region.evaluate((el) => el.scrollLeft);
    const whiteSpace = await region.evaluate((el) => getComputedStyle(el).whiteSpace);
    const pageScrollX = await page.evaluate(() => window.scrollX);
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

    expect(whiteSpace, "the panel must wrap its lines").toBe("pre-wrap");
    expect(panelScroll, "a wrapped panel has nothing to scroll — scrollLeft must stay 0").toBe(0);
    expect(pageScrollX, "the page itself must not have scrolled horizontally").toBe(0);
    expect(pageOverflow, "the page must not gain horizontal overflow from the code panel").toBeLessThanOrEqual(
      1,
    );
  });
});

test.describe("reduced motion", () => {
  /*
   * Through round 17 this opened a journey entry on the timeline's "List"
   * face. Round 18 deleted the timeline and its toggle; the same contract now
   * belongs to a Journey branch's own disclosure, in whichever presentation
   * is on screen (the drawing's panel at >=1024px, the list's row below it).
   * Under reduced motion the stage never pins, so nothing has to be released
   * first. DoorDash is chosen because its panel holds its case studies, whose
   * "Read the full case study" triggers are focusable — Tab correctly skips
   * prose-only panels, so reachability needs a panel where landing inside is
   * actually possible.
   */
  test("a disclosure still opens, closes, and stays keyboard-reachable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    const prefix = viewportWidth(page) >= 1024 ? "tree-branch-" : "tree-list-branch-";
    const trigger = page.locator(`#${prefix}doordash-trigger`);
    await expect(trigger, "expected the DoorDash branch's disclosure trigger").toHaveCount(1);
    const panelId = await trigger.getAttribute("aria-controls");
    expect(panelId, "Disclosure trigger must expose aria-controls").toBeTruthy();
    await expect(
      page
        .locator(`#${panelId}`)
        .getByRole("button", { name: /Read the full case study/, includeHidden: true }),
      "the panel must hold something focusable, or Tab has nowhere to land",
    ).not.toHaveCount(0);

    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Tab");
    const landedInPanel = await page.evaluate((id) => {
      const panel = id ? document.getElementById(id) : null;
      return panel ? panel.contains(document.activeElement) : false;
    }, panelId);
    expect(landedInPanel, "Tab from an open trigger must reach its panel under reduced motion").toBe(true);

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(`#${panelId}`)).toBeHidden();
  });
});
