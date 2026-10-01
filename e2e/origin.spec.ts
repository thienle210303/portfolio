import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { firstCanopyYear, seasonsFor, STAGGER_STEP_MS } from "../src/lib/origin-story";
import { origin } from "../src/content/portfolio";

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

// Matches the `lg:` breakpoint (1024px) `CareerTree.tsx` wraps the button in
// `hidden lg:block` at — round 18 re-homed it from `KnowledgeTree.tsx`'s figure
// onto the stage's drawing — the same threshold `sections.spec.ts` already
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

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Whether `inner`'s box lies entirely inside `outer`'s, within a small
 *  pixel tolerance for sub-pixel layout rounding. Used to prove the sky
 *  layer never strays outside the stage it is `absolute` inside of — see
 *  "everything lives in the frame" below. */
function boxContains(outer: Box, inner: Box, tolerance = 1): boolean {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});

function watchOriginButton(page: Page) {
  return page.locator("#tree").getByRole("button", { name: "Watch how it grew" });
}

/** Whether the Journey's stage is pinned right now — the same question
 *  `Stage.tsx` asks before it releases the pin, asked the same way, so this
 *  never becomes a second copy of the media query in `globals.css`. False below
 *  1280px, false under reduced motion, false once the pin is released. */
async function stageIsPinned(page: Page): Promise<boolean> {
  return page
    .locator("#tree [data-stage-pin]")
    .evaluate((element) => getComputedStyle(element).position === "sticky");
}

/**
 * Get to the finished tree, which is where the origin story lives.
 *
 * Round 18's second plan re-homed "Watch how it grew" onto the stage's own
 * drawing, at the crown, and gave it to the stage's *end state*: while the pin
 * is in force and the acts are still running, the stylesheet hides it, so it is
 * not a second control competing with the scrubber. "Show me the whole tree" is
 * how a reader reaches that end state, and it is the only step added here.
 *
 * This changes the *route* to the button, not the button: `watchOriginButton`
 * above is the same locator it has always been, and every assertion past this
 * point is the same assertion it was before.
 *
 * A no-op wherever the pin never engages — below 1280px, under reduced motion —
 * because there the tree on screen is already the finished one.
 */
async function showTheFinishedTree(page: Page) {
  if (!(await stageIsPinned(page))) return;
  await page.locator("#tree").getByRole("button", { name: "Show me the whole tree" }).click();
}

/**
 * How long the stage may take to appear after the button is pressed. The
 * player is a lazy chunk fetched on the press (`WatchOrigin.tsx`), and this
 * suite runs against `pnpm dev` under six parallel worker projects — a
 * chunk that mounts in ~2.7s in isolation was measured missing a 5s expect
 * under full-matrix contention (dev-compile latency, not product latency:
 * a deployed visitor gets a prebuilt chunk). Same load-sized-timeout
 * discipline the companion suite adopted in round 6.
 */
const PLAYER_MOUNT_TIMEOUT = 15_000;

test.describe("the button", () => {
  test("surfaces on the finished tree at >=1024px, and never below it", async ({ page }) => {
    const button = watchOriginButton(page);
    if (viewportWidth(page) < DESKTOP_MIN_WIDTH) {
      // Below 1024px the list is the presentation and there is no drawing for a
      // story to grow in, so `CareerTree.tsx`'s `hidden lg:block` wrapper keeps
      // the button out of the layout entirely. There is no state to reach and
      // no route to traverse: the pin never engages this narrow, so there is no
      // "Show me the whole tree" control on the page to press — the whole stage
      // is already the finished tree. One assertion, and it is the only one
      // there is anything here to make.
      await expect(button).toBeHidden();
      return;
    }
    // Round 18's second plan: it belongs to the finished tree. While the pin is
    // in force and the acts are still running it is hidden, and that half is as
    // much the contract as the other, so both are asserted. At 1024-1279px the
    // pin never engages, so the first assertion is skipped and the drawing on
    // screen is already the finished one.
    if (await stageIsPinned(page)) await expect(button).toBeHidden();
    await showTheFinishedTree(page);
    await expect(button).toBeVisible();
  });
});

