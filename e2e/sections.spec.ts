import { test, expect, type Locator, type Page } from "@playwright/test";
import { careerEntries, codeTabs, projects } from "../src/content/portfolio";

// Matches the `lg:` breakpoint (1024px) that switches several sections'
// desktop/mobile presentations, e.g. the career tree's drawn figure vs. its
// indented-list fallback.
const DESKTOP_MIN_WIDTH = 1024;

/**
 * Where a per-entry fragment comes to rest: `scroll-mt-20` (80px) on the
 * landing span `Stage.tsx` renders for it, which is the 4rem sticky header
 * plus a rem of air.
 */
const ENTRY_RESTING_TOP = 80;
/** A pixel or two of sub-pixel rounding, and nothing like enough to hide a
 *  scroll that stopped somewhere else entirely. */
const RESTING_TOLERANCE = 2;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

function viewportHeight(page: Page): number {
  return page.viewportSize()?.height ?? 0;
}

/**
 * The element's offset from the top of the viewport once it has stopped
 * moving.
 *
 * Deliberately not `expect.poll`: that returns on its first *passing* sample,
 * so a threshold assertion on a smooth scroll passes at whatever point the
 * scroll happens to be sampled at — a regression that parked the entry at
 * 400px would satisfy `>= 64` on the way past and never be seen. This polls
 * for stability instead: the same rounded offset three reads running, and
 * only then is it handed back to be asserted against the one number the
 * contract actually names.
 */
async function restingTop(element: Locator): Promise<number> {
  const read = () => element.evaluate((node) => Math.round(node.getBoundingClientRect().top));
  // Never accept a rest before the scroll has had a chance to start: with
  // JavaScript on, the stage re-lands a fragment only once it has gone live,
  // which is after the browser's own first landing.
  await element.page().waitForTimeout(250);
  let stable = 0;
  let previous = await read();
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await element.page().waitForTimeout(100);
    const next = await read();
    stable = next === previous ? stable + 1 : 0;
    previous = next;
    if (stable >= 2) return next;
  }
  throw new Error(`element never stopped scrolling (last offset ${previous}px)`);
}

function expectSettledAtScrollMargin(top: number, message: string) {
  expect(top, message).toBeGreaterThanOrEqual(ENTRY_RESTING_TOP - RESTING_TOLERANCE);
  expect(top, message).toBeLessThanOrEqual(ENTRY_RESTING_TOP + RESTING_TOLERANCE);
}

test.beforeEach(async ({ page }) => {
  // Playwright retries clicks until an element is actionable, but it dispatches
  // key presses immediately and reads the DOM immediately. Both race React's
  // hydration on a page this long. `networkidle` was the old approximation of
  // "the islands are live now", and under full-matrix dev-server load it lied
  // often enough to flake a different click-based test on each run (hero tabs,
  // case-study disclosures — round 12's integration log has the tally).
  // `html[data-ink-ready]` is the real signal: InkReveal stamps it from a
  // client effect, and effects only flush after the hydration pass that
  // attaches every island's handlers has committed.
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Every test in this file runs with JavaScript on and motion allowed, the
  // two conditions under which InkReveal stamps the attribute. (A
  // "without JavaScript" describe used to share this hook and needed a guard
  // here; it went with the tree figure's page-load reveal it tested, and the
  // no-JS landing is `e2e/legacy-anchors.spec.ts`'s now.)
  await page.waitForSelector("html[data-ink-ready]", { timeout: 30_000 });
});

test.describe("hero", () => {
  test("exactly one h1 renders on the page", async ({ page }) => {
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("code artifact tabs switch panels via mouse and keyboard", async ({ page }) => {
    const tablist = page.getByRole("tablist", { name: "Code artifact tabs" });
    const tabs = tablist.getByRole("tab");
    // Exactly the authored code tabs. Through round 17 a fourth, "Ask
    // Thien", rode the same tablist; round 18 moved the chat to Contact's
    // `#ask`, and its behaviour is pinned in e2e/ask.spec.ts.
    await expect(tabs).toHaveCount(codeTabs.length);

    // Click-and-verify as one retried unit: `networkidle` in beforeEach only
    // approximates "the islands are live" (its own comment says so), and
    // under full-matrix dev-server load a click can land on a tablist React
    // has not attached to yet — the click succeeds, nothing flips, and a
    // plain assertion waits on state that will never arrive. Retrying the
    // click keeps the contract honest: a genuinely broken switch still
    // fails after the timeout.
    await expect(async () => {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true", { timeout: 1000 });
    }).toPass({ timeout: 15_000 });
    await expect(page.getByRole("region", { name: codeTabs[1].filename })).toBeVisible();

    await tabs.nth(1).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(2)).toBeFocused();

    await page.keyboard.press("Home");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("region", { name: codeTabs[0].filename })).toBeVisible();
  });
});

