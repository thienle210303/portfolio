import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { firstCanopyYear, seasonsFor } from "../src/lib/origin-story";

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

/** Same five WCAG tag levels `axe.spec.ts` audits the rest of the page
 *  against, reused here for the one state that file does not scroll through
 *  a beat of. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

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

/**
 * v2's own coverage: the conductor documented at the top of `OriginStory.tsx`
 * — chronological release, the never-partial-tree exit guarantee on every
 * path out, and the two forms narration takes depending on whether the cats
 * are free to carry it.
 */
test.describe("chronological growth", () => {
  test("releases each year's growable groups in order, never all at once", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once");

    // Derived from the same imports the player itself uses, never a literal
    // year: `seasonsFor()` is the beat order past flight/seed, and
    // `firstCanopyYear()` is the year `releaseThroughYear` first has anything
    // above ground to release.
    const seasons = seasonsFor();
    const canopyYear = firstCanopyYear();
    const seasonIndex = seasons.findIndex((season) => season.year === canopyYear);
    expect(
      seasonIndex,
      "content fixture assumption failed: no season names firstCanopyYear()",
    ).toBeGreaterThanOrEqual(0);

    await watchOriginButton(page).click();
    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible();
    const status = stage.getByRole("status");
    await expect(status).not.toHaveText("");

    // Flight is beat 0, seed is beat 1, then one season beat per entry in
    // `seasons` — so the beat that names `canopyYear` sits at `2 + seasonIndex`.
    // Clicking the stage advances immediately (see "clicking the stage
    // advances to the next beat" above), and reaching that beat is what runs
    // `releaseThroughYear(groups, canopyYear)` in `OriginStory.tsx`.
    const targetBeatIndex = 2 + seasonIndex;
    for (let i = 0; i < targetBeatIndex; i += 1) {
      const before = await status.textContent();
      await stage.click({ position: { x: 5, y: 5 } });
      await expect(status).not.toHaveText(before ?? "");
    }

    const groupState = await page.evaluate((limitYear) => {
      // The shoot is deliberately excluded from this generic sweep (it waits
      // for its own "still" beat), so it is excluded here too.
      const groups = Array.from(
        document.querySelectorAll<HTMLElement>("[data-origin-year]"),
      ).filter((el) => !el.hasAttribute("data-tree-shoot"));
      const early = groups.filter((el) => Number(el.getAttribute("data-origin-year")) <= limitYear);
      const later = groups.filter((el) => Number(el.getAttribute("data-origin-year")) > limitYear);
      return {
        earlyPending: early.filter((el) => el.hasAttribute("data-origin-pending")).length,
        laterTotal: later.length,
        laterPending: later.filter((el) => el.hasAttribute("data-origin-pending")).length,
      };
    }, canopyYear);

    // Grown in order: every group dated at or before the beat just reached
    // has already been released.
    expect(groupState.earlyPending).toBe(0);
    // Never all at once: something dated after it is still waiting its turn.
    expect(
      groupState.laterTotal,
      "content fixture assumption failed: no year after firstCanopyYear()",
    ).toBeGreaterThan(0);
    expect(groupState.laterPending).toBeGreaterThan(0);
  });
});

test.describe("exit hygiene", () => {
  /**
   * Every exit path funnels through `releaseEverything` in `OriginStory.tsx`
   * — a real tree left half-drawn is worse than a story that never played.
   * Both tests below get the show genuinely mid-story (past the flight beat,
   * with real pending groups still on the tree) before exiting, so a pass
   * here cannot be explained by "nothing was ever pending to begin with".
   */
  async function midStory(page: Page): Promise<{ stage: ReturnType<Page["locator"]> }> {
    await watchOriginButton(page).click();
    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible();
    const status = stage.getByRole("status");
    await expect(status).not.toHaveText("");
    const before = await status.textContent();
    await stage.click({ position: { x: 5, y: 5 } });
    await expect(status).not.toHaveText(before ?? "");
    expect(
      await page.locator("[data-origin-pending]").count(),
      "test setup assumption failed: nothing was pending mid-story",
    ).toBeGreaterThan(0);
    return { stage };
  }

  test("Skip mid-story leaves zero pending groups and no data-origin-running", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once");
    const { stage } = await midStory(page);

    await stage.getByRole("button", { name: "Skip" }).click();

    await expect(stage).toHaveCount(0);
    await expect(page.locator("[data-origin-pending]")).toHaveCount(0);
    await expect(page.locator("[data-origin-running]")).toHaveCount(0);
  });

  test("Escape mid-story leaves zero pending groups and no data-origin-running", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once");
    const { stage } = await midStory(page);

    await page.keyboard.press("Escape");

    await expect(stage).toHaveCount(0);
    await expect(page.locator("[data-origin-pending]")).toHaveCount(0);
    await expect(page.locator("[data-origin-running]")).toHaveCount(0);
  });
});

test.describe("narration without the cats", () => {
  test("falls back to a floating annotation that keeps narrating when the cats are napped", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once");

    // Send the cats to bed first — `Companion.tsx`'s watch listener only
    // attaches while `roams && roaming`, which "resting" is neither, so the
    // player never hears an `origin-story-ack` and `catsNarrating` never
    // flips true.
    await page.evaluate(() => window.localStorage.setItem("companion", "resting"));
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /wake the cats/i })).toBeVisible();

    await watchOriginButton(page).click();
    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible();

    const annotation = stage.locator("[data-origin-annotation]");
    await expect(annotation).toBeVisible();
    await expect(annotation).toHaveAttribute("aria-hidden", "true");
    await expect(annotation).not.toHaveText("");

    // And it keeps narrating rather than freezing on the flight caption.
    const before = await annotation.textContent();
    await stage.click({ position: { x: 5, y: 5 } });
    await expect(annotation).not.toHaveText(before ?? "");
  });
});

test.describe("accessible narration", () => {
  test("the sr-only status announces every beat, and axe stays clean mid-story", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once");

    await watchOriginButton(page).click();
    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible();

    const status = stage.getByRole("status");
    await expect(status).not.toHaveText("");

    // Present in the accessibility tree, but visually clipped to nothing —
    // the actual `.sr-only` CSS contract (`globals.css`), checked directly
    // rather than trusted from the class name alone.
    const box = await status.boundingBox();
    expect(box, "the status region has no box at all").not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(1);
    expect(box!.height).toBeLessThanOrEqual(1);

    // Every beat is heard as a change, not just the first one.
    const first = await status.textContent();
    await stage.click({ position: { x: 5, y: 5 } });
    await expect(status).not.toHaveText(first ?? "");
    const second = await status.textContent();
    await stage.click({ position: { x: 5, y: 5 } });
    await expect(status).not.toHaveText(second ?? "");

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(
      results.violations,
      results.violations.map((violation) => `[${violation.id}] ${violation.help}`).join("\n"),
    ).toEqual([]);
  });
});
