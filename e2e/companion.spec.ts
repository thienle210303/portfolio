import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The companion cats and their quick-actions toolkit.
 *
 * The cats are decoration with a job attached, and the job is what these tests
 * cover: they must be operable by keyboard, must never be the only route to
 * anything, must stay out of the way when a visitor asks for less motion, must
 * never park on top of content, must always be somewhere a visitor can see
 * them, and must be removable — with a way back from everything except the one
 * action that says it has no way back.
 *
 * Their animation is deliberately not asserted. Pose, phase and position are
 * cosmetic, one of the two cats is deliberately non-deterministic, and pinning
 * any of it would make the suite fail every time the drawing is retouched. The
 * two exceptions below are not about how the cats look: "somewhere you can see
 * them" and "somewhere you can find them" are the two ways this feature has
 * actually failed a visitor, and neither is cosmetic.
 *
 * The scenes are the same call taken one step further. One opens minutes apart,
 * only while the visitor is idle, and never at all without a roaming loop — so
 * waiting for one would mean minutes of real time per worker for a decoration
 * whose failure mode is "a line drawing appears". What *is* asserted is the two
 * places it could hurt somebody: it is absent under reduced motion, and its
 * absence is a hard guarantee rather than a probability, because the loop that
 * runs it does not exist there.
 *
 * ## Counting cats
 *
 * `[data-companion] svg` used to mean "a cat", because cats were the only thing
 * the companion drew. They are not any more: the corner furniture — a bed, a
 * cardboard box and a sheet of paper — and the props are line drawings in the
 * same technique on the same layer. So the assertions that are about *animals*
 * say `svg[data-cat]`, and the two that are about anything the companion paints
 * over somebody's page — never off-screen, never behind the header — keep the
 * wider selector on purpose. The furniture obeys the same clamps the cats do,
 * and those tests are where that is proved.
 */

const DESKTOP_WIDTH = 1440;
const MOBILE_WIDTH = 375;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

/** The lead cat: the only companion element with an accessible name, because
 *  it is the only one that is a control. */
function catButton(page: Page) {
  return page.getByRole("button", { name: /quick actions/i });
}

function restingBox(page: Page) {
  return page.getByRole("button", { name: /wake the cats/i });
}

/** The footer's one-way-back control, present only while the cats are off
 *  for good — see CompanionRecoveryLink.tsx. */
function footerRecovery(page: Page) {
  return page.getByRole("button", { name: /bring the cats back/i });
}

/**
 * Wait until the roaming loop is demonstrably live — both cats positioned by
 * their first animation frames. The pointer listener attaches in the same
 * mount commit as the loop, so once this holds, a synthetic mouse move cannot
 * race the handler. Without it, a `mouse.move` fired immediately after
 * networkidle can land ~80ms before hydration finishes attaching the effect,
 * and the test's one presence stamp silently evaporates — which is exactly
 * how three of these tests flaked on a warm dev server.
 */
async function companionAwake(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            Array.from(document.querySelectorAll("[data-companion] svg[data-cat]")).filter(
              (svg) => {
                const el = svg.closest("[data-companion] > *") as HTMLElement | null;
                return el?.style.transform.includes("translate3d") ?? false;
              },
            ).length,
        ),
      { timeout: 10_000 },
    )
    .toBe(2);
}

