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

test.describe("full-page audit", () => {
  test("zero WCAG violations at a mobile viewport", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "run once, at a representative mobile width");
    await page.goto("/");
    await auditHasNoViolations(page);
  });

  test("zero WCAG violations at a desktop viewport", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once, at a representative desktop width");
    await page.goto("/");
    await auditHasNoViolations(page);
  });
});

test.describe("interactive states", () => {
  test("zero WCAG violations with the mobile menu open", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "mobile-menu-only state; run once");
    await page.goto("/");
    await page.getByRole("button", { name: /Open menu/ }).click();
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
    await auditHasNoViolations(page);
  });

  test("zero WCAG violations with a case-study disclosure expanded", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    const trigger = page.locator("#work").getByRole("button", { name: /Read the full case study/ }).first();
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
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
    await auditHasNoViolations(page, "#lab");
  });

  test("closing section (#closing, tone contrast) has zero WCAG violations", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
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
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  });

  test("zero WCAG violations across the full page", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await auditHasNoViolations(page);
  });

  test("zero WCAG violations in the deep and contrast tones", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await auditHasNoViolations(page, "#lab");
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
