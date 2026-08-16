import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Result } from "axe-core";

/**
 * The site guide — the two margin cats and their search panel.
 *
 * The behavioural promises this suite exists to hold, in the order they matter:
 *
 *  1. It never speaks first. Nothing is open, and nothing is fetched, until the
 *     visitor acts.
 *  2. Dismissing it is permanent, and the only way back is the footer.
 *  3. Reduced motion means genuinely no motion, not less motion.
 *  4. It is fully keyboard-operable with focus restored on close.
 *  5. It never causes horizontal overflow and never prints.
 */

/** Must match `@media (min-width: 64rem)` in globals.css. */
const LG_BREAKPOINT = 1024;
const DESKTOP_WIDTH = 1440;
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

function isDesktop(page: Page): boolean {
  return viewportWidth(page) >= LG_BREAKPOINT;
}

/** The launcher that is actually rendered at this viewport width. */
function visibleLauncher(page: Page) {
  return isDesktop(page)
    ? page.locator(".guide-launcher")
    : page.locator("header [data-guide-launcher]");
}

/**
 * Opens the panel, tolerating hydration timing.
 *
 * `SiteGuide` is a client island near the end of a document with several other
 * islands, and the desktop layout renders considerably more of them than the
 * mobile one. A click dispatched after `load` but before React has attached its
 * handlers is simply swallowed, which showed up as this spec passing at every
 * mobile width and timing out at 1024px — a hydration race, not a bug in the
 * component. `beforeEach` waits for `networkidle` to close most of that window;
 * this closes the rest.
 *
 * The click is guarded by a dialog-absent check so retries can only ever open
 * the panel, never toggle a slow-but-successful first click back shut.
 */
async function openGuide(page: Page) {
  const launcher = visibleLauncher(page);
  const dialog = page.getByRole("dialog");

  await expect(async () => {
    if ((await dialog.count()) === 0) await launcher.click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });

  return launcher;
}

function formatViolations(violations: readonly Result[]): string {
  return violations
    .map((violation) => {
      const selectors = violation.nodes.map((node) => node.target.join(" ")).join("; ");
      return `[${violation.id}] ${violation.help} -- ${selectors}`;
    })
    .join("\n");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // The guide is a client island; every test here needs its handlers attached.
  await page.waitForLoadState("networkidle");
});

test.describe("restraint", () => {
  test("nothing is open on arrival and the index is not even fetched", async ({ page }) => {
    // The single most important assertion in this file. A guide that greets
    // you, or that costs a request before you ask for anything, is the thing
    // this whole design is built to avoid.
    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("guide-index")) requests.push(request.url());
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(requests, "the index must not be fetched until the guide is opened").toEqual([]);
  });

  test("nothing leaves this origin, and no model weights load, without opting in", async ({
    page,
  }) => {
    // Tier 1's promise is "runs in this browser, nothing is sent anywhere", and
    // Tier 0's is that it costs nothing. Both reduce to: until a visitor clicks
    // the opt-in, there is no cross-origin traffic and no model payload.
    //
    // Deliberately asserted on request *hosts* and `.wasm`, not on chunk URLs.
    // The dynamic import in semantic.ts does code-split the ~500 KB library out
    // of the initial load — verified against a production build (`pnpm build &&
    // pnpm start` requests zero ML chunks on load) — but this suite runs against
    // `pnpm dev`, where Turbopack serves that chunk eagerly under a URL
    // containing the package name. Asserting on chunk names here would fail on a
    // dev-only bundling detail while proving nothing a visitor experiences.
    const offOrigin: string[] = [];
    const weights: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith("http://localhost:")) offOrigin.push(url);
      if (/\.wasm(\?|$)|\.onnx(\?|$)/i.test(url)) weights.push(url);
    });

    await page.reload();
    await page.waitForLoadState("networkidle");
    expect(offOrigin, "no third-party requests on page load").toEqual([]);
    expect(weights, "no model weights on page load").toEqual([]);

    await openGuide(page);
    await page.getByRole("textbox", { name: /search this page/i }).fill("scrapers");
    await expect(page.getByRole("dialog").locator("ul > li").first()).toBeVisible();

    // Searching works, and still nothing has been fetched from anywhere else.
    expect(offOrigin, "no third-party requests from searching").toEqual([]);
    expect(weights, "no model weights from searching").toEqual([]);
  });

  test("exactly one launcher is operable at any width", async ({ page }) => {
    const lane = page.locator(".guide-lane");
    const compact = page.locator("header [data-guide-launcher]");

    if (isDesktop(page)) {
      await expect(lane).toBeVisible();
      await expect(compact).toBeHidden();
    } else {
      // Cats walking around a phone screen are pure annoyance, so below `lg`
      // the guide keeps its usefulness and drops its bodies.
      await expect(lane).toBeHidden();
      await expect(compact).toBeVisible();
    }
  });

  test("the cats stay inside the gutter, never over the text column", async ({ page }) => {
    test.skip(!isDesktop(page), "the lane only renders at lg and above");

    const laneBox = await page.locator(".guide-lane").boundingBox();
    const headingBox = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(laneBox).not.toBeNull();
    expect(headingBox).not.toBeNull();

    // The lane must end before the content begins.
    expect(laneBox!.x + laneBox!.width).toBeLessThanOrEqual(headingBox!.x);
  });

  test("the guide never prints", async ({ page }) => {
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".guide-lane")).toBeHidden();
    await expect(page.locator("header [data-guide-launcher]")).toBeHidden();
  });
});