test.describe("the player", () => {
  test("pressing the button opens the stage with an honest flight caption", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "the button only mounts at >=1024px; run once");

    await showTheFinishedTree(page);
    await watchOriginButton(page).click();

    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible({ timeout: PLAYER_MOUNT_TIMEOUT });

    // The one geographic fact the story is allowed to name is the crossing —
    // `origin.from` → `origin.to` · `origin.arrived`, both ends as authored
    // (the same string `computedFact("crossing")` gives the globe) — and never
    // a schooling location. `origin-story.test.ts` holds `Season.caption` to a
    // ban on every place name; the flight is the one beat exempt from the
    // arrival's own two ends, and this is its copy of the schooling ban.
    //
    // The status region mounts empty and is filled a frame later (see
    // `AnimatedStage` in `OriginStory.tsx`) so a screen reader hears beat 1
    // as a change rather than silently missing it — `toContainText` is an
    // auto-retrying assertion, so it absorbs that one-tick delay.
    const status = stage.getByRole("status");
    await expect(status).toContainText("December 2018");
    await expect(status).toContainText(origin.to);
    const captionText = await status.textContent();
    expect(captionText ?? "").not.toMatch(/Columbia|Cheraw/);
  });

  test("clicking the stage advances to the next beat", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once");

    await showTheFinishedTree(page);
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
    await showTheFinishedTree(page);
    await button.click();

    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible({ timeout: PLAYER_MOUNT_TIMEOUT });

    await page.keyboard.press("Escape");

    await expect(stage).toHaveCount(0);
    // The drawing is still there and still fully drawn — the same claim this
    // made against `[data-tree-figure]` before round 18 unmounted the figure
    // that carried that attribute. `[data-origin-host]` is the box the player
    // overlays and conducts, i.e. the drawing itself, so it is the stronger
    // subject of the two: a tree left half-grown would be inside it, which the
    // second assertion is there to say out loud.
    await expect(page.locator("[data-origin-host]")).toBeVisible();
    await expect(page.locator("[data-origin-pending]")).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  test.describe("reduced motion", () => {
    test.use({ contextOptions: { reducedMotion: "reduce" } });

    test("pressing the button renders the full storyboard, with every season's year present", async ({
      page,
    }) => {
      test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once");

      await showTheFinishedTree(page);
      await watchOriginButton(page).click();
      const stage = page.locator("[data-origin-stage]");
      await expect(stage).toBeVisible({ timeout: PLAYER_MOUNT_TIMEOUT });

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
 * Round 15, "the seed drops into empty air": the owner's report was that the
 * flight and seed beats played in the same top-pinned box the canopy's own
 * weather uses, so on a tall tree the seed visually landed a full
 * trunk-length above the ground it was meant to drop into. The fix is
 * `groundSlice`, a second box `bottom-0` against the drawing rather than
 * `top-0` (`OriginStory.tsx`'s file banner and `SkyLayer`'s own doc comment)
 * — `[data-origin-ground]`, checked here directly rather than trusted from
 * the source alone.
 */
test.describe("ground anchoring", () => {
  test("flight and seed draw in a box pinned to the drawing's own ground line, not the canopy", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once");

    await showTheFinishedTree(page);
    await watchOriginButton(page).click();
    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible({ timeout: PLAYER_MOUNT_TIMEOUT });
    const sky = page.locator("[data-origin-sky]");
    const ground = page.locator("[data-origin-ground]");
    const status = stage.getByRole("status");
    await expect(status).not.toHaveText("");

    // Flight is beat 0: the bird's own drawing lives in `groundSlice` now,
    // and `skySlice` — with no season and no weather to show yet — draws
    // nothing at all.
    await expect(ground.locator("svg")).toHaveCount(1);
    await expect(sky.locator("svg")).toHaveCount(0);

    const stageBox = await stage.boundingBox();
    const groundBox = await ground.boundingBox();
    const skyBox = await sky.boundingBox();
    expect(stageBox, "stage has no box").not.toBeNull();
    expect(groundBox, "ground layer has no box").not.toBeNull();
    expect(skyBox, "sky layer has no box").not.toBeNull();

    // Pinned to the drawing's own bottom edge — the real ground line
    // `TrunkFoot`'s `bottom-0` sits on (`DrawnTree.tsx`; through round 17 the
    // root plinth's top border was the same edge, and round 18 stopped
    // rendering the plinth) — not floating up near the canopy with the sky
    // box's own weather.
    expect(Math.abs(groundBox!.y + groundBox!.height - (stageBox!.y + stageBox!.height))).toBeLessThan(2);
    // And meaningfully below the sky box's own top: proof this is a
    // different, lower box, not the same one under a second name.
    expect(groundBox!.y).toBeGreaterThan(skyBox!.y + skyBox!.height / 2);

    // Advance to the seed beat (beat 1) — the same box keeps drawing there,
    // not just for the flight.
    const flightCaption = await status.textContent();
    await stage.click({ position: { x: 5, y: 5 } });
    await expect(status).not.toHaveText(flightCaption ?? "");
    await expect(ground.locator("svg")).toHaveCount(1);
    await expect(sky.locator("svg")).toHaveCount(0);

    // And the caption follows the picture: whenever the floating annotation
    // is rendering at all (the cats may or may not be narrating instead —
    // see "narration without the cats" above), it lives inside `groundSlice`,
    // beside the seed, never left behind in the empty `skySlice`.
    const annotationCount = await stage.locator("[data-origin-annotation]").count();
    if (annotationCount > 0) {
      await expect(ground.locator("[data-origin-annotation]")).toHaveCount(1);
      await expect(sky.locator("[data-origin-annotation]")).toHaveCount(0);
    }
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
    // `firstCanopyYear()` is the year `planRelease` (`origin-story.ts`)
    // first has anything above ground to release.
    const seasons = seasonsFor();
    const canopyYear = firstCanopyYear();
    const seasonIndex = seasons.findIndex((season) => season.year === canopyYear);
    expect(
      seasonIndex,
      "content fixture assumption failed: no season names firstCanopyYear()",
    ).toBeGreaterThanOrEqual(0);

    await showTheFinishedTree(page);
    await watchOriginButton(page).click();
    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible({ timeout: PLAYER_MOUNT_TIMEOUT });
    const status = stage.getByRole("status");
    await expect(status).not.toHaveText("");

    // Flight is beat 0, seed is beat 1, then one season beat per entry in
    // `seasons` — so the beat that names `canopyYear` sits at `2 + seasonIndex`.
    // Clicking the stage advances immediately (see "clicking the stage
    // advances to the next beat" above), and reaching that beat is what
    // queues `canopyYear`'s own groups for the master clock to release.
    const targetBeatIndex = 2 + seasonIndex;
    for (let i = 0; i < targetBeatIndex; i += 1) {
      const before = await status.textContent();
      await stage.click({ position: { x: 5, y: 5 } });
      await expect(status).not.toHaveText(before ?? "");
    }

    // Contract check (round 10, "Origin story on one clock"): the rebuilt
    // player releases a beat's own due groups *progressively* — a single
    // rAF master clock removes each group's `data-origin-pending` exactly
    // `STAGGER_STEP_MS` apart, staggered across real time (`planRelease`/
    // `dueByElapsed` in `origin-story.ts`, applied from `OriginStory.tsx`'s
    // "master clock" effect) — rather than every due group flipping in the
    // DOM synchronously the instant the beat's own `origin-story-beat`
    // CustomEvent fires. That stagger is the intended architecture, not a
    // regression: it is the whole point of "start from the ground, grow
    // slowly", and nothing else on the page needs the old synchronous
    // contract — the companion's own `origin-story-beat` listener
    // (`Companion.tsx`) narrates from the event's `kind`/`year`/`storm`
    // detail alone and never inspects `[data-origin-pending]`. So this
    // samples with `expect.poll` instead of one instantaneous
    // `page.evaluate` right after the last click, with a deadline sized off
    // the same `STAGGER_STEP_MS` the clock itself staggers by (comfortably
    // under `OriginStory.tsx`'s own `SEASON_MS`, so the beat's own
    // auto-advance can never race this poll and start releasing a *later*
    // year's groups before it resolves) — "never all at once" is still
    // proven below, by `laterPending` staying nonzero throughout.
    const earlyCount = await page.evaluate(
      (limitYear) =>
        Array.from(document.querySelectorAll<HTMLElement>("[data-origin-year]")).filter(
          (el) => !el.hasAttribute("data-tree-shoot") && Number(el.getAttribute("data-origin-year")) <= limitYear,
        ).length,
      canopyYear,
    );

    const readEarlyPending = () =>
      page.evaluate((limitYear) => {
        const groups = Array.from(document.querySelectorAll<HTMLElement>("[data-origin-year]")).filter(
          (el) => !el.hasAttribute("data-tree-shoot"),
        );
        return groups.filter(
          (el) =>
            Number(el.getAttribute("data-origin-year")) <= limitYear && el.hasAttribute("data-origin-pending"),
        ).length;
      }, canopyYear);

    // Grown in order: every group dated at or before the beat just reached
    // is released within the stagger window the clock itself promises for
    // it — never left pending forever, but not required to be instant.
    await expect
      .poll(readEarlyPending, { timeout: Math.min(earlyCount * STAGGER_STEP_MS + 500, 1700) })
      .toBe(0);

    const groupState = await page.evaluate((limitYear) => {
      // The shoot is deliberately excluded from this generic sweep (it waits
      // for its own "still" beat), so it is excluded here too.
      const groups = Array.from(
        document.querySelectorAll<HTMLElement>("[data-origin-year]"),
      ).filter((el) => !el.hasAttribute("data-tree-shoot"));
      const later = groups.filter((el) => Number(el.getAttribute("data-origin-year")) > limitYear);
      return {
        laterTotal: later.length,
        laterPending: later.filter((el) => el.hasAttribute("data-origin-pending")).length,
      };
    }, canopyYear);

    // Never all at once: something dated after the beat just reached is
    // still waiting its turn.
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
    await showTheFinishedTree(page);
    await watchOriginButton(page).click();
    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible({ timeout: PLAYER_MOUNT_TIMEOUT });
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

    await showTheFinishedTree(page);
    await watchOriginButton(page).click();
    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible({ timeout: PLAYER_MOUNT_TIMEOUT });

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

    await showTheFinishedTree(page);
    await watchOriginButton(page).click();
    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible({ timeout: PLAYER_MOUNT_TIMEOUT });

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

/**
 * Round 12, "Origin story lives in the frame": the owner's report was that
 * "watch how it grew is very unstable and awful when I scroll up and down"
 * — traced to a camera pan (`scrollIntoView` for root-year beats) and a
 * scroll-away `IntersectionObserver` that ended the show the instant the
 * sky slice left the viewport, both fighting a visitor's own scroll. Both
 * are deleted rather than adapted: everything the player draws is now
 * `position: absolute` inside the stage, which is itself `absolute` inside
 * the tree figure's own relative box — never `position: fixed` to the
 * viewport — so scrolling moves the whole picture as one object, and there
 * is no more "the visitor scrolled away" event for anything to end on.
 *
 * This replaces the old scroll-away-ends-the-show coverage with the
 * opposite contract: scrolling the stage out of view and back no longer
 * ends the show, the show keeps advancing while off-screen, and nothing
 * ever separates from the drawing at any scroll position — proven by the
 * sky layer's own bounding box (`[data-origin-sky]`) staying inside the
 * stage's bounding box (`[data-origin-stage]`) throughout.
 */
test.describe("everything lives in the frame", () => {
  test("scrolling away mid-story doesn't end it, and nothing detaches from the drawing", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once");

    await showTheFinishedTree(page);
    await watchOriginButton(page).click();
    const stage = page.locator("[data-origin-stage]");
    await expect(stage).toBeVisible({ timeout: PLAYER_MOUNT_TIMEOUT });
    const sky = page.locator("[data-origin-sky]");
    // Round 15 split the one sky box into two — `skySlice` (top-pinned, over
    // the canopy) and `groundSlice` (bottom-pinned, at the drawing's own
    // ground line) — see OriginStory.tsx's file banner, "The sky, not a
    // cover — and, since round 15, the ground too". Both are `absolute`
    // inside the same stage, so both must hold the same "never shears apart
    // while scrolling" contract the original sky box alone used to prove.
    const ground = page.locator("[data-origin-ground]");
    const status = stage.getByRole("status");
    await expect(status).not.toHaveText("");

    // Contained at rest, before any scrolling happens at all.
    const startStageBox = await stage.boundingBox();
    const startSkyBox = await sky.boundingBox();
    const startGroundBox = await ground.boundingBox();
    expect(startStageBox, "stage has no box").not.toBeNull();
    expect(startSkyBox, "sky layer has no box").not.toBeNull();
    expect(startGroundBox, "ground layer has no box").not.toBeNull();
    expect(boxContains(startStageBox!, startSkyBox!)).toBe(true);
    expect(boxContains(startStageBox!, startGroundBox!)).toBe(true);

    const beforeScroll = await status.textContent();

    // Scroll the whole stage well out of the viewport — the deleted
    // observer used to end the show the instant this happened.
    await page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" as ScrollBehavior });
    });
    await expect(stage).not.toBeInViewport();
    // Still mounted and still running off-screen — Skip is still there.
    await expect(stage.getByRole("button", { name: "Skip" })).toBeAttached();

    // Even scrolled away, nothing has sheared apart: both the sky and ground
    // layers' boxes are still exactly where the stage's own box says they
    // should be.
    const awayStageBox = await stage.boundingBox();
    const awaySkyBox = await sky.boundingBox();
    const awayGroundBox = await ground.boundingBox();
    expect(awayStageBox, "stage has no box while scrolled away").not.toBeNull();
    expect(awaySkyBox, "sky layer has no box while scrolled away").not.toBeNull();
    expect(awayGroundBox, "ground layer has no box while scrolled away").not.toBeNull();
    expect(boxContains(awayStageBox!, awaySkyBox!)).toBe(true);
    expect(boxContains(awayStageBox!, awayGroundBox!)).toBe(true);

    // The story kept advancing the whole time nobody was looking — a season
    // beat is 2s (`SEASON_MS`), so a caption change here can only mean the
    // master clock auto-advanced while off-screen, not that scrolling away
    // paused or ended it.
    await expect(status).not.toHaveText(beforeScroll ?? "", { timeout: 3_000 });

    // Scroll back to the stage itself — not necessarily the top of the page,
    // since the tree section is not the first thing on it — the show is
    // still going, not restarted and not ended.
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toBeVisible({ timeout: PLAYER_MOUNT_TIMEOUT });
    await expect(stage).toBeInViewport();

    // Contained again, back on screen: both layers travelled with the stage
    // in both directions, never left pinned to some other position.
    const backStageBox = await stage.boundingBox();
    const backSkyBox = await sky.boundingBox();
    const backGroundBox = await ground.boundingBox();
    expect(backStageBox, "stage has no box after scrolling back").not.toBeNull();
    expect(backSkyBox, "sky layer has no box after scrolling back").not.toBeNull();
    expect(backGroundBox, "ground layer has no box after scrolling back").not.toBeNull();
    expect(boxContains(backStageBox!, backSkyBox!)).toBe(true);
    expect(boxContains(backStageBox!, backGroundBox!)).toBe(true);

    // And it still ends cleanly, the same as every other exit path.
    await page.keyboard.press("Escape");
    await expect(stage).toHaveCount(0);
    await expect(page.locator("[data-origin-pending]")).toHaveCount(0);
    await expect(page.locator("[data-origin-running]")).toHaveCount(0);
  });
});