test.describe("companion", () => {
  test("opens and closes its toolkit, and Escape returns focus to the cat", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cat = catButton(page);
    await expect(cat).toHaveAttribute("aria-expanded", "false");

    await cat.click();
    await expect(cat).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: /^GitHub/ }).last()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(cat).toHaveAttribute("aria-expanded", "false");
    await expect(cat).toBeFocused();
  });

  test("is reachable and operable by keyboard alone", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cat = catButton(page);
    await cat.focus();
    await expect(cat).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(cat).toHaveAttribute("aria-expanded", "true");

    // Opening moves focus into the panel, so the first Tab stays inside it
    // rather than stranding the visitor back at the top of the document.
    const focusedInPanel = await page.evaluate(() =>
      document.getElementById("companion-actions")?.contains(document.activeElement),
    );
    expect(focusedInPanel).toBe(true);
  });

  test("every toolkit action also exists elsewhere on the page", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "content is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await catButton(page).click();

    const panel = page.locator("#companion-actions");

    // Section jumps resolve to real sections.
    // Root-relative, so the toolkit works from /resume as well as from home.
    for (const id of ["work", "journey", "skills", "contact"]) {
      const link = panel.locator(`a[href="/#${id}"]`);
      await expect(link).toHaveCount(1);
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    // The social links point at the same URLs the footer already carries, so
    // the cats are a shortcut rather than a second source of truth.
    for (const name of [/^GitHub/, /^LinkedIn/]) {
      const inPanel = panel.getByRole("link", { name });
      const href = await inPanel.getAttribute("href");
      expect(href).toBeTruthy();
      await expect(page.locator(`footer a[href="${href}"]`)).toHaveCount(1);
      await expect(inPanel).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  test("draws two independently positioned cats, not one pair", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Two separately positioned elements is the whole point of FB-6: one
    // element containing both cats cannot give them different behaviour. Their
    // *positions* are not asserted — the tabby is deliberately erratic.
    await expect(page.locator("[data-companion] svg[data-cat]")).toHaveCount(2);

    // Polled, not sampled once: the transforms are written by the first
    // animation frames after hydration, and under full-suite worker load that
    // first frame can land after networkidle. What is asserted is the settled
    // state, so waiting for it is correct rather than lenient.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const wrappers = Array.from(
              document.querySelectorAll("[data-companion] svg[data-cat]"),
            ).map((svg) => svg.closest("[data-companion] > *") as HTMLElement | null);
            return {
              distinct: new Set(wrappers).size,
              positioned: wrappers.filter((el) => el?.style.transform.includes("translate3d"))
                .length,
            };
          }),
        { timeout: 10_000 },
      )
      .toEqual({ distinct: 2, positioned: 2 });
  });

  test("sends the cats to a visible resting box, which brings them back", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await catButton(page).click();
    await page.getByRole("button", { name: /send the cats to bed/i }).click();

    // Gone from roaming, but not gone: the bed is a real, labelled control and
    // focus has followed the visitor into it.
    await expect(catButton(page)).toHaveCount(0);
    await expect(restingBox(page)).toBeVisible();
    await expect(restingBox(page)).toBeFocused();

    // And it is the *only* control on the bed. "Turn the cats off" used to sit
    // beside it; the owner asked for the bed to be just the bed, so the
    // permanent exit lives in the toolkit alone. A second button reappearing
    // here is the regression this asserts.
    await expect(page.getByRole("button", { name: /turn the cats off/i })).toHaveCount(0);
    await expect(page.locator("[data-companion] button")).toHaveCount(1);

    // Survives a reload — this is a preference, not a session quirk.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(catButton(page)).toHaveCount(0);
    await expect(restingBox(page)).toBeVisible();

    // Sleeping cats snore, and it is decoration all the way down: hidden from
    // assistive technology, and never a target. Asserted after the reload
    // rather than straight after the dismissal, because the corner only fills
    // once the escort has finished walking them into it.
    //
    // Two streams now, not one: the pair no longer share a bed. One of them is
    // wedged in the cardboard box and the other is flat out on a sheet of
    // paper, a good 60px apart, and a single "z" rising between them would be
    // coming out of the empty bed.
    const snore = page.locator("[data-cat-snore]");
    await expect(snore).toHaveCount(2);
    for (const one of await snore.all()) {
      await expect(one).toHaveAttribute("aria-hidden", "true");
    }
    expect(
      await page.evaluate(() =>
        Array.from(document.querySelectorAll("[data-cat-snore]")).map(
          (el) => window.getComputedStyle(el).pointerEvents,
        ),
      ),
    ).toEqual(["none", "none"]);

    // And the way back exists, which is the entire point of FB-5.
    await restingBox(page).click();
    await expect(catButton(page)).toBeVisible();
    await expect(restingBox(page)).toHaveCount(0);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(catButton(page)).toBeVisible();
  });

  test("can be turned off for good, from the toolkit, and the footer can bring them back", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // While the cats are on, the footer carries no trace of the recovery
    // control at all — it is the one control that only makes sense once
    // they are gone.
    await expect(footerRecovery(page)).toHaveCount(0);

    await catButton(page).click();
    await page.getByRole("button", { name: /turn the cats off/i }).click();

    // Nothing companion-related is left anywhere on the page.
    await expect(catButton(page)).toHaveCount(0);
    await expect(restingBox(page)).toHaveCount(0);
    await expect(page.locator("[data-companion]")).toHaveCount(0);

    // This is the entire point of FB-5 all over again: "off" used to strand
    // a visitor with nothing on the page to click. The footer is now that
    // route back, appearing the moment there is nothing else left to bring
    // them back with.
    await expect(footerRecovery(page)).toBeVisible();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("[data-companion]")).toHaveCount(0);
    await expect(footerRecovery(page)).toBeVisible();

    // One click, and they are roaming again — no reload required, because
    // it writes through the same store `Companion` itself is subscribed to.
    await footerRecovery(page).click();
    await expect(catButton(page)).toBeVisible();
    await expect(footerRecovery(page)).toHaveCount(0);

    // And the preference sticks: a visitor who used this route back does not
    // find the cats off again on their next load.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(catButton(page)).toBeVisible();
    await expect(footerRecovery(page)).toHaveCount(0);

    // Put them back off for the rest of this test, which continues to
    // exercise the toolkit's own permanent-exit behaviour.
    await catButton(page).click();
    await page.getByRole("button", { name: /turn the cats off/i }).click();
    await expect(page.locator("[data-companion]")).toHaveCount(0);

    // Nothing else on the page depends on them: contact routes still resolve.
    await expect(page.locator("#contact")).toBeVisible();

    // There used to be a second route to the same action, on the bed itself,
    // so a visitor could remove the cats without waking them. It is gone by the
    // owner's request — the bed is furniture, not a control panel — which makes
    // the toolkit above the single source of the permanent exit. The cost is
    // one click to wake them first, and the wake control is asserted by the
    // resting-box test; what matters here is that the bed no longer offers it.
    await page.evaluate(() => window.localStorage.setItem("companion", "resting"));
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(restingBox(page)).toBeVisible();
    await expect(page.getByRole("button", { name: /turn the cats off/i })).toHaveCount(0);
  });

  test("never comes to rest on top of readable content", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await companionAwake(page);

    // Park the pointer in the middle of the hero's prose and let them settle.
    // Passing overlap while they walk is fine and deliberate; what must never
    // happen is a cat asleep on a paragraph — so this polls rather than waiting
    // a fixed time, which also keeps it honest about *when* the rule applies.
    const prose = page.locator("#main p").first();
    await prose.scrollIntoViewIfNeeded();
    const box = await prose.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const readable =
              "p,h1,h2,h3,h4,h5,h6,li,dt,dd,blockquote,pre,code,figure,table,a,button,input,textarea,select,label";
            // Animals only. This rule has always been about where a *cat* comes
            // to rest; the corner furniture is placed rather than probed, and it
            // lives where the toolkit panel and the resting box already do.
            return Array.from(
              document.querySelectorAll("[data-companion] svg[data-cat]"),
            ).flatMap((svg) => {
              const rect = svg.getBoundingClientRect();
              // The feet and the belly, which is where a cat actually rests.
              const points: Array<[number, number]> = [
                [rect.left + 6, rect.bottom - 6],
                [rect.right - 6, rect.bottom - 6],
                [rect.left + rect.width / 2, rect.top + rect.height * 0.6],
              ];
              return points.flatMap(([x, y]) =>
                document
                  .elementsFromPoint(x, y)
                  .filter((el) => !el.closest("[data-companion]"))
                  .slice(0, 1)
                  .filter((el) => el.closest(readable))
                  .map((el) => `${el.tagName.toLowerCase()} at ${Math.round(x)},${Math.round(y)}`),
              );
            });
          }),
        { timeout: 10_000, message: "a cat came to rest on top of content" },
      )
      .toEqual([]);
  });

  test("never leaves a cat off-screen or behind the sticky header", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The two ways a cat becomes invisible without ever leaving the DOM. The
    // header is `sticky top-0 z-50` over a companion layer at `z-40`, and it is
    // opaque; `overflow-x: clip` on the document means a cat past an edge does
    // not even produce a scrollbar to hint at where it went.
    //
    // Deliberately every svg the companion paints, not just the animals: the
    // corner furniture is line work on the same fixed layer and is subject to
    // exactly the same clamps.
    const hidden = () =>
      page.evaluate(() => {
        const header = document.querySelector("header")?.getBoundingClientRect();
        const width = document.documentElement.clientWidth;
        const height = document.documentElement.clientHeight;
        return Array.from(document.querySelectorAll("[data-companion] svg"))
          .map((svg) => svg.getBoundingClientRect())
          .filter(
            (r) =>
              r.left < 0 ||
              r.top < 0 ||
              r.right > width ||
              r.bottom > height ||
              (header !== undefined && header.bottom > 0 && r.top < header.bottom),
          )
          .map((r) => `${Math.round(r.left)},${Math.round(r.top)}`);
      });

    await companionAwake(page);

    // Walk the pointer up into the chrome and leave it there. Crossing the
    // header while they move is fine; ending up under it is not.
    await page.mouse.move(700, 500);
    await page.mouse.move(700, 70, { steps: 20 });
    await expect
      .poll(hidden, { timeout: 10_000, message: "a cat settled where it cannot be seen" })
      .toEqual([]);

    // And then take the viewport away from underneath them, which is the case
    // that used to strand a cat outside it indefinitely: the targets were
    // invalidated on resize, but the cats' own positions never were.
    await page.setViewportSize({ width: 760, height: 560 });
    await expect
      .poll(hidden, { timeout: 10_000, message: "a resize left a cat outside the viewport" })
      .toEqual([]);
  });

  test("puts itself to bed when left alone, and does not remember doing it", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    // Deliberately real time: the threshold this exercises is the one a visitor
    // hits by looking away, and faking it would test a different feature.
    test.setTimeout(90_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await companionAwake(page);

    // One move, then nothing. Idle sleep is gated on a pointer having existed,
    // so a page nobody has touched keeps the old corner behaviour.
    await page.mouse.move(600, 400);

    // `[data-cat-bed]` is the whole corner now — the bed, the cardboard box and
    // the sheet of paper — and it is carried by the layer drawn *behind* the
    // animals, so it stays exactly one element. The carton's front panel is a
    // second element with its own hook, because it has to paint over the cat
    // wedged into the box.
    const bed = page.locator("[data-cat-bed]");
    await expect(bed).toBeVisible({ timeout: 40_000 });
    await expect(page.locator("[data-cat-bed-front]")).toHaveCount(1);

    // The furniture is bigger than the bed it replaced, and it is placed rather
    // than probed — so the one thing that has to hold is that all of it is still
    // on the screen.
    expect(
      await page.evaluate(() => {
        const r = document.querySelector("[data-cat-bed]")!.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.top >= 0 &&
          r.right <= document.documentElement.clientWidth &&
          r.bottom <= document.documentElement.clientHeight
        );
      }),
    ).toBe(true);

    // Both of them end up inside it — in the wrong furniture, which is the joke,
    // but inside it. This is the whole point of the corner: cats that go quiet
    // somewhere expected read as cats, and cats that go quiet in whatever margin
    // they were standing in read as a bug.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const box = document.querySelector("[data-cat-bed]")?.getBoundingClientRect();
            if (!box) return -1;
            return Array.from(
              document.querySelectorAll("[data-companion] svg[data-cat]"),
            ).filter((svg) => {
              const r = svg.getBoundingClientRect();
              return (
                r.left < box.left - 4 ||
                r.right > box.right + 4 ||
                r.top < box.top - 4 ||
                r.bottom > box.bottom + 4
              );
            }).length;
          }),
        { timeout: 30_000, message: "a cat never made it into the bed" },
      )
      .toBe(0);

    // It is a moment, not a preference — the distinction the resting box owns.
    // Nothing is written down, so nothing has to be undone.
    expect(await page.evaluate(() => window.localStorage.getItem("companion"))).toBeNull();

    // Any real sign of life releases them, and the lead cat was a working
    // control the entire time it was asleep.
    await expect(catButton(page)).toBeVisible();
    await page.mouse.move(300, 300, { steps: 12 });
    await page.mouse.move(720, 520, { steps: 12 });
    await expect(bed).toHaveCount(0);

    // And a reload starts them roaming, with no trace of the nap.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(catButton(page)).toBeVisible();
    await expect(page.locator("[data-cat-bed]")).toHaveCount(0);
  });

  test("stays with a visitor who is reading, and comes back when the page moves", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    // Real time again, and for the same reason as the test above: this is the
    // fourteen-second threshold seen from the other side.
    test.setTimeout(120_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const bed = page.locator("[data-cat-bed]");

    /*
     * Reading a page is scrolling it with the mouse held still, and that is the
     * shape of the bug this covers: a wheel turned under a stationary pointer
     * fires no pointer event at all, so on a pointer-only idle clock a visitor
     * three paragraphs down reads as absent. The cats walked off to the corner
     * and went to sleep while somebody was plainly there, and no amount of
     * further scrolling brought them back — the pointer handler owned the only
     * way out of the bed, and the pointer never moved.
     *
     * Every other test in this file drives the cats with the mouse, which is
     * exactly why the suite was green while the owner was watching two cats
     * leave the screen for the rest of a visit.
     */
    await page.mouse.move(760, 600);
    let lastTickAt = Date.now();
    for (let tick = 0; tick < 20; tick += 1) {
      await page.mouse.wheel(0, 420);
      await page.waitForTimeout(800);
      // Not polled at the end: the claim is that they never go, so it has to
      // hold on every step past the threshold, not just once it has passed.
      //
      // Unless the harness itself stalled. Under full-suite worker load a
      // tick can arrive seconds late, and a long-enough gap in scroll events
      // IS the product's definition of "nobody is here" — the bed engaging
      // then is correct behaviour, not the bug. So a late tick re-establishes
      // presence and skips its assertion instead of failing on the product
      // doing what it should.
      const gap = Date.now() - lastTickAt;
      lastTickAt = Date.now();
      if (gap > 8_000) continue;
      await expect(bed).toHaveCount(0);
    }

    // Now actually leave. The bed is a real behaviour, not a thing to suppress
    // — it just has to mean "nobody is here" rather than "the mouse is still".
    await expect(bed).toBeVisible({ timeout: 40_000 });
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const box = document.querySelector("[data-cat-bed]")?.getBoundingClientRect();
            if (!box) return -1;
            return Array.from(
              document.querySelectorAll("[data-companion] svg[data-cat]"),
            ).filter((svg) => {
              const r = svg.getBoundingClientRect();
              return (
                r.left < box.left - 4 ||
                r.right > box.right + 4 ||
                r.top < box.top - 4 ||
                r.bottom > box.bottom + 4
              );
            }).length;
          }),
        { timeout: 30_000, message: "a cat never made it into the bed" },
      )
      .toBe(0);

    /*
     * Two sleeping cats have no animation frames, and the clamp that keeps a
     * cat inside the viewport only runs inside one. So the moment the viewport
     * changes underneath them is the moment nothing is holding them in it —
     * counted in frames rather than milliseconds, because the failure was a
     * quarter of a second of two cats outside a window that, with
     * `overflow-x: clip` on the document, shows nothing at all where they went.
     */
    await page.evaluate(() => {
      const seen: string[] = [];
      (window as unknown as { __companionOffScreen: string[] }).__companionOffScreen = seen;
      const watch = () => {
        const width = document.documentElement.clientWidth;
        const height = document.documentElement.clientHeight;
        for (const svg of document.querySelectorAll("[data-companion] svg")) {
          const r = svg.getBoundingClientRect();
          if (r.left < -1 || r.top < -1 || r.right > width + 1 || r.bottom > height + 1) {
            seen.push(`${Math.round(r.left)},${Math.round(r.top)} in ${width}x${height}`);
          }
        }
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    });

    await page.setViewportSize({ width: 980, height: 700 });
    await page.waitForTimeout(600);

    // And scrolling gets them up, which is the half a visitor actually feels:
    // the page moved, so somebody is here, so the cats are back.
    await page.mouse.wheel(0, 500);
    await expect(bed).toHaveCount(0, { timeout: 3_000 });

    expect(
      await page.evaluate(
        () => (window as unknown as { __companionOffScreen: string[] }).__companionOffScreen,
      ),
    ).toEqual([]);
  });

  test("does not roam when the visitor asks for reduced motion", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: DESKTOP_WIDTH, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cat = catButton(page);
    const before = await cat.boundingBox();
    await page.mouse.move(300, 300);
    await page.mouse.move(1100, 700);
    await page.waitForTimeout(600);
    const after = await cat.boundingBox();

    expect(before).not.toBeNull();
    expect(after).toEqual(before);
    // Nothing to play with either: props belong to scenes the roaming loop acts
    // out, and there is no roaming loop here.
    await expect(page.locator("[data-cat-toy]")).toHaveCount(0);
    // No idle furniture either: it belongs to the roaming layer, which does not
    // exist here, and a corner full of furniture appearing under a pair of cats
    // that never walked to it would be pure decoration.
    await expect(page.locator("[data-cat-bed]")).toHaveCount(0);
    await expect(page.locator("[data-cat-bed-front]")).toHaveCount(0);
    // Still fully usable — they are parked, not removed.
    await cat.click();
    await expect(cat).toHaveAttribute("aria-expanded", "true");

    // And the dismissal still works, without any of the escort theatrics: the
    // cats are in the box the moment the action is taken.
    await page.getByRole("button", { name: /send the cats to bed/i }).click();
    await expect(restingBox(page)).toBeVisible();
    await expect(catButton(page)).toHaveCount(0);
    // No third cat anywhere: the police escort is skipped entirely here. Counted
    // as animals rather than as drawings, because the corner they land in is
    // three more drawings on its own.
    await expect(page.locator("[data-companion] svg[data-cat]")).toHaveCount(2);
    // And the whole cluster is still one control with one name, which the
    // reduced-motion path reaches without any of the walking.
    await expect(page.locator("[data-companion] button")).toHaveCount(1);

    // The snore is removed rather than slowed. The global reduced-motion rule
    // collapses animations to 0.01ms, which would park these three glyphs at
    // their last keyframe instead of taking them off the page — so this asserts
    // the companion's own stylesheet, not the global one.
    expect(
      await page.evaluate(() => {
        const el = document.querySelector("[data-cat-snore]");
        return el ? window.getComputedStyle(el).display : "missing";
      }),
    ).toBe("none");

    await context.close();
  });

  test("adds no WCAG violations with its toolkit open", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await catButton(page).click();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations,
      results.violations.map((violation) => `[${violation.id}] ${violation.help}`).join("\n"),
    ).toEqual([]);
  });

  test("adds no WCAG violations with the cats in their box", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.localStorage.setItem("companion", "resting"));
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(restingBox(page)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations,
      results.violations.map((violation) => `[${violation.id}] ${violation.help}`).join("\n"),
    ).toEqual([]);
  });

  test("is not printed", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "print CSS is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.emulateMedia({ media: "print" });
    await expect(catButton(page)).toBeHidden();
  });
});