test.describe("search", () => {
  test("finds a passage and navigates to it, taking focus along", async ({ page }) => {
    await openGuide(page);

    const dialog = page.getByRole("dialog");
    // Focus lands in the input, so a keyboard visitor can type immediately.
    await expect(page.getByRole("textbox", { name: /search this page/i })).toBeFocused();

    // No results are shown before a query — an empty panel lists nothing.
    await expect(dialog.locator("ul")).toHaveCount(0);

    await page.getByRole("textbox", { name: /search this page/i }).fill("scrapers");
    const results = dialog.locator("ul > li");
    await expect(results.first()).toBeVisible();

    await results.first().getByRole("button").click();

    // Navigating closes the panel (it would otherwise cover the destination)
    // and leaves focus on the section, not just the scroll position. Two
    // separate things have to be right for this to pass: `gotoSection` must
    // focus the section at all (fragment navigation alone cannot focus a
    // non-interactive element), *and* the close must not restore focus to the
    // launcher afterwards, which would drag it straight back out.
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("#work")).toBeFocused();
  });

  test("a command that does not move focus still hands focus back on close", async ({ page }) => {
    // The other half of the focus contract. Printing closes the panel but moves
    // focus nowhere, so the launcher must get it back — otherwise a keyboard
    // visitor is left on <body>. Blanket-skipping the restore to fix the
    // navigation case above would regress exactly this.
    const launcher = await openGuide(page);

    // `window.print` blocks on a real dialog, so it is stubbed out; the focus
    // policy under test is the panel's, not the browser's.
    await page.evaluate(() => {
      window.print = () => {};
    });

    await page.getByRole("textbox", { name: /search this page/i }).fill("print resume");
    const first = page.getByRole("dialog").locator("ul > li").first();
    await expect(first).toContainText(/print the résumé/i);
    await first.getByRole("button").click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(launcher).toBeFocused();
  });

  test("says so plainly when the page has no answer", async ({ page }) => {
    await openGuide(page);
    await page
      .getByRole("textbox", { name: /search this page/i })
      .fill("kubernetes helm rustaceans");

    // Honesty over helpfulness: it must be able to come back empty rather than
    // padding the list with weak matches.
    await expect(page.getByText(/nothing on this page matches that/i)).toBeVisible();
  });

  test("a lens command drives the résumé's own filter chips", async ({ page }) => {
    await openGuide(page);
    await page.getByRole("textbox", { name: /search this page/i }).fill("filter automation");

    const first = page.getByRole("dialog").locator("ul > li").first();
    await expect(first).toContainText(/filter the résumé/i);
    await first.getByRole("button").click();

    // The command must not filter anything itself — it sets the same state the
    // section's own chips set. So the proof is the section's *existing* UI
    // reacting: the chip becomes checked and the live region reports the new
    // count. If the guide grew a private copy of the filter, this would fail.
    const chip = page.getByRole("radio", { name: /automation/i });
    await expect(chip).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("status").filter({ hasText: /résumé entr/i })).toContainText(
      /showing \d+ of \d+ résumé entr(y|ies) for automation/i,
    );
  });

  test("an imperative query surfaces the matching command", async ({ page }) => {
    await openGuide(page);
    await page.getByRole("textbox", { name: /search this page/i }).fill("print resume");

    const first = page.getByRole("dialog").locator("ul > li").first();
    await expect(first).toContainText(/print the résumé/i);
  });
});

