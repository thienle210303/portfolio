import { test, expect, type Page } from "@playwright/test";

/**
 * The page-wide dead-fragment sweep: every in-page link the rendered page
 * carries must land on an element that exists.
 *
 * Why this exists. A link to `#something` that resolves to nothing is the
 * quietest failure a page has — the visitor clicks and nothing happens, and no
 * type, build or lint rule notices. Round 18 deleted two sections and the first
 * pre-flight for it grepped for *imports* of their directories, never for
 * *links* to their anchors, so the Hero's "Explore my work" button
 * (`href="#work"`) and every case-study citation in the chat shipped pointing at
 * a deleted section until a reviewer read the diff. This sweep reads the links,
 * not the imports.
 *
 * What it covers: every `main a[href^="#"]` — the Hero, the globe's plaques, the
 * Journey in both of its presentations (one is `display: none` at any width,
 * and a hidden link still has to resolve), the case studies and Contact. It
 * does NOT cover the header (`a[href="/#id"]`, derived from `navItems`, which
 * `navigation.spec.ts` already exercises) or the chat's citations (`#ask`), which
 * only exist after a question is asked — `tests/lib/answers.test.ts` walks the
 * whole corpus for those.
 *
 * Two things this spec is built not to do:
 *
 *  - **Pass vacuously.** Two counts of *distinct* hrefs are asserted non-zero,
 *    each with a message that says what a green run would otherwise have
 *    meant: the hrefs on first paint (so the day the selector stops matching
 *    anything the sweep goes red instead of green), and the hrefs that only
 *    appear once the worlds have been stepped through (so the globe's plaque
 *    links cannot quietly drop out of the sweep). Not a running total: every
 *    pass re-collects the whole page, so a cumulative count grows whether or
 *    not anything new appeared, and an earlier version asserted on one. (Two older sweeps in `sections.spec.ts`
 *    filtered into an array and asserted `toEqual([])` over a list that had
 *    become empty; round 18 deleted both as superseded by this one.)
 *  - **See only first paint.** Disclosures are opened first, the way
 *    `content-integrity.spec.ts` does it, because a link inside a collapsed
 *    branch panel is not in the document until its trigger has been pressed.
 *    The loop runs until no collapsed trigger is left, so a panel opened on one
 *    pass exposes the case study inside it to the next.
 */

async function expandAllDisclosures(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const isVisible = (el: HTMLElement) => el.offsetParent !== null;
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    for (let guard = 0; guard < 200; guard += 1) {
      const buttons = Array.from(
        document.querySelectorAll<HTMLElement>('#main button[aria-expanded="false"]'),
      ).filter(isVisible);
      if (buttons.length === 0) return;
      buttons[0].click();
      await nextFrame();
    }
    // Reaching here means a trigger never flipped to expanded (it would be
    // clicked 200 times while every other disclosure was skipped) or the page
    // has more than 200 of them. Either way the sweep below would silently see
    // less of the page than it reports, so say so instead.
    const stuck = document.querySelector('#main button[aria-expanded="false"]');
    throw new Error(
      `expandAllDisclosures hit its 200-click cap with a collapsed trigger still present: ${stuck?.id || stuck?.textContent?.trim() || "(unnamed)"}`,
    );
  });
}

/** Every `main a[href^="#"]` right now, and which of them point at nothing. */
async function sweep(page: Page): Promise<{ hrefs: string[]; unresolved: string[] }> {
  return page.evaluate(() => {
    const hrefs = Array.from(document.querySelectorAll<HTMLAnchorElement>('main a[href^="#"]')).map(
      (link) => link.getAttribute("href") ?? "",
    );
    // `#` alone is not a fragment target (it means "top of the page") and is
    // never a navigation this page authors; everything else must resolve.
    const unresolved = hrefs.filter(
      (href) => href.length > 1 && document.getElementById(decodeURIComponent(href.slice(1))) === null,
    );
    return { hrefs, unresolved };
  });
}

test("every in-page fragment link on the page resolves to a real element", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expandAllDisclosures(page);

  // Distinct hrefs, not a running count. Each sweep re-collects every link on
  // the page, so a cumulative count grows by the first-paint total on every
  // pass whether or not anything new appeared — an earlier version of this
  // spec asserted on that count and could not fail.
  const hrefs = new Set<string>();
  const dead = new Set<string>();
  const take = (result: { hrefs: string[]; unresolved: string[] }) => {
    for (const href of result.hrefs) hrefs.add(href);
    for (const href of result.unresolved) dead.add(href);
  };

  take(await sweep(page));
  const firstPaint = new Set(hrefs);

  // The globe's plaque links are rendered by the panel of whichever world is
  // selected, one world at a time, so a sweep of the first paint cannot see
  // them. Step through all seven and sweep after each: these are the links
  // round 18 repointed at the Journey's act anchors, and the ones a deleted
  // section would have orphaned.
  const section = page.locator("#worlds");
  const buttons = section.getByRole("list", { name: /chapters/i }).getByRole("button");
  const worldCount = await buttons.count();
  expect(worldCount, "found no world buttons to step through — the plaque links went unswept").toBeGreaterThan(0);
  for (let index = 0; index < worldCount; index += 1) {
    await buttons.nth(index).click();
    take(await sweep(page));
  }

  expect(
    firstPaint.size,
    "the sweep collected no fragment links on first paint — its selector has stopped matching, so a green result would prove nothing",
  ).toBeGreaterThan(0);
  const revealedByWorlds = [...hrefs].filter((href) => !firstPaint.has(href));
  expect(
    revealedByWorlds.length,
    "stepping through the worlds revealed no href that was absent from first paint — the plaque links are no longer reachable, so the globe went unswept",
  ).toBeGreaterThan(0);
  expect([...dead], `${dead.size} distinct fragment targets point at nothing`).toEqual([]);

  // Said in the output, not just in the assertion, so a run's evidence for
  // "not vacuous" is two numbers a reader can see.
  console.log(
    `[fragments] first paint: ${firstPaint.size} distinct hrefs (${[...firstPaint].join(" ")}); after the worlds: ${hrefs.size} (${[...hrefs].join(" ")}); revealed by the worlds: ${revealedByWorlds.join(" ")}; unresolved: ${dead.size}`,
  );
});
