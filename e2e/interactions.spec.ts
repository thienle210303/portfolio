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
   * A Journey timeline row's disclosure under reduced motion, at every width.
   * DoorDash is chosen because its panel holds its case studies, whose
   * "Read the full case study" triggers are focusable — Tab correctly skips
   * prose-only panels, so reachability needs a panel where landing inside is
   * actually possible.
   */
  test("a disclosure still opens, closes, and stays keyboard-reachable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    const trigger = page.locator("#record-row-doordash-trigger");
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
