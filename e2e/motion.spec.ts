import { expect, test, type Page } from "@playwright/test";

/*
 * Round 21 phase 8: the story slides page to page, in CSS (globals.css,
 * "Motion") and one View Transition helper (`src/lib/glide.ts`).
 *
 * The entrances move transforms only, so nothing is ever hidden; reduced
 * motion and print turn every one of them off, and with JavaScript off the
 * page is all there.
 */
const ENTRANCES = [
  "[data-hero-step='line'] > li",
  "[data-hanging-tags] li > div",
  ".record-page-left",
  "[data-postcard]",
];
const HEADINGS = ["#hero-heading", "#tree-heading", "#record-heading", "#contact-heading"];

function width(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

/** Every entrance paper: its animation, opacity, visibility, and whether any
 *  of its keyframes touch opacity. */
async function papers(page: Page) {
  return page.evaluate((selectors) =>
    selectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)).map((el) => {
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return {
          selector,
          animation: style.animationName,
          opacity: style.opacity,
          visibility: style.visibility,
          drawn: box.width > 0 && box.height > 0,
          fades: el
            .getAnimations()
            .some((a) => (a.effect as KeyframeEffect | null)?.getKeyframes().some((k) => "opacity" in k)),
        };
      }),
    ),
  ENTRANCES);
}

/** Animations driven by scrolling, outside the cats. */
async function scrollDriven(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => a.timeline !== null && !(a.timeline instanceof DocumentTimeline)).length,
  );
}

test.describe("motion (round 21 phase 8)", () => {
  test("every entrance is drawn and opaque before anything has scrolled", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const found = await papers(page);
    expect(found.length).toBeGreaterThanOrEqual(ENTRANCES.length);
    for (const p of found) {
      expect(p.drawn, `${p.selector} is drawn`).toBe(true);
      expect(p.opacity, `${p.selector} is opaque`).toBe("1");
      expect(p.visibility, `${p.selector} is visible`).toBe("visible");
      expect(p.fades, `${p.selector} never animates opacity`).toBe(false);
    }
    // Scroll-driven where the browser has them (Chromium does).
    expect(await scrollDriven(page)).toBeGreaterThan(0);
  });

  test("under reduced motion nothing moves, nothing snaps", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    for (const p of await papers(page)) {
      expect(p.animation, `${p.selector} has no animation`).toBe("none");
      expect(p.opacity).toBe("1");
    }
    expect(await scrollDriven(page)).toBe(0);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
  });

  test("printed, nothing moves", async ({ page }) => {
    test.skip(width(page) !== 1440, "run once");
    await page.goto("/");
    await page.emulateMedia({ media: "print" });
    for (const p of await papers(page)) expect(p.animation, p.selector).toBe("none");
  });

  test.describe("with JavaScript off", () => {
    test.use({ javaScriptEnabled: false });

    test("every page's heading and every paper is there, unscrolled", async ({ page }) => {
      await page.goto("/");
      for (const id of HEADINGS) await expect(page.locator(id)).toBeAttached();
      await expect(page.locator(HEADINGS[0])).toBeInViewport();
      for (const p of await papers(page)) {
        expect(p.drawn, p.selector).toBe(true);
        expect(p.opacity, p.selector).toBe("1");
        expect(p.visibility, p.selector).toBe("visible");
      }
      // And each one shows once it is scrolled to.
      for (const id of HEADINGS.slice(1)) {
        await page.locator(id).scrollIntoViewIfNeeded();
        await expect(page.locator(id)).toBeVisible();
      }
    });
  });

  test("a nav item glides to its section through a View Transition", async ({ page }) => {
    test.skip(width(page) < 1024, "the desktop nav");
    await page.addInitScript(() => {
      const w = window as unknown as { __glides: number };
      w.__glides = 0;
      const start = document.startViewTransition?.bind(document);
      if (start) {
        document.startViewTransition = ((update: () => void) => {
          w.__glides += 1;
          return start(update);
        }) as typeof document.startViewTransition;
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const nav = page.getByRole("navigation", { name: "Primary" });
    for (const [label, id] of [
      ["Record", "record"],
      ["About", "about"],
      ["Contact", "contact"],
    ] as const) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await page.waitForFunction(() => !document.documentElement.hasAttribute("data-glide"));
      const [top, y] = await page.locator(`#${id}`).evaluate((el) => [el.getBoundingClientRect().top, window.scrollY]);
      // Its top lands at the section's scroll margin (80px, under the 56px
      // header); About is the page's top.
      if (id === "about") expect(y, `${label} lands at the page's top`).toBe(0);
      else expect(Math.abs(top - 80), `${label} lands at its top`).toBeLessThan(4);
      expect(new URL(page.url()).hash).toBe(`#${id}`);
    }
    expect(await page.evaluate(() => (window as unknown as { __glides: number }).__glides)).toBe(3);
  });

  test("an in-page link glides too, and the browser still owns the fragment", async ({ page }) => {
    test.skip(width(page) !== 1440, "run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "See what I've built" }).click();
    await page.waitForFunction(() => !document.documentElement.hasAttribute("data-glide"));
    expect(new URL(page.url()).hash).toBe("#tree");
    const top = await page.locator("#tree").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top - 80)).toBeLessThan(4);
    // Back is the browser's history entry.
    await page.goBack();
    await expect.poll(() => new URL(page.url()).hash).toBe("");
  });

  test("under reduced motion a nav item jumps, with no transition", async ({ page }) => {
    test.skip(width(page) < 1024, "the desktop nav");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Record", exact: true }).click();
    await expect(page.locator("#record")).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-glide"))).toBe(false);
  });

  test("snapping is for scrolling: off once the address names a fragment, back when it does not", async ({ page }) => {
    test.skip(width(page) !== 1440, "run once");
    const snap = () => page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(await snap(), "proximity serialises as the axis alone").toBe("y");
    await page.getByRole("link", { name: "See what I've built" }).click();
    await expect.poll(() => new URL(page.url()).hash).toBe("#tree");
    expect(await snap(), "a fragment landing is not pulled back to a page's top").toBe("none");
    await page.goBack();
    await expect.poll(() => new URL(page.url()).hash).toBe("");
    expect(await snap(), "proximity serialises as the axis alone").toBe("y");
    // Cold, on a row near the Record's end (which the next page's snap point is near).
    await page.goto("about:blank");
    await page.goto("/#record-2019");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    const top = await page.locator("#record-2019").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top - 80), "the year row is where the link sent it").toBeLessThan(4);
  });

  test("the snapping never holds a long page: mid-Record a wheel scroll stays where it stops", async ({ page }) => {
    test.skip(width(page) > 414, "phones, where the Record is several screens tall");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const start = await page.locator("#record").evaluate((el) => el.getBoundingClientRect().top + window.scrollY + 1200);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), start);
    await page.mouse.move(100, 400);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(800);
    const y = await page.evaluate(() => window.scrollY);
    expect(Math.abs(y - (start + 300)), "no snap pulled it away").toBeLessThan(40);
  });
});
