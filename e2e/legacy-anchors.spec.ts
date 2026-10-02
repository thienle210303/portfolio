import { test, expect, type Locator, type Page } from "@playwright/test";
import { careerEntries, projects } from "../src/content/portfolio";
import {
  caseStudyAnchorId,
  journeyEntryAnchorId,
  LEGACY_SECTION_IDS,
} from "../src/sections/CareerTree/anchors";

/**
 * Every retired URL still lands — **with JavaScript disabled**.
 *
 * `#work`, `#skills`, `#workshop`, `#journey`, `journey-entry-<id>` and the
 * case-study fragments were all live on this site at some point. They are in
 * bookmarks, possibly in a résumé PDF that has been emailed to people, and
 * possibly in a search index, and none of those can be edited. A fragment that
 * resolves to nothing is the quietest failure a page has: the browser simply does
 * nothing.
 *
 * ## Why this spec exists and a unit test does not replace it
 *
 * `tests/sections/CareerTree.test.tsx` and `tests/sections/Stage.test.tsx`
 * already assert the elements are in the render. They cannot assert the thing
 * that actually matters, because jsdom has no layout and no fragment
 * navigation: that a real browser, running **none** of this page's JavaScript,
 * receives those ids in the document it is served and scrolls to them. The three
 * parts below are deliberately different kinds of evidence:
 *
 *  1. **The served HTML.** Fetched over HTTP, parsed by nobody, scripts never
 *     started. If an id is in that byte stream it exists for a no-JS visitor by
 *     construction — this is the strongest form the claim has, and it is also the
 *     only part that scales to the whole retired set (the four section ids, every
 *     per-entry fragment and every `work-<projectId>`), including the per-entry
 *     fragments inside acts that are off screen.
 *  2. **The landing, measured.** A browser context with `javaScriptEnabled:
 *     false`, navigated straight at the fragment, and then asked **where** the
 *     anchor came to rest — not merely whether the Journey is somewhere on
 *     screen. `#tree` spans most of the document, so "`#tree` in viewport" is
 *     satisfied by a landing anywhere in the Journey and an 80px offset error
 *     changes nothing about it; the resting offset is the only thing that can
 *     catch a missing or wrong `scroll-mt`, which is the whole reason the
 *     anchors carry one. `RESTING_TOP` is `5rem`, the act's own
 *     `scroll-margin-top` in `globals.css`.
 *  3. **A control.** A fragment that resolves to nothing must leave the page
 *     where it started. Without it, every assertion above could be satisfied by
 *     a page that simply happened to open at the Journey.
 *
 * Nothing here may pass vacuously: every loop counts what it checked and asserts
 * the count, with a message saying what a green run would otherwise have proved.
 *
 * ## What runs at every width, and what runs once
 *
 * The suite runs this file under six viewport projects. Only part 1 is gated,
 * to `chromium-1440`: it reads bytes over HTTP with the `request` fixture, and
 * the HTML a server sends does not depend on a viewport the request never had.
 * Every landing test stays at all six widths, because where an anchor comes to
 * rest is geometry, and geometry is exactly what a width changes. The four
 * section ids are one test with a soft assertion per id rather than four tests
 * — four page loads either way, but one test's setup instead of four, and a
 * failure still names the id it failed on.
 *
 * ## Why this spec and not `e2e/fragments.spec.ts`
 *
 * That sweep reads `main a[href^="#"]` — the links the page itself renders.
 * Nothing on this page links to any fragment this spec covers — not the section
 * ids, not the per-entry fragments, and not the case-study `work-<projectId>`
 * ids either, which round 18 stopped linking when the Selected Work section and
 * its index went. They exist for inbound links the site does not control, so
 * the sweep cannot see them and this spec is their **only** coverage: an id
 * dropped from `ALL_LEGACY_IDS` below is an id nothing checks at all. Unlinked
 * is not unused — do not remove one from here, or from the page, for that
 * reason.
 */

/** The offset from the top of the viewport an anchor must come to rest at:
 *  `5rem`, which is `scroll-mt-20` and the `scroll-margin-top` globals.css gives
 *  `[data-stage] [data-act]`. The sticky header is 4rem, so this clears it. */
