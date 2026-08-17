import { test, expect, type Page } from "@playwright/test";

/**
 * SPEC §3 (responsive contract): zero page-level horizontal overflow at
 * every configured viewport (320/375/390/768/1024/1440 — see
 * playwright.config.ts), the hero code panel scrolls inside itself, and the
 * page stays usable at simulated 200% zoom. This file runs once per project
 * (one project per viewport) via playwright.config.ts's project matrix.
 */

const OVERFLOW_TOLERANCE_PX = 1;

test.beforeEach(async ({ page }) => {
  // Playwright retries clicks until an element is actionable, but it dispatches
  // key presses immediately and reads the DOM immediately. Both race React's
  // hydration on a page this long, which is how a suite that passed became
  // intermittently red once sections were reordered. Waiting for the network to
  // settle is the closest available "the islands are live now" signal.
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});

/** Scrolls window to the bottom in steps, then back to top, so any layout
 * that only settles once content has been scrolled into view has a chance
 * to run before the overflow assertions below are made. */
async function scrollThroughPage(page: Page): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = 600;
  for (let y = 0; y < height; y += step) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(25);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(50);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function assertNoPageOverflow(page: Page): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    scrollWidth,
    `document.documentElement.scrollWidth (${scrollWidth}) exceeds window.innerWidth (${innerWidth})`,
  ).toBeLessThanOrEqual(innerWidth + OVERFLOW_TOLERANCE_PX);
}

interface Offender {
  readonly tag: string;
  readonly cls: string;
  readonly right: number;
  readonly viewportWidth: number;
}

/** Sweeps every rendered element for one whose right edge pokes past the
 * viewport, skipping: elements inside a container that is allowed to
 * scroll/clip internally (the hero code panel, CodeBlocks generally), and
 * elements deliberately parked off-canvas to the left (the honeypot field,
 * the skip link before it receives focus). */
async function findHorizontalOverflowOffenders(page: Page): Promise<Offender[]> {
  return page.evaluate((tolerance) => {
    const vw = window.innerWidth;
    const offenders: Offender[] = [];

    function hasClippingAncestor(el: Element): boolean {
      let node = el.parentElement;
      while (node && node !== document.body) {
        const overflowX = getComputedStyle(node).overflowX;
        if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden" || overflowX === "clip") {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    }

    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (style.position === "absolute" || style.position === "fixed") {
        const left = parseFloat(style.left);
        if (!Number.isNaN(left) && left < 0) continue;
      }
      if (hasClippingAncestor(el)) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right - vw > tolerance) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute("class") ?? "").slice(0, 70),
          right: Math.round(rect.right),
          viewportWidth: vw,
        });
      }
    }
    return offenders.slice(0, 12);
  }, OVERFLOW_TOLERANCE_PX);
}

test("has no page-level horizontal overflow after scrolling through the full page", async ({ page }) => {
  await scrollThroughPage(page);
  await assertNoPageOverflow(page);
});

test("no element visibly overflows the viewport horizontally", async ({ page }) => {
  await scrollThroughPage(page);
  const offenders = await findHorizontalOverflowOffenders(page);
  expect(offenders, `overflowing elements: ${JSON.stringify(offenders, null, 2)}`).toEqual([]);
});

test("hero code artifact panel scrolls inside itself, never the page", async ({ page }) => {
  // "builder.ts" is codeTabs[0]'s filename — the tab selected by default, so
  // its CodeBlock <pre role="region"> is present without any interaction.
  const region = page.getByRole("region", { name: "builder.ts" });
  await expect(region).toBeVisible();
  const overflowX = await region.evaluate((el) => getComputedStyle(el).overflowX);
  expect(overflowX, "hero code panel must declare overflow-x: auto to scroll internally").toBe("auto");
  await assertNoPageOverflow(page);
});

test("stays free of horizontal overflow at simulated 200% zoom", async ({ page }) => {
  const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
  await page.setViewportSize({
    width: Math.max(1, Math.round(viewport.width / 2)),
    height: Math.max(1, Math.round(viewport.height / 2)),
  });
  await scrollThroughPage(page);
  await assertNoPageOverflow(page);
});
