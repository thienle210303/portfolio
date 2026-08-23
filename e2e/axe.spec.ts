import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Result } from "axe-core";

/**
 * Automated accessibility auditing via axe-core, on top of the hand-rolled
 * sweeps in accessibility.spec.ts (heading order, accessible names, focus
 * visibility). Those catch structural mistakes; axe additionally catches
 * things like colour contrast, ARIA attribute misuse and duplicate ids that
 * a hand-rolled sweep does not attempt.
 *
 * Every test is pinned to exactly one project via `test.skip` so a real
 * audit runs once per state rather than once per viewport (contrast and
 * ARIA structure do not change with viewport width) — mirroring the
 * `viewportWidth` + `test.skip` pattern already used across this suite.
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const MOBILE_WIDTH = 375;
const DESKTOP_WIDTH = 1440;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

function formatViolations(violations: readonly Result[]): string {
  if (violations.length === 0) return "";
  return violations
    .map((violation) => {
      const selectors = violation.nodes.map((node) => node.target.join(" ")).join("; ");
      return `[${violation.id}] (${violation.impact ?? "unknown impact"}) ${violation.help} -- selectors: ${selectors}`;
    })
    .join("\n");
}

/** Runs an axe audit restricted to SPEC's five WCAG tag levels and asserts
 * zero violations, reporting every rule id + offending selector on failure.
 * Never narrows the rule set beyond `include` — no rule is ever disabled. */
async function auditHasNoViolations(page: Page, include?: string): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

/**
 * Scroll-before-audit (Workstream 3 — the ink-reveal pass's own test-impact
 * note). `#lab` and `#closing` sit well below the fold, and every section's
 * eyebrow/h2/lead/rail now settle via `InkReveal` (`Section`/`SectionHeading`,
 * globals.css) — pre-reveal, that text sits at `opacity: 0` until the section
 * scrolls into view. Auditing it unscrolled would ask axe to run its colour-
 * contrast rule against text that genuinely isn't there yet, which doesn't
 * fail the rule so much as silently skip it — a false pass, not a real one.
 * Scrolling the target into view and giving the settle transition time to
 * finish (`--dur-settle` is 500ms; a full second here is comfortable slack,
 * not a tuned minimum) means the audit sees the same fully-opaque content a
 * real visitor does by the time they've scrolled this far down the page.
 */
async function scrollIntoViewAndSettle(page: Page, selector: string): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
}

test.describe("full-page audit", () => {
  test("zero WCAG violations at a mobile viewport", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "run once, at a representative mobile width");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await auditHasNoViolations(page);
  });

  test("zero WCAG violations at a desktop viewport", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once, at a representative desktop width");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await auditHasNoViolations(page);
  });
});

test.describe("interactive states", () => {
  test("zero WCAG violations with the mobile menu open", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "mobile-menu-only state; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Open menu/ }).click();
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
    await auditHasNoViolations(page);
  });

  test("zero WCAG violations with a case-study disclosure expanded", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Settle `#work`'s own eyebrow/h2 first (Workstream 3 — see
    // `scrollIntoViewAndSettle`'s own comment above), *before* jumping
    // straight to a trigger further down the section. Locator actions
    // scroll their target into view with a single instant jump, not an
    // animated one — the target can land already past the viewport's far
    // edge in one step, with no intermediate frame in which the section's
    // own heading was ever intersecting. `IntersectionObserver` only fires
    // on an actual crossing, so a heading skipped over that way in one jump
    // can be left permanently pending. Settling it explicitly first sidesteps
    // that race rather than depending on where the trigger below happens to
    // sit relative to it.
    await scrollIntoViewAndSettle(page, "#work-heading");
    const trigger = page.locator("#work").getByRole("button", { name: /Read the full case study/ }).first();
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await auditHasNoViolations(page);
  });

  test("zero WCAG violations with the origin-story player open", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "the player only mounts at >=1024px; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollIntoViewAndSettle(page, "#tree-heading");
    const button = page.locator("#tree").getByRole("button", { name: "Watch how it grew" });
    await button.click();
    await expect(page.locator("[data-origin-stage]")).toBeVisible();
    await auditHasNoViolations(page);
  });
});

/**
 * Sections that leave the base ground. Every semantic colour alias is
 * repointed by the tone class, so these are the likeliest places for a
 * contrast regression to hide: `deep` is a half-step off the base, and
 * `contrast` changes the ground out from under every nested component at once.
 */
test.describe("off-base section tones", () => {
  test("AI Workflow Lab (#lab, tone deep) has zero WCAG violations", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollIntoViewAndSettle(page, "#lab");
    await auditHasNoViolations(page, "#lab");
  });

  test("closing section (#closing, tone contrast) has zero WCAG violations", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollIntoViewAndSettle(page, "#closing");
    await auditHasNoViolations(page, "#closing");
  });
});

/**
 * The night theme, audited as its own surface.
 *
 * Everything above runs against whatever theme the browser resolves to, which
 * under Playwright's default `colorScheme` is day — so without this block an
 * entire second palette would ship with zero automated contrast coverage.
 *
 * The theme is set the way a visitor sets it: seed `localStorage` before the
 * document runs, so the inline theme script in layout.tsx reads it and stamps
 * `data-theme` before first paint. Forcing the attribute afterwards would
 * bypass the very code path that is supposed to keep the two in agreement.
 */
test.describe("night theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("theme", "night"));
  });

  test("stamps data-theme before paint", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "theme resolution is viewport-independent");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  });

  test("zero WCAG violations across the full page", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await auditHasNoViolations(page);
  });

  test("zero WCAG violations in the deep and contrast tones", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollIntoViewAndSettle(page, "#lab");
    await auditHasNoViolations(page, "#lab");
    await scrollIntoViewAndSettle(page, "#closing");
    await auditHasNoViolations(page, "#closing");
  });
});

/**
 * Deliberately outside the `night theme` describe above, which seeds
 * localStorage from an init script — and an init script re-runs on every
 * navigation, so it would overwrite the very preference this test writes and
 * make the reload assertion measure the seed rather than the toggle.
 *
 * Starting from no stored preference is also the more honest path: it is what
 * a first-time visitor actually gets.
 */
test.describe("theme toggle", () => {
  test("switches theme, keeps its label truthful, and persists across a reload", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");

    // No stored preference and no forced colour scheme, so the inline script
    // resolves the default.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");

    await page.getByRole("button", { name: "Switch to night theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");

    // The label must follow the state, or the control lies to a screen reader
    // about what pressing it will do next.
    await expect(page.getByRole("button", { name: "Switch to day theme" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Switch to night theme" })).toHaveCount(0);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");

    await page.getByRole("button", { name: "Switch to day theme" }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  });
});
