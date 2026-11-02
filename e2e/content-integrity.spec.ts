import { test, expect, type Page } from "@playwright/test";

const DESKTOP_MIN_WIDTH = 1024;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

test.beforeEach(async ({ page }) => {
  // Playwright retries clicks until an element is actionable, but it dispatches
  // key presses immediately and reads the DOM immediately. Both race React's
  // hydration on a page this long, which is how a suite that passed became
  // intermittently red once sections were reordered. Waiting for the network to
  // settle is the closest available "the islands are live now" signal.
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});

/** Clicks every currently-visible, currently-collapsed disclosure trigger
 * inside <main> until none remain. Scoped to #main (not `page`) so it never
 * touches the header's mobile-menu toggle, which also uses `aria-expanded`
 * but is a separate concern (its own test below) and would otherwise get
 * clicked first and occlude the rest of the page behind its fixed panel.
 *
 * Runs entirely inside the page (native `.click()`, one rAF between clicks
 * for React to commit) rather than one Playwright `locator.click()` per
 * button: with 20+ disclosures on the page, Playwright's per-click
 * actionability wait ("is this element done animating and stable") against
 * genuinely-animating neighbours made the naive version time out on mobile.
 *
 * (Until round 23 the Record's rows opened one at a time and were forced
 * open with a test-only stylesheet; the Diary has no rows, so nothing is.) */
async function expandAllDisclosures(page: Page): Promise<void> {
  // Hydrated, so a click on a trigger is handled rather than lost.
  await expect(page.locator("#record [data-diary]")).toHaveAttribute("data-live", "");
  await page.evaluate(async () => {
    const isVisible = (el: HTMLElement) => el.offsetParent !== null;
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    let guard = 0;
    while (guard < 200) {
      const buttons = Array.from(
        document.querySelectorAll<HTMLElement>('#main button[aria-expanded="false"]'),
      ).filter(isVisible);
      if (buttons.length === 0) break;
      buttons[0].click();
      await nextFrame();
      guard++;
    }
  });
}

test("no [NEEDS INPUT marker is rendered anywhere, with every disclosure expanded", async ({ page }) => {
  await expandAllDisclosures(page);
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("[NEEDS INPUT");
});

test("no [NEEDS INPUT marker is rendered with the mobile menu open", async ({ page }) => {
  test.skip(viewportWidth(page) >= DESKTOP_MIN_WIDTH, "mobile-menu-only state");
  await page.getByRole("button", { name: /Open menu/ }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("[NEEDS INPUT");
});

test('no external link is missing rel="noopener noreferrer"', async ({ page }) => {
  await expandAllDisclosures(page);

  const offenders = await page.evaluate(() => {
    const bad: string[] = [];
    document.querySelectorAll('a[target="_blank"]').forEach((a) => {
      const rel = (a.getAttribute("rel") ?? "").split(/\s+/);
      if (!rel.includes("noopener") || !rel.includes("noreferrer")) {
        bad.push(a.getAttribute("href") ?? a.outerHTML.slice(0, 80));
      }
    });
    return bad;
  });

  expect(offenders, `links missing rel="noopener noreferrer": ${offenders.join(", ")}`).toEqual([]);
});

test("no <img> is missing an alt attribute", async ({ page }) => {
  const offenders = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img"))
      .filter((img) => !img.hasAttribute("alt"))
      .map((img) => img.outerHTML.slice(0, 80)),
  );
  expect(offenders, `<img> elements missing alt: ${offenders.join(", ")}`).toEqual([]);
});
