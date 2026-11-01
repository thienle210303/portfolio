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
 * What it covers: every `main a[href^="#"]` — the Hero, the
 * Journey's hanging tags, drawing (`display: none` below 1024px, and a
 * hidden link still has to resolve) and timeline, the case studies and
 * Contact. It
 * does NOT cover the header (`a[href="/#id"]`, derived from `navItems`, which
 * `navigation.spec.ts` already exercises) or the chat's citations (`#ask`), which
 * only exist after a question is asked — `tests/lib/answers.test.ts` walks the
 * whole corpus for those.
 *
 * Two things this spec is built not to do:
 *
 *  - **Pass vacuously.** The count of *distinct* hrefs is asserted non-zero,
 *    with a message that says what a green run would otherwise have meant:
 *    the day the selector stops matching anything the sweep goes red instead
 *    of green. (Two older sweeps in `sections.spec.ts`
 *    filtered into an array and asserted `toEqual([])` over a list that had
 *    become empty; round 18 deleted both as superseded by this one.)
 *  - **See only first paint.** Disclosures are opened first, the way
 *    `content-integrity.spec.ts` does it, because a link inside a collapsed
 *    branch panel is not in the document until its trigger has been pressed.
 *    The loop runs until no collapsed trigger is left, so a panel opened on one
 *    pass exposes what is inside it to the next. The hero's chapter tags open
 *    one at a time; their back faces are always in the document, so their
 *    triggers are skipped. (The Record's rows were skipped too, until round 23
 *    made it a book: every page is in the document, so there is nothing to open.)
 */

async function expandAllDisclosures(page: Page): Promise<void> {
  // Hydrated, so a click on a trigger is handled rather than lost.
  await expect(page.locator("#record [data-diary]")).toHaveAttribute("data-live", "");
  await page.evaluate(async () => {
    // The hero's chapter tags are one-open; their backs (and the links on
    // them) are in the document whether turned or not, so they are skipped.
    const isRow = (el: HTMLElement) => el.id.endsWith("-front") && !!el.closest("#about");
    const isVisible = (el: HTMLElement) => el.offsetParent !== null && !isRow(el);
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
    const stuck = Array.from(
      document.querySelectorAll<HTMLElement>('#main button[aria-expanded="false"]'),
    ).find((el) => !isRow(el));
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

  const { hrefs, unresolved } = await sweep(page);
  const distinct = new Set(hrefs);
  const dead = new Set(unresolved);
  expect(
    distinct.size,
    "the sweep collected no fragment links — its selector has stopped matching, so a green result would prove nothing",
  ).toBeGreaterThan(0);
  expect([...dead], `${dead.size} distinct fragment targets point at nothing`).toEqual([]);

  // Said in the output, not just in the assertion, so a run's evidence for
  // "not vacuous" is a number a reader can see.
  console.log(`[fragments] ${distinct.size} distinct hrefs (${[...distinct].join(" ")}); unresolved: ${dead.size}`);
});
