import { test, expect, type Page } from "@playwright/test";

/**
 * Round 25: nothing meant to be read is cut off.
 *
 * `responsive.spec.ts` proves the page does not scroll sideways, but it skips
 * every element under a clipping ancestor, and almost every section clips. So
 * a board laid out wider than its window passed: at 1280 the Journey's swing
 * caption read "…hi, in love", cropped by `#tree`, and nothing failed. This
 * spec asks the other question: for every run of visible text, is any of it
 * outside the window or outside a box that clips it?
 *
 * It pins its own widths (the nine of design/system/README.md §1, including
 * 430, 1280 and 1920, which have no project of their own), so it runs once.
 */

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920] as const;
const HEIGHT: Record<number, number> = {
  320: 568, 375: 667, 390: 844, 430: 932, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080,
};
/** A rotated tag's corner, a hanging quote mark: a pixel or two is not a crop. */
const TOLERANCE_PX = 3;

interface Cropped {
  readonly text: string;
  readonly by: number;
  readonly edge: "left" | "right";
  readonly clippedBy: string;
}

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  // Walk the page so every lazy island and scroll reveal has run.
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

async function findCroppedText(page: Page): Promise<Cropped[]> {
  return page.evaluate((tolerance) => {
    const found: Cropped[] = [];
    const seen = new Set<string>();
    // Not `[aria-hidden]`: a caption a screen reader gets from a label is
    // still words a sighted reader sees cropped (the swing's caption is one).
    const SKIP = "[hidden], [inert], [data-companion], svg, script, style, noscript, template, dialog:not([open])";

    /** The sr-only pattern: a 1px box clipped to nothing, by design. */
    function visuallyHidden(el: Element): boolean {
      for (let node: Element | null = el; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.clip.startsWith("rect(0px") || style.clipPath === "inset(50%)") return true;
      }
      return false;
    }

    /** The horizontal span this node may be seen in, or null when a
     *  scrollable ancestor means the reader can simply bring it into view. */
    function visibleSpan(el: Element): { left: number; right: number; by: string } | null {
      let left = 0;
      let right = window.innerWidth;
      let by = "the window";
      for (let node = el.parentElement; node && node !== document.documentElement; node = node.parentElement) {
        const style = getComputedStyle(node);
        const x = style.overflowX;
        if (x === "auto" || x === "scroll") return null;
        if (x === "hidden" || x === "clip") {
          // A scroll container that hides its bar is still a scroller (the
          // Diary's track); what is off to its side is another page.
          if (node.scrollWidth > node.clientWidth + 1 && x === "hidden") return null;
          const rect = node.getBoundingClientRect();
          if (rect.left > left) {
            left = rect.left;
            by = node.id ? `#${node.id}` : `${node.tagName.toLowerCase()}.${(node.getAttribute("class") ?? "").split(" ")[0]}`;
          }
          if (rect.right < right) {
            right = rect.right;
            by = node.id ? `#${node.id}` : `${node.tagName.toLowerCase()}.${(node.getAttribute("class") ?? "").split(" ")[0]}`;
          }
        }
      }
      return { left, right, by };
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? "";
      const parent = node.parentElement;
      if (!text || !parent || parent.closest(SKIP)) continue;
      if (!parent.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true })) continue;
      if (visuallyHidden(parent)) continue;

      const span = visibleSpan(parent);
      if (!span) continue;
      range.selectNodeContents(node);
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width === 0 || rect.height === 0) continue;
        const overRight = rect.right - span.right;
        const overLeft = span.left - rect.left;
        const by = Math.max(overRight, overLeft);
        if (by <= tolerance) continue;
        const key = `${text.slice(0, 40)}|${span.by}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push({
          text: text.slice(0, 60),
          by: Math.round(by),
          edge: overRight > overLeft ? "right" : "left",
          clippedBy: span.by,
        });
      }
    }
    return found.slice(0, 20);
  }, TOLERANCE_PX);
}

for (const theme of ["day", "night"] as const) {
  for (const width of WIDTHS) {
    test(`no text is cut off at ${width} (${theme})`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium-1440", "pins its own viewports; run once");
      // The cats wander on a fine pointer and are not part of this question.
      await page.addInitScript((value) => {
        try {
          window.localStorage.setItem("theme", value);
        } catch {
          /* private mode */
        }
      }, theme);
      await page.setViewportSize({ width, height: HEIGHT[width] });
      await page.goto("/");
      await settle(page);
      const cropped = await findCroppedText(page);
      expect(cropped, `text cut off at ${width}: ${JSON.stringify(cropped, null, 2)}`).toEqual([]);
    });
  }
}
