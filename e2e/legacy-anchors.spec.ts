import { test, expect } from "@playwright/test";
import { careerEntries } from "../src/content/portfolio";
import { journeyEntryAnchorId } from "../src/sections/CareerTree/anchors";

/**
 * Every retired URL still lands — **with JavaScript disabled**.
 *
 * `#work`, `#skills`, `#workshop`, `#journey` and `journey-entry-<id>` were all
 * live fragments on this site at some point. They are in bookmarks, possibly in
 * a résumé PDF that has been emailed to people, and possibly in a search index,
 * and none of those can be edited. A fragment that resolves to nothing is the
 * quietest failure a page has: the browser simply does nothing.
 *
 * ## Why this spec exists and a unit test does not replace it
 *
 * `tests/sections/CareerTree.test.tsx` and `tests/sections/Stage.test.tsx`
 * already assert the elements are in the render. They cannot assert the thing
 * that actually matters, because jsdom has no layout and no fragment
 * navigation: that a real browser, running **none** of this page's JavaScript,
 * receives those ids in the document it is served and scrolls to them. The two
 * halves below are deliberately different kinds of evidence:
 *
 *  1. **The served HTML.** Fetched over HTTP, parsed by nobody, scripts never
 *     started. If an id is in that byte stream it exists for a no-JS visitor by
 *     construction — this is the strongest form the claim has, and it also
 *     covers the per-entry fragments inside acts that are off screen.
 *  2. **The landing.** A browser context with `javaScriptEnabled: false`,
 *     navigated straight at the fragment, and then asked whether the Journey is
 *     on screen. This is the half that would catch an anchor that exists but is
 *     positioned somewhere a scroll cannot reach, or a `scroll-mt` that is
 *     missing so the sticky header covers the landing.
 *
 * Neither half may pass vacuously: every loop counts what it checked and
 * asserts the count, with a message saying what a green run would otherwise
 * have proved.
 *
 * ## Why this spec and not `e2e/fragments.spec.ts`
 *
 * That sweep reads `main a[href^="#"]` — the links the page itself renders.
 * Nothing on this page links to any of these ids on purpose: they exist for
 * inbound links the site does not control. So the sweep cannot see them, and
 * this spec is their only coverage.
 */

/** The retired *section* ids, rendered by `CareerTree.tsx`. Written out because
 *  a deleted section leaves nothing behind to derive the list from. */
const LEGACY_SECTION_IDS = ["journey", "work", "skills", "workshop"] as const;

/** Every fragment this spec is responsible for. */
const ALL_LEGACY_IDS = [
  ...LEGACY_SECTION_IDS,
  ...careerEntries.map((entry) => journeyEntryAnchorId(entry.id)),
];

test.describe("retired URLs, with JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });

  test("the served HTML carries every retired fragment id", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status(), "the page did not render").toBe(200);
    const html = await response.text();

    // Not vacuous, twice over: a content layer with no entries would make the
    // list below only the four section ids, and an empty response would make
    // every `includes` below fail rather than pass — but the count is asserted
    // anyway so that a future refactor which empties the list goes red.
    expect(
      careerEntries.length,
      "no career entries, so no per-entry fragment was checked",
    ).toBeGreaterThan(0);
    expect(ALL_LEGACY_IDS.length).toBe(LEGACY_SECTION_IDS.length + careerEntries.length);

    const missing = ALL_LEGACY_IDS.filter((id) => !html.includes(`id="${id}"`));
    expect(
      missing,
      `${missing.length} retired fragment ids are absent from the server-rendered HTML, so a bookmark to them lands nowhere without JavaScript`,
    ).toEqual([]);

    // Each one exactly once. A duplicate id is a different bug with the same
    // symptom — the browser lands on whichever came first, which may not be the
    // one that was meant.
    const duplicated = ALL_LEGACY_IDS.filter(
      (id) => html.split(`id="${id}"`).length - 1 !== 1,
    );
    expect(duplicated, "a retired fragment id appears more than once").toEqual([]);

    console.log(
      `[legacy-anchors] ${ALL_LEGACY_IDS.length} ids found exactly once in the no-JS HTML: ${ALL_LEGACY_IDS.join(" ")}`,
    );
  });

  for (const id of LEGACY_SECTION_IDS) {
    test(`/#${id} lands a scriptless browser on the Journey`, async ({ page }) => {
      await page.goto(`/#${id}`);

      // The anchor itself, then the section it is meant to deliver the reader
      // to. Checking only the anchor would pass for an element parked anywhere
      // in the document; checking only the section would pass if the browser
      // had simply never scrolled and the Journey happened to be on screen —
      // which it is not at any of this config's viewports, because About is.
      await expect(page.locator(`#${id}`)).toHaveCount(1);
      await expect(page.locator("#tree")).toBeInViewport();

      // The control for that last clause: the page is long enough that landing
      // on the Journey means a scroll really happened.
      await expect(page.locator("#about")).not.toBeInViewport();
    });
  }

  test("a per-entry fragment lands a scriptless browser on the act that draws the entry", async ({
    page,
  }) => {
    // One representative entry rather than all twenty: the served-HTML test
    // above covers every id, and this one is about the *landing*, which is the
    // same mechanism for all of them. `doordash` is the newest role and is
    // drawn in the last act, so it is the furthest from where the page opens —
    // the hardest case for "did it actually scroll".
    const entry = careerEntries.find((candidate) => candidate.id === "doordash");
    expect(entry, "no doordash entry to navigate to").toBeDefined();
    const fragment = journeyEntryAnchorId("doordash");

    await page.goto(`/#${fragment}`);
    await expect(page.locator(`#${fragment}`)).toHaveCount(1);
    await expect(page.locator("#act-retail-data")).toBeInViewport();
    await expect(page.locator("#about")).not.toBeInViewport();
  });
});