// Selected Work was deleted in round 18; its case studies render inside the
// Journey's branches. The ones that are not inside a branch (the coursework and
// the capstone) are always in the document, which is what makes them the one
// place this can be exercised without first opening a branch.
test.describe("case studies", () => {
  test("a case-study disclosure expands and collapses; collapsed content is not reachable by Tab", async ({
    page,
  }) => {
    const work = page.locator("#tree [data-unbranched-case-studies]");
    const trigger = work.getByRole("button", { name: /Read the full case study/ }).first();
    const panelId = await trigger.getAttribute("aria-controls");

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(work.getByRole("heading", { name: "Problem", level: 4 }).first()).toBeVisible();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(work.getByRole("heading", { name: "Problem", level: 4 }).first()).toBeHidden();

    await trigger.focus();
    await page.keyboard.press("Tab");
    const stillInsidePanel = await page.evaluate((id) => {
      const panel = id ? document.getElementById(id) : null;
      return panel ? panel.contains(document.activeElement) : false;
    }, panelId);
    expect(stillInsidePanel, "Tab from the collapsed trigger must not land inside its panel").toBe(false);
  });
});

test.describe("screen recordings", () => {
  const recorded = projects.filter((project) => project.recording);

  test("a full scroll, Journey stage included, requests nothing from /media/", async ({ page }) => {
    const media: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/media/")) media.push(request.url());
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = Math.max(200, Math.floor(viewportHeight(page) / 2));
    for (let y = 0; y <= height; y += step) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(40);
    }
    await page.waitForLoadState("networkidle");

    expect(await page.locator("#tree video").count(), "no <video> before a press").toBe(0);
    expect(media, "nothing under /media/ may load until a visitor asks").toEqual([]);
  });

  test("pressing play on a closed case study requests one mp4 and one poster", async ({ page }) => {
    expect(recorded.length, "no project carries a recording").toBeGreaterThan(0);
    const project = recorded[0];
    const media: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/media/")) media.push(new URL(request.url()).pathname);
    });

    const article = page.locator(`#work-${project.id}`);
    const trigger = article.getByRole("button", { name: /Read the full case study/ });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(article.locator("video")).toHaveCount(0);
    expect(media, "nothing loads before the press").toEqual([]);

    await article.getByRole("button", { name: "Play the screen recording" }).click();
    const video = article.locator("video");
    await expect(video).toHaveCount(1);
    await expect(trigger, "the press does not open the disclosure").toHaveAttribute("aria-expanded", "false");
    await expect(video).toHaveAttribute("aria-label", `${project.title} \u2014 screen recording`);
    await expect.poll(() => media.filter((url) => url.endsWith(".mp4")).length).toBe(1);
    await page.waitForLoadState("networkidle");

    expect(media.filter((url) => url.endsWith(".mp4"))).toEqual([`/media/${project.recording}.mp4`]);
    expect(media.filter((url) => url.endsWith(".jpg"))).toEqual([`/media/${project.recording}.jpg`]);
  });
  // Food Route has no case study: its button sits under its line of the
  // credentials strip. Any recording added later is picked up from content.
  const recordedEntries = careerEntries.filter((entry) => entry.recording);

  test("the entries' recordings are found in content", () => {
    expect(recordedEntries.map((entry) => entry.recording)).toEqual(expect.arrayContaining(["foodroute", "mentorhub"]));
  });

  for (const entry of recordedEntries) {
    test(`pressing play on ${entry.role} requests one mp4 and one poster`, async ({ page }) => {
      const media: string[] = [];
      page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/media/")) media.push(new URL(request.url()).pathname);
      });

      const button = page.getByRole("button", { name: `Play the screen recording of ${entry.role}` });
      // Not `li:has(button)`: the press replaces the button with the video.
      const line = page.locator("[data-credentials-strip] li", { hasText: entry.role });
      await button.scrollIntoViewIfNeeded();
      await expect(line.locator("video")).toHaveCount(0);
      expect(media, "nothing loads before the press").toEqual([]);

      await button.click();
      const video = line.locator("video");
      await expect(video).toHaveCount(1);
      await expect(video).toHaveAttribute("aria-label", `${entry.role} — screen recording`);
      await expect(video).toHaveAccessibleDescription(entry.recordingDescription ?? "");
      await expect.poll(() => media.filter((url) => url.endsWith(".mp4")).length).toBe(1);
      await page.waitForLoadState("networkidle");

      expect(media.filter((url) => url.endsWith(".mp4"))).toEqual([`/media/${entry.recording}.mp4`]);
      expect(media.filter((url) => url.endsWith(".jpg"))).toEqual([`/media/${entry.recording}.jpg`]);
    });
  }
});

