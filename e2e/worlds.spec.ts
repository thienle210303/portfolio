import { test, expect } from "@playwright/test";
import { resolveWorlds } from "../src/lib/worlds";

const WORLDS = resolveWorlds();

test.describe("the worlds list is the feature; the canvas is decoration", () => {
  test("every world, plaque and source is reachable with the canvas chunk blocked", async ({
    page,
  }) => {
    // Not "with JavaScript off" — with the *canvas* gone, which is the claim
    // the spec actually makes and the one a flaky deploy actually produces.
    await page.route(/GlobeCanvas/, (route) => route.abort());
    await page.goto("/#worlds");

    const section = page.locator("#worlds");
    await expect(section).toBeVisible();

    // Scoped to the list: "Face Việt Nam" is also a button containing that name.
    const list = section.getByRole("list", { name: /the seven/i });
    for (const world of WORLDS) {
      await list.getByRole("button", { name: new RegExp(world.name, "i") }).click();
      await expect(section.getByRole("heading", { level: 3, name: world.name })).toBeVisible();
      for (const plaque of world.plaques) {
        await expect(section.getByText(plaque.text, { exact: true })).toBeVisible();
      }
    }
  });

  test("the rail's counts match the resolved content", async ({ page }) => {
    await page.goto("/#worlds");
    const rail = page.locator("#worlds dl");
    const plaques = WORLDS.reduce((total, world) => total + world.plaques.length, 0);
    const offMap = WORLDS.filter((world) => world.point === null).length;

    // Scoped to each note's own <dd> — the whole <dl>'s text also contains
    // the crossing's km figure and the other notes' own numbers, so an
    // unscoped toContainText can pass for a reason that has nothing to do
    // with the fact it claims to check: move the two pins and 19 plaques
    // could just as easily read "13,719 km", which also contains a "19".
    const offMapRow = rail.locator("div", { hasText: "Off the map" });
    const plaquesRow = rail.locator("div", { hasText: "Plaques" });

    await expect(offMapRow.locator("dd")).toContainText(String(offMap));
    await expect(plaquesRow.locator("dd")).toContainText(String(plaques));
  });

  test("the seven buttons are reachable by keyboard alone", async ({ page }) => {
    await page.goto("/#worlds");
    const section = page.locator("#worlds");
    const first = section
      .getByRole("list", { name: /the seven/i })
      .getByRole("button", { name: new RegExp(WORLDS[0].name, "i") });
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("aria-current", "true");
  });

  test("no horizontal overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#worlds");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
