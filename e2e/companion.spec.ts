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
 * The toys are the same call taken one step further. A scene opens minutes
 * apart, only while the visitor is idle, and never at all without a roaming
 * loop — so waiting for one would mean minutes of real time per worker for a
 * decoration whose failure mode is "a line drawing appears". What *is* asserted
 * is the two places it could hurt somebody: it is absent under reduced motion,
 * and its absence is a hard guarantee rather than a probability, because the
 * loop that runs it does not exist there.
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
    await expect(page.locator("[data-companion] svg")).toHaveCount(2);

    // Polled, not sampled once: the transforms are written by the first
    // animation frames after hydration, and under full-suite worker load that
    // first frame can land after networkidle. What is asserted is the settled
    // state, so waiting for it is correct rather than lenient.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const wrappers = Array.from(
              document.querySelectorAll("[data-companion] svg"),
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
    // rather than straight after the dismissal, because the box only fills
    // once the escort has finished walking them into it.
    const snore = page.locator("[data-cat-snore]");
    await expect(snore).toHaveCount(1);
    await expect(snore).toHaveAttribute("aria-hidden", "true");
    expect(
      await page.evaluate(() => {
        const el = document.querySelector("[data-cat-snore]");
        return el ? window.getComputedStyle(el).pointerEvents : "missing";
      }),
    ).toBe("none");

    // And the way back exists, which is the entire point of FB-5.
    await restingBox(page).click();
    await expect(catButton(page)).toBeVisible();
    await expect(restingBox(page)).toHaveCount(0);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(catButton(page)).toBeVisible();
  });

  test("can be turned off for good, from the toolkit", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await catButton(page).click();
    await page.getByRole("button", { name: /turn the cats off/i }).click();

    // Nothing companion-related is left anywhere on the page.
    await expect(catButton(page)).toHaveCount(0);
    await expect(restingBox(page)).toHaveCount(0);
    await expect(page.locator("[data-companion]")).toHaveCount(0);

    await page.reload();
    await page.waitForLoadState("networkidle");
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
            return Array.from(document.querySelectorAll("[data-companion] svg")).flatMap((svg) => {
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

    // One move, then nothing. Idle sleep is gated on a pointer having existed,
    // so a page nobody has touched keeps the old corner behaviour.
    await page.mouse.move(600, 400);

    const bed = page.locator("[data-cat-bed]");
    await expect(bed).toBeVisible({ timeout: 40_000 });

    // Both of them end up inside it. This is the whole point of the bed: cats
    // that go quiet somewhere expected read as cats, and cats that go quiet in
    // whatever margin they were standing in read as a bug.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const box = document.querySelector("[data-cat-bed]")?.getBoundingClientRect();
            if (!box) return -1;
            return Array.from(document.querySelectorAll("[data-companion] svg")).filter((svg) => {
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
    // Nothing to play with either: toys are scenes the roaming loop acts out,
    // and there is no roaming loop here.
    await expect(page.locator("[data-cat-toy]")).toHaveCount(0);
    // No idle bed either: it belongs to the roaming layer, which does not exist
    // here, and a bed appearing under a pair of cats that never walked to it
    // would be pure decoration.
    await expect(page.locator("[data-cat-bed]")).toHaveCount(0);
    // Still fully usable — they are parked, not removed.
    await cat.click();
    await expect(cat).toHaveAttribute("aria-expanded", "true");

    // And the dismissal still works, without any of the escort theatrics: the
    // cats are in the box the moment the action is taken.
    await page.getByRole("button", { name: /send the cats to bed/i }).click();
    await expect(restingBox(page)).toBeVisible();
    await expect(catButton(page)).toHaveCount(0);
    // No third cat anywhere: the police escort is skipped entirely here.
    await expect(page.locator("[data-companion] svg")).toHaveCount(2);

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