test.describe("keyboard", () => {
  test("opens, traps focus, closes on Escape and restores focus", async ({ page }) => {
    // Opened with the keyboard, which is the point of this test — so it cannot
    // use `openGuide`. Instead it opens and closes once via the helper first,
    // purely to prove hydration has finished, then does the real keyboard run
    // against a component that is definitely listening.
    await openGuide(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const launcher = visibleLauncher(page);
    await launcher.focus();
    await expect(launcher).toBeFocused();

    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Tab must never escape the dialog while it is open.
    const focusables = dialog.locator("input, button:not([disabled])");
    const count = await focusables.count();
    for (let index = 0; index <= count; index += 1) {
      await page.keyboard.press("Tab");
      const insideDialog = await page.evaluate(() => {
        const active = document.activeElement;
        const panel = document.querySelector('[role="dialog"]');
        return Boolean(active && panel?.contains(active));
      });
      expect(insideDialog, `focus left the dialog after ${index + 1} Tab presses`).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(launcher).toBeFocused();
  });

  test("clicking the launcher again closes the panel rather than reopening it", async ({
    page,
  }) => {
    // Regression: the panel closes on outside `pointerdown`, and a launcher is
    // technically outside it. Without an explicit exemption the panel closed on
    // pointerdown and the launcher's own click handler then saw `open === false`
    // and reopened it, so the cats could never be clicked shut.
    const launcher = await openGuide(page);

    await launcher.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("dismissal", () => {
  test("is permanent across reloads, and only the footer brings it back", async ({ page }) => {
    await openGuide(page);
    await page.getByRole("button", { name: /hide the guide for good/i }).click();

    // Every launcher is gone, and focus has landed on the one control that can
    // undo it rather than falling to <body>.
    await expect(page.locator("[data-guide-launcher]")).toHaveCount(0);
    const revive = page.locator("#guide-revive");
    await expect(revive).toBeFocused();

    await page.reload();
    await expect(page.locator("[data-guide-launcher]")).toHaveCount(0);
    await expect(page.locator("#guide-revive")).toBeVisible();

    await page.locator("#guide-revive").click();
    await expect(visibleLauncher(page)).toBeVisible();
    // And the revive control retreats once it has nothing to offer.
    await expect(page.locator("#guide-revive")).toHaveCount(0);
  });
});

test.describe("reduced motion", () => {
  test("the cats do not move at all", async ({ page }) => {
    test.skip(!isDesktop(page), "the lane only renders at lg and above");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();

    const lane = page.locator(".guide-lane");

    // Wait for the hook to park it before sampling. Reading immediately after
    // reload caught `--guide-y` still unset, so the comparison below was ""
    // against "" — it would have passed for the wrong reason even if the
    // cats were moving freely.
    await expect
      .poll(async () => lane.evaluate((el) => el.style.getPropertyValue("--guide-y")))
      .not.toBe("");

    const before = await lane.evaluate((el) => el.style.getPropertyValue("--guide-y"));

    await page.evaluate(() => window.scrollTo({ top: 2500, behavior: "instant" }));
    await page.mouse.move(1200, 700);
    await page.waitForTimeout(500);

    const after = await lane.evaluate((el) => el.style.getPropertyValue("--guide-y"));
    const gaze = await lane.evaluate((el) => el.style.getPropertyValue("--guide-gaze"));

    // Reduced motion means no motion: the position is pinned and the head does
    // not turn. "Less movement" is not the contract.
    expect(after).toBe(before);
    expect(gaze).toBe("0deg");
    // And the walk cycle is never even armed.
    await expect(lane).not.toHaveAttribute("data-walking", "true");
  });

  test("but it still flips tone so it stays legible", async ({ page }) => {
    test.skip(!isDesktop(page), "the lane only renders at lg and above");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();

    // Contrast is not motion. A pinned lane still has light sections scrolling
    // underneath it, so the focus-ring tone sync must keep running.
    const lane = page.locator(".guide-lane");
    await page.evaluate(() => {
      const lab = document.getElementById("lab");
      if (lab) window.scrollTo({ top: lab.offsetTop + 200, behavior: "instant" });
    });
    await page.waitForTimeout(400);
    await expect(lane).toHaveClass(/on-light/);
  });
});

test.describe("layout safety", () => {
  test("adds no horizontal overflow, panel open or closed", async ({ page }) => {
    const overflow = async () =>
      page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

    expect(await overflow(), "closed").toBeLessThanOrEqual(0);

    await openGuide(page);
    expect(await overflow(), "panel open").toBeLessThanOrEqual(0);

    await page.getByRole("textbox", { name: /search this page/i }).fill("scrapers");
    await expect(page.getByRole("dialog").locator("ul > li").first()).toBeVisible();
    expect(await overflow(), "panel open with results").toBeLessThanOrEqual(0);
  });

  test("the panel never overlaps the sticky header", async ({ page }) => {
    await openGuide(page);
    await page.getByRole("textbox", { name: /search this page/i }).fill("a");

    const header = await page.locator("body > header").boundingBox();
    const dialog = await page.getByRole("dialog").boundingBox();
    expect(header).not.toBeNull();
    expect(dialog).not.toBeNull();
    expect(dialog!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
  });
});

test.describe("accessibility", () => {
  test("the open panel has zero WCAG violations", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once, at a representative width");

    await openGuide(page);
    await page.getByRole("textbox", { name: /search this page/i }).fill("scrapers");
    await expect(page.getByRole("dialog").locator("ul > li").first()).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test("the cats are decorative to assistive tech; the button carries the name", async ({
    page,
  }) => {
    test.skip(!isDesktop(page), "the lane only renders at lg and above");

    // The cats are an ornament. Their meaning lives in the button's accessible
    // name, so the SVG must not be announced separately.
    await expect(page.locator(".guide-cats")).toHaveAttribute("aria-hidden", "true");
    await expect(visibleLauncher(page)).toHaveAccessibleName(/site guide/i);
  });
});