/**
 * The Journey (`#tree`). Round 18 replaced what this block used to test — a
 * "Tree / List" toggle over a filterable chronological timeline, a
 * hover/focus cross-highlight island, root labels under a plinth, and a
 * page-load ink reveal on the figure's wrapper — with one pinned stage
 * (src/sections/CareerTree/Stage.tsx). Every test whose subject went with
 * those was deleted rather than kept green against nothing; what is left is
 * the behaviour that survived in some form: the section and its oldest
 * compatibility id, which presentation shows at which width, the list's
 * decorative ink, a branch panel's disclosure (which now holds the case
 * studies built in that role), a cold-loaded per-entry fragment, and the
 * unfinished shoot.
 *
 * The stage only pins at >=1280px with motion allowed, and while it is pinned
 * a branch the acts have not reached is `pointer-events: none` inside a
 * clipped frame. Any test here that clicks into the drawing goes through
 * `showTheFinishedTree` first — the same route a reader takes, and the same
 * helper `e2e/origin.spec.ts` uses.
 */
test.describe("career tree", () => {
  /** Whether the Journey's stage is pinned right now, asked the way
   *  `Stage.tsx` asks it before releasing the pin — so this never becomes a
   *  second copy of the media query in `globals.css`. */
  async function stageIsPinned(page: Page): Promise<boolean> {
    return page
      .locator("#tree [data-stage-pin]")
      .evaluate((element) => getComputedStyle(element).position === "sticky");
  }

  /** Release the pin if it is in force, so the whole drawing is in normal
   *  flow and every branch can be scrolled to and pressed. A no-op wherever
   *  the pin never engages (below 1280px), where the stage is already the
   *  finished tree. */
  async function showTheFinishedTree(page: Page): Promise<void> {
    if (!(await stageIsPinned(page))) return;
    await page.locator("#tree").getByRole("button", { name: "Show me the whole tree" }).click();
    await expect(page.locator("#tree [data-stage]")).toHaveAttribute("data-released", "");
  }

  /** The entry the branch-panel tests open: the role with the most case
   *  studies, so the panel has real focusable content inside it. */
  const PANEL_ENTRY = "doordash";
  const PANEL_STUDIES = projects.filter((project) => project.careerEntryId === PANEL_ENTRY).length;
  if (PANEL_STUDIES === 0) {
    throw new Error(`content fixture assumption failed: no case study belongs to "${PANEL_ENTRY}"`);
  }

  /** The branch's own disclosure trigger in whichever presentation is on
   *  screen: the drawing's panel at >=1024px, the list's row below it. */
  function branchTrigger(page: Page, entryId: string): Locator {
    const prefix = viewportWidth(page) >= DESKTOP_MIN_WIDTH ? "tree-branch-" : "tree-list-branch-";
    return page.locator(`#tree #${prefix}${entryId}-trigger`);
  }

  test("the section renders and still answers #journey", async ({ page }) => {
    await expect(page.locator("#tree")).toBeVisible();
    // Not visible — it is a zero-size landing target (see CareerTree.tsx) —
    // but it must exist, and exactly once, or an old bookmark goes nowhere.
    // Where it lands is `e2e/legacy-anchors.spec.ts`'s job.
    await expect(page.locator("#journey")).toHaveCount(1);
  });

  test("the drawing shows at >=1024px with the list hidden, and the reverse below it", async ({
    page,
  }) => {
    const tree = page.locator("#tree");

    // The drawn presentation's branch panels end their accessible name in
    // "Show detail — …" and the list presentation's own branch toggles end
    // theirs in "Show what … involved" (Disclosure appends the label after
    // the summary text) — two different controls with two different
    // accessible names, so a substring match on either is a reliable "which
    // presentation is actually on the page" probe. `CareerTree.tsx` hides one
    // of the two at every width (`hidden lg:block` / `lg:hidden`).
    const drawingBranch = tree.getByRole("button", { name: /Show detail — / }).first();
    const listBranch = tree.getByRole("button", { name: /Show what .+ involved/ }).first();

    if (viewportWidth(page) >= DESKTOP_MIN_WIDTH) {
      await expect(drawingBranch).toBeVisible();
      await expect(listBranch).toBeHidden();
    } else {
      await expect(drawingBranch).toBeHidden();
      await expect(listBranch).toBeVisible();
    }
  });

  /*
   * Round 13: the mobile/AT list gets its own drawn ink (a trunk, a curved
   * bough per row, year rings, a "still growing" tip) — see
   * src/sections/CareerTree/list-ink.tsx. It is meant to be pure decoration
   * layered onto the accessible list: this test proves that rather than
   * trusting it, by checking every drawn piece is `aria-hidden` and that the
   * list's own accessible controls — one "Show what … involved" button per
   * drawn branch — are unaffected by any of it.
   */
  test("the list's drawn ink is pure decoration layered onto the same accessible list", async ({
    page,
  }) => {
    test.skip(
      viewportWidth(page) >= DESKTOP_MIN_WIDTH,
      "this ink only exists in KnowledgeTreeList.tsx, the <1024px presentation — see list-ink.tsx",
    );
    const tree = page.locator("#tree");

    // Either wording: the very first (oldest) branch defaults open, so its
    // own trigger already reads "Hide what … involved" rather than "Show
    // what … involved" — see KnowledgeTreeList.tsx's `defaultOpen`.
    const branchButtons = tree.getByRole("button", { name: /(Show|Hide) what .+ involved/ });
    const branchCount = await branchButtons.count();
    expect(branchCount, "expected at least one career entry in the list").toBeGreaterThan(0);

    // One continuous trunk …
    const trunk = tree.locator("[data-tree-list-trunk]");
    await expect(trunk).toHaveCount(1);
    await expect(trunk).toHaveAttribute("aria-hidden", "true");

    // … one bough per row, joining it to the trunk …
    const boughs = tree.locator('[data-tree-list-part="bough"]');
    await expect(boughs).toHaveCount(branchCount);
    for (const bough of await boughs.all()) {
      await expect(bough).toHaveAttribute("aria-hidden", "true");
    }

    // … and one growing tip at the newest end.
    const tip = tree.locator("[data-tree-list-tip]");
    await expect(tip).toHaveCount(1);
    await expect(tip).toHaveAttribute("aria-hidden", "true");
    await expect(tip.locator("[data-tree-list-shoot-label]")).toHaveText(/still growing/i);

    // None of it changed how many accessible controls the list itself
    // exposes.
    await expect(branchButtons).toHaveCount(branchCount);
  });

  /*
   * Through round 17 an opened branch panel linked out to its case study in
   * the Selected Work section; round 18 deleted that section and put the case
   * studies inside the panel itself, in full. So the panel's payload is now
   * the articles, and that is what this asserts — in whichever presentation
   * is on screen, since both carry them.
   */
  test("opening a branch panel reveals the case studies built in that role", async ({ page }) => {
    await showTheFinishedTree(page);
    const trigger = branchTrigger(page, PANEL_ENTRY);
    await expect(trigger, `expected a branch trigger for "${PANEL_ENTRY}"`).toHaveCount(1);
    await trigger.scrollIntoViewIfNeeded();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const panelId = await trigger.getAttribute("aria-controls");
    expect(panelId, "Disclosure trigger must expose aria-controls").toBeTruthy();
    const panel = page.locator(`#${panelId}`);

    // Every case study authored against this entry, each one a real article,
    // and no fewer — a panel that rendered one of two would still have "a"
    // case study in it.
    const articles = panel.locator('article[id^="work-"]');
    await expect(articles).toHaveCount(PANEL_STUDIES);
    await expect(articles.first()).toBeVisible();

    // The drawn panel also carries the kind and date range, which the list
    // shows in its always-visible summary instead.
    if (viewportWidth(page) >= DESKTOP_MIN_WIDTH) {
      await expect(panel.getByText(/Role · /)).toBeVisible();
    }
  });

  /*
   * The same property the old timeline-link test held a branch panel to,
   * with the panel's new contents as its subject: what is inside a collapsed
   * panel — now the case studies' own "Read the full case study" triggers —
   * is out of the tab order until the panel is opened, so twenty-odd hidden
   * controls do not become twenty-odd tab stops.
   */
  test("a branch panel's case studies are in the tab order only while that panel is open", async ({
    page,
  }) => {
    await showTheFinishedTree(page);
    const trigger = branchTrigger(page, PANEL_ENTRY);
    await expect(trigger, `expected a branch trigger for "${PANEL_ENTRY}"`).toHaveCount(1);
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    const panelId = await trigger.getAttribute("aria-controls");
    expect(panelId, "Disclosure trigger must expose aria-controls").toBeTruthy();
    const inner = page
      .locator(`#${panelId}`)
      .getByRole("button", { name: /Read the full case study/, includeHidden: true });
    await expect(inner).toHaveCount(PANEL_STUDIES);

    // Collapsed: Disclosure holds its panel at `visibility: hidden`, which
    // takes everything inside it out of the tab order and the accessibility
    // tree both.
    await expect(inner.first()).toBeHidden();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(inner.first()).toBeVisible();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(inner.first()).toBeHidden();

    // Hidden is the mechanism; out of the tab order is the point. Same probe
    // the case-study disclosure test at the top of this file uses.
    await trigger.focus();
    await page.keyboard.press("Tab");
    const landedInPanel = await page.evaluate((id) => {
      const panel = id ? document.getElementById(id) : null;
      return panel ? panel.contains(document.activeElement) : false;
    }, panelId);
    expect(landedInPanel, "Tab from a collapsed branch panel must not reach inside it").toBe(false);
  });

  /*
   * A per-entry fragment, cold-loaded with JavaScript ON. Through round 17
   * `#journey-entry-<id>` was a timeline `<li>` that the page focused on
   * arrival; the timeline is gone, and the id is now a zero-size,
   * `aria-hidden` landing span inside the act that draws the entry
   * (Stage.tsx). Nothing focuses it — there is nothing there to read, and the
   * act's own text follows — so the old `toBeFocused()` had lost its subject;
   * what survives is the landing itself.
   *
   * `e2e/legacy-anchors.spec.ts` proves the same landing with JavaScript
   * disabled. This is the other half: with scripts running, the stage goes
   * live after the browser has already scrolled, and at >=1280px it reshapes
   * the page into the pinned layout under the reader — `Stage.tsx` re-lands
   * the fragment once it has. That re-landing is what this would catch.
   */
  test("a cold load of an entry's fragment lands on its act, clear of the header", async ({
    page,
  }) => {
    // Three page loads (the file's own, about:blank, the fragment) plus a
    // stability poll: measured at 28.6s against `next dev` at 1440px, and over
    // the 30s default at 375px under load. The budget follows the work.
    test.slow();
    expect(
      careerEntries.some((entry) => entry.id === PANEL_ENTRY),
      `${PANEL_ENTRY} is no longer a career entry, so this probe checks nothing`,
    ).toBe(true);
    const fragment = `journey-entry-${PANEL_ENTRY}`;

    // A real cold load, not a hash hop. The file-level beforeEach has already
    // loaded "/", so going straight to the fragment from here would be a
    // same-document hash navigation — a different story from this test's
    // name, and one where Next's dev router intermittently drops the
    // fragment before `hashchange` ever fires (measured: location.hash === ""
    // at failure, 10/12 repeats). Interposing about:blank makes the next
    // goto a genuine fresh document load.
    await page.goto("about:blank");
    await page.goto(`/#${fragment}`);
    await page.waitForLoadState("networkidle");

    const anchor = page.locator(`#${fragment}`);
    await expect(anchor).toHaveCount(1);
    expectSettledAtScrollMargin(
      await restingTop(anchor),
      "a cold load must settle the entry's fragment at its 80px scroll margin",
    );
    // And the act that draws the entry is what the reader is looking at.
    await expect(anchor.locator("xpath=ancestor::section[@data-act]")).toBeInViewport();
  });

  /*
   * Ruling 84: going live is a cut, not a fade. Until the stage is live the
   * page is the finished tree; going live drops every branch the first act
   * has not reached to `opacity: 0`. With the fade's transition already in
   * force that played as half a second of the tree un-growing on every load —
   * and axe, landing inside it, measured a branch at ~1.05:1. `Stage.tsx` now
   * holds every transition until `data-stage-settled`, so two frames after
   * going live an unreached branch is already fully transparent, not 0.9 of
   * the way through a fade. Measured from an init script, because the window
   * this is about closes before any locator could look at it.
   */
  test("going live hides the unreached branches at once rather than fading them", async ({ page }) => {
    test.skip(viewportWidth(page) < 1280, "the pin, and its fade, only engage at >=1280px");
    await page.addInitScript(() => {
      const record = window as unknown as { __firstLive?: string };
      new MutationObserver((mutations, observer) => {
        const root = mutations
          .map((mutation) => mutation.target)
          .find(
            (target): target is HTMLElement =>
              target instanceof HTMLElement && target.hasAttribute("data-stage-live"),
          );
        if (!root) return;
        observer.disconnect();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const through = Number(root.dataset.through);
            const unreached = Array.from(root.querySelectorAll<HTMLElement>("[data-branch-act]")).filter(
              (branch) => Number(branch.dataset.branchAct) > through,
            );
            const opacities = unreached.map((branch) => Number(getComputedStyle(branch).opacity));
            record.__firstLive = `${unreached.length} unreached, max opacity ${Math.max(0, ...opacities)}`;
          }),
        );
      }).observe(document, { attributes: true, attributeFilter: ["data-stage-live"], subtree: true });
    });
    await page.goto("about:blank");
    await page.goto("/");
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __firstLive?: string }).__firstLive ?? ""))
      .toMatch(/unreached/);
    const reading = await page.evaluate(() => (window as unknown as { __firstLive?: string }).__firstLive ?? "");
    const [count] = reading.split(" ");
    expect(Number(count), `no unreached branch to measure: ${reading}`).toBeGreaterThan(0);
    expect(reading).toMatch(/max opacity 0$/);
  });

  /*
   * The year scrubber, pressed the way an impatient reader presses it. Each
   * ArrowRight scrolls its act to the centre at once, and the stage's
   * IntersectionObserver reports crossings a frame or two later — so a report
   * computed before the latest press's scroll used to land after it and set
   * the act back: three fast presses stopped on act 1 or 2 instead of 3, and
   * one trial left the page on act 4 with the drawing showing act 2. The year
   * label, the drawing (`data-through`), the act marked current and the act
   * actually under the middle of the screen must all agree once it settles.
   * Only where the pin engages (>=1280px, motion allowed): everywhere else the
   * scrubber is not shown.
   */
  test("fast presses on the year scrubber land where the page is", async ({ page }) => {
    test.skip(viewportWidth(page) < 1280, "the scrubber only exists while the stage is pinned");
    const stage = page.locator("#tree [data-stage]");
    await stage.scrollIntoViewIfNeeded();
    await expect.poll(() => stageIsPinned(page)).toBe(true);
    const scrubber = page.locator("#tree").getByRole("slider", { name: /year/i });
    await scrubber.focus();
    await page.keyboard.press("Home");
    await expect(stage).toHaveAttribute("data-through", "0");
    // Let the scroll Home caused finish reporting before the presses start.
    await page.waitForTimeout(500);

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    /** Everything that says which act is current, read in one go. */
    const readings = () =>
      page.evaluate(() => {
        const root = document.querySelector<HTMLElement>("#tree [data-stage]");
        const acts = Array.from(document.querySelectorAll<HTMLElement>("#tree [data-stage] [data-act]"));
        const middle = window.innerHeight / 2;
        const underMiddle = acts.findIndex((act) => {
          const box = act.getBoundingClientRect();
          return box.top <= middle && box.bottom > middle;
        });
        const marked = acts.findIndex((act) => act.getAttribute("aria-current") === "step");
        const slider = document.querySelector<HTMLInputElement>('#tree [data-stage-scrub] input[type="range"]');
        return `through=${root?.dataset.through} slider=${slider?.value} marked=${marked} underMiddle=${underMiddle}`;
      });
    // Settled means the same reading three times running, 200ms apart — long
    // enough for any report still in flight to have been delivered.
    let previous = "";
    let stable = 0;
    for (let attempt = 0; attempt < 40 && stable < 3; attempt += 1) {
      await page.waitForTimeout(200);
      const next = await readings();
      stable = next === previous ? stable + 1 : 0;
      previous = next;
    }
    expect(previous).toBe("through=3 slider=3 marked=3 underMiddle=3");
  });

  /*
   * The always-on change from the origin-story plan's Task 2 that survives:
   * the drawing never claims to be finished — an unfinished shoot,
   * annotated. (Its other half, the root plinth drawn as ground rather than
   * as a card, went with the plinth in round 18.)
   */
  test("the unfinished shoot draws with its still-growing annotation", async ({ page }) => {
    test.skip(
      viewportWidth(page) < DESKTOP_MIN_WIDTH,
      "below 1024px the drawn presentation is display: none",
    );

    const tree = page.locator("#tree");
    await expect(tree.locator("[data-tree-shoot]")).toHaveCount(1);
    // Round 13 gave the mobile list its own "still growing" tip
    // (KnowledgeTreeList.tsx's `ListGrowingTip`, see list-ink.tsx) — a
    // second element carrying this same text now exists in the DOM at every
    // width, just `display: none` here since the drawn presentation is what
    // shows at >=1024px. `:visible` scopes the count to whichever
    // presentation is actually on screen.
    await expect(
      tree.locator("[data-tree-shoot-label]:visible, [data-tree-list-shoot-label]:visible"),
    ).toHaveCount(1);
  });
});

