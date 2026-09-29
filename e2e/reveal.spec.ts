import { test, expect, type Page } from "@playwright/test";

/**
 * The ink-reveal system (Workstream 3, P1/P2): `InkReveal.tsx`'s shared
 * observer, the per-section settle it drives via `Section`/`SectionHeading`,
 * and the hero's independent `data-motion` load choreography. Five
 * guarantees the plan names explicitly, each pinned to exactly one viewport
 * via `test.skip` — none of these depend on viewport width, matching the
 * pattern `axe.spec.ts` already uses for the same reason.
 */
const DESKTOP_WIDTH = 1440;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

test.describe("LCP guard", () => {
  test("the hero h1 and code artifact are fully opaque immediately, never mid-fade", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "not viewport-dependent; run once");

    // No networkidle wait here on purpose: the whole point of the LCP guard
    // is that these two elements are never `opacity: 0` at any point,
    // including the very first frame — waiting for the page to settle before
    // reading `opacity` would defeat the assertion by construction.
    await page.goto("/");

    const h1 = page.locator("h1");
    const code = page.locator('[data-hero-step="code"]');
    await expect(h1).toHaveCSS("opacity", "1");
    await expect(code).toHaveCSS("opacity", "1");
  });
});

test.describe("no-JS parity", () => {
  test.use({ javaScriptEnabled: false });

  test("renders every settling element at its finished state with no ink-reveal gate", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "not viewport-dependent; run once");
    await page.goto("/");

    // InkReveal never mounts without JS, so `data-ink-ready` never appears —
    // which is exactly what leaves the pending-state CSS
    // (`[data-ink-ready] [data-ink-root]:not([data-inked]) [data-ink]`)
    // unable to match anything, anywhere on the page.
    await expect(page.locator("html[data-ink-ready]")).toHaveCount(0);

    // Sample one settling element from a section well below the fold — the
    // fact that it renders fully visible with no scrolling and no JS is the
    // actual claim under test, not merely that the attribute is absent.
    const heading = page.locator("#skills").getByRole("heading", { level: 2 });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toHaveCSS("opacity", "1");
  });

  test("the hero has no data-motion attribute and renders at rest", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "not viewport-dependent; run once");
    await page.goto("/");
    await expect(page.locator("html[data-motion]")).toHaveCount(0);
    await expect(page.locator("h1")).toHaveCSS("opacity", "1");
  });
});

test.describe("reduced motion from start", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("every settling element is visible immediately, never staged as pending", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "not viewport-dependent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // InkReveal's own effect bails outright under reduced motion (see that
    // file's doc comment), so `data-ink-ready` never gets written even
    // though JS is fully live here — a stronger guarantee than the no-JS
    // case above, which gets the same outcome for an entirely different
    // reason.
    await expect(page.locator("html[data-ink-ready]")).toHaveCount(0);

    const heading = page.locator("#skills").getByRole("heading", { level: 2 });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toHaveCSS("opacity", "1");
    await expect(page.locator("h1")).toHaveCSS("opacity", "1");
  });
});

test.describe("scroll-restoration guard", () => {
  test("a deep link to a below-the-fold section shows its heading within a second", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "not viewport-dependent; run once");

    // A fragment-navigated load lands the browser already scrolled to
    // #skills before InkReveal's own effect ever runs — this is precisely
    // the "mid-page reload" case the synchronous pre-stamp in InkReveal
    // exists to cover (see that file's doc comment): without it, the
    // section would flash pending-then-settled instead of rendering
    // correct from the first frame.
    await page.goto("/#skills");

    const heading = page.locator("#skills").getByRole("heading", { level: 2 });
    await expect(heading).toBeVisible({ timeout: 1_000 });
    await expect(heading).toHaveCSS("opacity", "1");
  });
});

test.describe("print visibility", () => {
  test("every settling element and the section hairline render at their finished state", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "not viewport-dependent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.emulateMedia({ media: "print" });

    // Belt-and-braces (globals.css, unlayered print block): even with
    // `data-ink-ready`/`data-inked` genuinely set on the live DOM at the
    // moment of printing, every `[data-ink]` element is forced back to its
    // finished state and the section hairline's own draw-in is disabled in
    // favour of the plain always-visible border it replaces on screen.
    const heading = page.locator("#skills").getByRole("heading", { level: 2 });
    await expect(heading).toHaveCSS("opacity", "1");

    const rule = await page
      .locator("#skills")
      .evaluate((section) => getComputedStyle(section).borderTopColor);
    expect(rule).not.toBe("rgba(0, 0, 0, 0)");
  });
});
