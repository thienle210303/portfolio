import { test, expect, type Page } from "@playwright/test";
import { seasonsFor } from "../src/lib/origin-story";

/**
 * The origin-story player (`WatchOrigin.tsx` / `OriginStory.tsx`, Workstream
 * "origin-story" Tasks 3-4): the "Watch how it grew" button that lazy-loads
 * the flight → seed → seasons → reveal → still-growing show, and its
 * reduced-motion storyboard fallback.
 *
 * The always-on changes from Task 2 (the unfinished shoot, the ground band
 * as a drawing) already have their own coverage in `sections.spec.ts` — see
 * "the unfinished shoot draws with its still-growing annotation" and "the
 * ground band renders as drawing, not a boxed card" there. This file owns
 * only the player itself.
 */

// Matches the `lg:` breakpoint (1024px) `KnowledgeTree.tsx` wraps the button
// in `hidden lg:block` at — the same threshold `sections.spec.ts` already
// tests the drawn-vs-list presentation against.
const DESKTOP_MIN_WIDTH = 1024;
// The player's own interactions are not viewport-dependent once the button
// exists at all, so — matching the "run once, at a representative desktop
// viewport" idiom `axe.spec.ts` and `reveal.spec.ts` already use — they are
// each pinned to one width rather than repeated (with real setTimeout-driven
// beats) across every project.
const DESKTOP_WIDTH = 1440;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});

function watchOriginButton(page: Page) {
  return page.locator("#tree").getByRole("button", { name: "Watch how it grew" });
}

test.describe("the button", () => {
  test("surfaces inside #tree at >=1024px, and is hidden below it", async ({ page }) => {
    const button = watchOriginButton(page);
    if (viewportWidth(page) >= DESKTOP_MIN_WIDTH) {
      await expect(button).toBeVisible();
    } else {
      await expect(button).toBeHidden();
    }
  });
});

test.describe("the player", () => {
  test("pressing the button opens the stage with an honest flight caption", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "the button only mounts at >=1024px; run once");

    await watchOriginButton(page).click();

    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible();

    // The one geographic fact the story is allowed to name is the arrival —
    // "<country> → United States · December 2018" — never the city
    // (`origin.from`, "Rạch Giá, Việt Nam") and never a schooling location.
    // `origin-story.test.ts` holds `Season.caption` to the same ban; this is
    // the flight caption's own copy of it.
    //
    // The status region mounts empty and is filled a frame later (see
    // `AnimatedStage` in `OriginStory.tsx`) so a screen reader hears beat 1
    // as a change rather than silently missing it — `toContainText` is an
    // auto-retrying assertion, so it absorbs that one-tick delay.
    const status = stage.getByRole("status");
    await expect(status).toContainText("December 2018");
    const captionText = await status.textContent();
    expect(captionText ?? "").not.toMatch(/Rạch|Taylors|Columbia|Cheraw/);
  });

  test("clicking the stage advances to the next beat", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once");

    await watchOriginButton(page).click();
    const stage = page.locator("[data-origin-stage]");
    const status = stage.getByRole("status");
    // Wait past the mount-empty-then-fill delay before capturing the
    // baseline caption, or this could grab the empty string instead.
    await expect(status).not.toHaveText("");
    const flightCaption = await status.textContent();

    // Top-left corner of the stage: away from the Skip button, which sits in
    // the top-right (`right-3 top-3`) and stops its own clicks from
    // propagating to the stage's advance handler.
    await stage.click({ position: { x: 5, y: 5 } });

    await expect(status).not.toHaveText(flightCaption ?? "");
  });

  test("Escape ends the show, leaves the figure visible, and restores focus to the button", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once");

    const button = watchOriginButton(page);
    await button.click();

    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(stage).toHaveCount(0);
    await expect(page.locator("[data-tree-figure]")).toBeVisible();
    await expect(button).toBeFocused();
  });

  test.describe("reduced motion", () => {
    test.use({ contextOptions: { reducedMotion: "reduce" } });

    test("pressing the button renders the full storyboard, with every season's year present", async ({
      page,
    }) => {
      test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once");

      await watchOriginButton(page).click();
      const stage = page.locator("[data-origin-stage]");
      await expect(stage).toBeVisible();

      // Real text, not an animated frame the click-to-advance idiom would
      // otherwise gate: the storyboard renders every beat at once, so every
      // `Season.caption`'s year must already be on the page with nothing
      // pressed or waited for.
      const seasons = seasonsFor();
      expect(seasons.length, "content fixture assumption failed: no seasons computed").toBeGreaterThan(0);
      for (const season of seasons) {
        await expect(stage.getByText(String(season.year))).not.toHaveCount(0);
      }
    });
  });
});