/*
 * Stage.tsx says a fragment landing again once the pin has reshaped the page,
 * for targets inside the stage and below it (Contact, `#ask`). It must do that
 * only when the browser actually landed on the fragment: a reload restores the
 * reader's own scroll position, and re-landing then would yank them away.
 */
test.describe("fragment landings around the Journey", () => {
  test("a cold load of /#ask lands on it, after the pin has reshaped the page", async ({ page }) => {
    test.skip(viewportWidth(page) < DESKTOP_MIN_WIDTH, "the pin only reshapes the page from lg up");
    await page.goto("about:blank");
    await page.goto("/#ask");
    await expect(page.locator("#tree [data-stage]")).toHaveAttribute("data-stage-settled", "");
    await page.waitForLoadState("networkidle");
    expectSettledAtScrollMargin(
      await restingTop(page.locator("#ask")),
      "a cold load must settle #ask at its 80px scroll margin",
    );
  });

  test("a reload after scrolling away from the fragment does not jump back to it", async ({ page }) => {
    test.skip(viewportWidth(page) < DESKTOP_MIN_WIDTH, "the pin only reshapes the page from lg up");
    await page.goto("about:blank");
    await page.goto("/#contact");
    await expect(page.locator("#tree [data-stage]")).toHaveAttribute("data-stage-settled", "");

    // Read somewhere else: the Worlds section, far above Contact.
    await page.locator("#worlds").evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(500);
    const before = await page.evaluate(() => window.scrollY);

    await page.reload();
    await expect(page.locator("#tree [data-stage]")).toHaveAttribute("data-stage-settled", "");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Not vacuous: Contact really is far from where the reader was.
    const contactTop = await page.locator("#contact").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(contactTop)).toBeGreaterThan(1000);
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before), "the reload jumped the reader").toBeLessThan(50);
  });
});
