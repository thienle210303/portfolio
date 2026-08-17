import { test, expect, type Locator, type Page } from "@playwright/test";
import { workflowStages } from "../src/content/ai-experiments";

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

test.describe("AI Workflow Lab stages", () => {
  test("every stage is keyboard-selectable on desktop, each showing distinct panel content", async ({ page }) => {
    test.skip(viewportWidth(page) < DESKTOP_MIN_WIDTH, "desktop-only tablist");

    const tabs = page.getByRole("tablist", { name: "Workflow stages" }).getByRole("tab");
    await expect(tabs).toHaveCount(workflowStages.length);

    const heading = page.getByRole("tabpanel").locator("h4");
    const seen = new Set<string>();
    await tabs.first().focus();

    for (let i = 0; i < workflowStages.length; i++) {
      await expect(tabs.nth(i)).toHaveAttribute("aria-selected", "true");
      await expect(tabs.nth(i)).toBeFocused();
      const text = ((await heading.textContent()) ?? "").trim();
      expect(text.length, `stage ${i + 1} panel must render a heading`).toBeGreaterThan(0);
      expect(seen.has(text), `stage ${i + 1} ("${text}") repeats a previous panel`).toBe(false);
      seen.add(text);
      if (i < workflowStages.length - 1) await page.keyboard.press("ArrowDown");
    }
  });
});

/** Bottom of entry i's drawn connector line vs. top of entry i+1's dot — the
 * true start/end of visible "ink", independent of the box model around it. */
/**
 * Vertical holes in the timeline's connector, in pixels.
 *
 * Measures segment-to-segment, not segment-to-next-dot. Each entry draws
 * its own segment and entries after the first begin at the top of their
 * box rather than at their marker, so the span between one segment's end
 * and the next marker is covered by that next entry's own segment. Judging
 * continuity against the marker therefore reports a phantom 8px break at
 * every boundary while the rendered line is unbroken.
 *
 * The invariant that actually matters is that no vertical span between the
 * first and last marker is left undrawn, so that is what this measures:
 * every segment's rect, sorted, with the hole before each one.
 */
async function connectorGapsPx(list: Locator): Promise<number[]> {
  return list.evaluate((listEl) => {
    const items = Array.from(listEl.children) as HTMLElement[];
    const segments = items
      .map((item) => item.querySelector(':scope > [aria-hidden="true"] > .w-px'))
      .filter((el): el is Element => el !== null)
      .map((el) => el.getBoundingClientRect())
      .sort((a, b) => a.top - b.top);

    const gaps: number[] = [];
    for (let i = 0; i < segments.length - 1; i++) {
      gaps.push(segments[i + 1].top - segments[i].bottom);
    }
    return gaps;
  });
}

/**
 * True when the drawn connector starts no lower than the first marker and
 * ends no higher than the last — i.e. it neither stubs above the first dot
 * nor dangles past the last one after filtering.
 */
async function connectorSpansMarkers(list: Locator): Promise<boolean> {
  return list.evaluate((listEl) => {
    const items = Array.from(listEl.children) as HTMLElement[];
    const rect = (el: Element | null) => (el ? el.getBoundingClientRect() : null);
    const dots = items
      .map((i) => rect(i.querySelector(':scope > [aria-hidden="true"] > .rounded-full')))
      .filter((r): r is DOMRect => r !== null);
    const segs = items
      .map((i) => rect(i.querySelector(':scope > [aria-hidden="true"] > .w-px')))
      .filter((r): r is DOMRect => r !== null)
      .sort((a, b) => a.top - b.top);
    if (dots.length < 2 || segs.length === 0) return true;

    const firstDot = dots[0];
    const lastDot = dots[dots.length - 1];
    const top = segs[0].top;
    const bottom = segs[segs.length - 1].bottom;
    return top >= firstDot.top - 1 && bottom <= lastDot.bottom + 1;
  });
}

test.describe("career timeline filters", () => {
  test("every filter's visible count matches the announced count, with no connector gap", async ({ page }) => {
    const journey = page.locator("#journey");
    const list = journey.getByRole("list", { name: "Career timeline" });
    const status = journey.getByRole("status").filter({ hasText: "Showing" });
    const radiogroup = journey.getByRole("radiogroup", { name: "Filter career entries by type" });

    for (const label of ["All", "Work", "Learning", "Milestones"]) {
      await radiogroup.getByRole("radio", { name: label }).click();

      const count = await list.getByRole("listitem").count();
      const statusText = (await status.textContent()) ?? "";
      const match = /Showing (?:all )?(\d+)/.exec(statusText);
      expect(match, `filter "${label}": status "${statusText}" should announce a count`).not.toBeNull();
      expect(count, `filter "${label}": visible vs. announced count`).toBe(Number(match?.[1]));

      if (count > 1) {
        for (const gap of await connectorGapsPx(list)) {
          expect(gap, `filter "${label}": connector line has a ${gap.toFixed(1)}px gap`).toBeLessThanOrEqual(1);
        }
        expect(
          await connectorSpansMarkers(list),
          `filter "${label}": connector must not stub above the first marker or dangle past the last`,
        ).toBe(true);
      }
    }
  });
});

test.describe("hero code panel", () => {
  // The panel wraps its lines now (owner feedback, round 6) — the internal
  // horizontal scroll this test used to exercise no longer exists. What
  // survives is the invariant the scroll existed to protect: nothing about
  // the code panel may move the page sideways at the smallest viewport.
  test("wraps at 320px and cannot scroll the page or itself sideways", async ({ page }) => {
    test.skip(viewportWidth(page) !== 320, "smallest configured viewport only");

    const region = page.getByRole("region", { name: "builder.ts" });
    await region.evaluate((el) => {
      el.scrollLeft = 200;
    });
    const panelScroll = await region.evaluate((el) => el.scrollLeft);
    const whiteSpace = await region.evaluate((el) => getComputedStyle(el).whiteSpace);
    const pageScrollX = await page.evaluate(() => window.scrollX);
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

    expect(whiteSpace, "the panel must wrap its lines").toBe("pre-wrap");
    expect(panelScroll, "a wrapped panel has nothing to scroll — scrollLeft must stay 0").toBe(0);
    expect(pageScrollX, "the page itself must not have scrolled horizontally").toBe(0);
    expect(pageOverflow, "the page must not gain horizontal overflow from the code panel").toBeLessThanOrEqual(
      1,
    );
  });
});

test.describe("reduced motion", () => {
  test("a disclosure still opens, closes, and stays keyboard-reachable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    // A journey entry known (from content) to carry a `link`, so its panel
    // is guaranteed at least one focusable element — Tab correctly skips
    // over prose-only panels (tags/lists aren't tab stops), so asserting
    // reachability needs an entry where landing inside is actually possible.
    const trigger = page.locator("#journey-wordification-trigger");
    const panelId = await trigger.getAttribute("aria-controls");

    await trigger.focus();
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Tab");
    const landedInPanel = await page.evaluate((id) => {
      const panel = id ? document.getElementById(id) : null;
      return panel ? panel.contains(document.activeElement) : false;
    }, panelId);
    expect(landedInPanel, "Tab from an open trigger must reach its panel under reduced motion").toBe(true);

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(`#${panelId}`)).toBeHidden();
  });
});