const RESTING_TOP = 80;
/** Sub-pixel rounding, and nothing like enough to hide a landing that stopped
 *  somewhere else — the header alone is 64px. */
const RESTING_TOLERANCE = 2;

/** Every fragment this spec is responsible for. */
const ALL_LEGACY_IDS = [
  ...LEGACY_SECTION_IDS,
  ...careerEntries.map((entry) => journeyEntryAnchorId(entry.id)),
  // Round 18's brief names these alongside the rest. The id is `work-<projectId>`
  // (`caseStudyAnchorId`) rather than `case-study-<id>`, which is the namespace
  // `Disclosure` derives its own `-trigger`/`-panel` ids in — see the note in
  // `src/sections/CareerTree/anchors.ts` about why they are one suffix apart.
  ...projects.map((project) => caseStudyAnchorId(project.id)),
];

/**
 * The element's offset from the top of the viewport once it has stopped moving.
 *
 * Polls for *stability* rather than for a passing value, the same way
 * `e2e/sections.spec.ts` does and for the same reason: returning on the first
 * sample that satisfies a threshold means a landing that sailed past the right
 * offset on its way somewhere else would be recorded as correct.
 */
async function restingTop(element: Locator): Promise<number> {
  const read = () => element.evaluate((node) => Math.round(node.getBoundingClientRect().top));
  await element.page().waitForTimeout(150);
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

function expectSettledAtRestingTop(top: number, message: string) {
  expect(top, message).toBeGreaterThanOrEqual(RESTING_TOP - RESTING_TOLERANCE);
  expect(top, message).toBeLessThanOrEqual(RESTING_TOP + RESTING_TOLERANCE);
}

/** How far down the document the browser is. Read with `page.evaluate`, which
 *  works in a `javaScriptEnabled: false` context — Playwright's own evaluation
 *  is not the page's scripting (checked, not assumed). */
function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => Math.round(window.scrollY));
}

test.describe("retired URLs, with JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });

  test("the served HTML carries every retired fragment id", async ({ request }, testInfo) => {
    test.skip(
      testInfo.project.use.viewport?.width !== 1440,
      "behaviour is viewport-independent; run once",
    );
    // Triple the timeout: this is usually the first request a run makes, and
    // against `next dev` the first render of `/` compiles the route — measured
    // here streaming a 200 for longer than the 30s default while other workers
    // held the server. Nothing about the assertion is slow.
    test.slow();
    const response = await request.get("/");
    expect(response.status(), "the page did not render").toBe(200);
    const html = await response.text();

    // Not vacuous: a content layer with no entries or no projects would shrink
    // the list to the four section ids, so the composition is asserted too.
    expect(
      careerEntries.length,
      "no career entries, so no per-entry fragment was checked",
    ).toBeGreaterThan(0);
    expect(projects.length, "no projects, so no case-study fragment was checked").toBeGreaterThan(0);
    expect(ALL_LEGACY_IDS.length).toBe(
      LEGACY_SECTION_IDS.length + careerEntries.length + projects.length,
    );

    const missing = ALL_LEGACY_IDS.filter((id) => !html.includes(`id="${id}"`));
    expect(
      missing,
      `${missing.length} retired fragment ids are absent from the server-rendered HTML, so a bookmark to them lands nowhere without JavaScript`,
    ).toEqual([]);

    // Each one exactly once. A duplicate id is a different bug with the same
    // symptom — the browser lands on whichever came first, which may not be the
    // one that was meant. The trailing quote in the needle is load-bearing:
    // without it `id="work-x"` would match inside `id="work-x-trigger"`.
    const duplicated = ALL_LEGACY_IDS.filter(
      (id) => html.split(`id="${id}"`).length - 1 !== 1,
    );
    expect(duplicated, "a retired fragment id appears more than once").toEqual([]);

    console.log(
      `[legacy-anchors] ${ALL_LEGACY_IDS.length} ids found exactly once in the no-JS HTML: ${ALL_LEGACY_IDS.join(" ")}`,
    );
  });

  test("a fragment that resolves to nothing leaves the page where it opened", async ({ page }) => {
    // The control for every landing assertion below. Without it they could all
    // be satisfied by a page that simply opens at the Journey, and the whole
    // spec would prove nothing about scrolling.
    await page.goto("/#no-such-anchor-at-all");
    await expect(page.locator("#about")).toBeInViewport();
    await expect(page.locator("#tree")).not.toBeInViewport();
    expect(await scrollY(page), "a dead fragment scrolled the page").toBe(0);
  });

  test("every retired section id lands a scriptless browser on the Journey, at the header offset", async ({
    page,
  }) => {
    // Four fresh page loads in one test, each followed by a stability poll,
    // where each used to have a test (and a 30s budget) of its own — measured
    // running out of the default budget against `next dev` under the full
    // matrix. The budget follows the work; nothing about the assertion is slow.
    test.slow();
    expect(
      LEGACY_SECTION_IDS.length,
      "no retired section ids, so no landing was checked",
    ).toBeGreaterThan(0);

    let checked = 0;
    for (const id of LEGACY_SECTION_IDS) {
      // A fresh document per id: going from `/#journey` straight to `/#work`
      // would be a same-document hop between two co-located spans, which
      // could look like a landing without the second one doing anything.
      await page.goto("about:blank");
      await page.goto(`/#${id}`);

      const anchor = page.locator(`#${id}`);
      await expect.soft(anchor, `/#${id} is not in the document exactly once`).toHaveCount(1);
      // Where it stopped, not just that the Journey is somewhere on screen.
      const top = await restingTop(anchor);
      const message = `/#${id} must settle at the ${RESTING_TOP}px scroll margin, clear of the sticky header (stopped at ${top}px)`;
      expect.soft(top, message).toBeGreaterThanOrEqual(RESTING_TOP - RESTING_TOLERANCE);
      expect.soft(top, message).toBeLessThanOrEqual(RESTING_TOP + RESTING_TOLERANCE);
      // And the section really is what the reader is now looking at.
      await expect.soft(page.locator("#tree"), `/#${id} left the Journey off screen`).toBeInViewport();
      expect.soft(await scrollY(page), `/#${id} did not scroll at all`).toBeGreaterThan(0);
      checked += 1;
    }
    expect(checked, "the loop ended before every retired section id was landed on").toBe(
      LEGACY_SECTION_IDS.length,
    );
  });

  test("per-entry fragments land on their own act, each at a different place in the document", async ({
    page,
  }) => {
    // Three entries from three different acts, oldest first. One would prove the
    // mechanism; three prove the fragments are not all resolving to the same
    // element — which is the failure a single case cannot see, and the one a
    // derived-then-rendered id list could plausibly produce.
    const probes = [
      { entry: "eastside-high", act: "act-high-school" },
      { entry: "usc-ta", act: "act-research" },
      { entry: "doordash", act: "act-retail-data" },
    ] as const;
    for (const { entry } of probes) {
      expect(
        careerEntries.some((candidate) => candidate.id === entry),
        `${entry} is no longer a career entry, so this probe checks nothing`,
      ).toBe(true);
    }

    const offsets: number[] = [];
    for (const { entry, act } of probes) {
      const fragment = journeyEntryAnchorId(entry);
      await page.goto(`/#${fragment}`);
      await expect(page.locator(`#${fragment}`)).toHaveCount(1);
      expectSettledAtRestingTop(
        await restingTop(page.locator(`#${fragment}`)),
        `/#${fragment} must settle at the ${RESTING_TOP}px scroll margin`,
      );
      await expect(page.locator(`#${act}`)).toBeInViewport();
      offsets.push(await scrollY(page));
    }

    // Strictly increasing: the acts are chronological down the page, so an
    // older entry's fragment must land above a newer one's. Equal offsets would
    // mean two fragments resolved to the same element.
    expect(
      offsets,
      `the three fragments landed at ${offsets.join(", ")} — they must be three distinct places, oldest highest`,
    ).toEqual([...offsets].toSorted((a, b) => a - b));
    expect(new Set(offsets).size, "two fragments landed in the same place").toBe(probes.length);
  });
});
