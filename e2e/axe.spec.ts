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
 * note). `#closing` sits well below the fold, and every section's
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

/**
 * Wait for the Journey's stage to have gone live *and* settled before a
 * full-page audit. Going live re-styles every unreached branch from the
 * finished tree's opacity 1 to the pin's 0; until the final fix wave that ran
 * as a 500ms fade, and an audit landing inside it measured a branch at
 * ~1.05:1 — a real frame, but one no reader is meant to dwell on (Ruling 84).
 * The product fix is that nothing transitions until `data-stage-settled`
 * (`Stage.tsx`), so the switch is a cut; this wait is the spec's own half,
 * so an audit never samples the page between hydration and the stage's first
 * painted act. Both attributes are set at every width wherever an
 * IntersectionObserver exists, so this never waits on a pin that a narrow
 * viewport does not have — and a stage that never goes live fails here, by
 * name, instead of passing an audit of the static layout.
 */
async function stageSettled(page: Page): Promise<void> {
  await expect(page.locator("#tree [data-stage]")).toHaveAttribute("data-stage-live", "");
  await expect(page.locator("#tree [data-stage]")).toHaveAttribute("data-stage-settled", "");
}

test.describe("full-page audit", () => {
  test("zero WCAG violations at a mobile viewport", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "run once, at a representative mobile width");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await stageSettled(page);
    await auditHasNoViolations(page);
  });

  test("zero WCAG violations at a desktop viewport", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "run once, at a representative desktop width");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await stageSettled(page);
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
    // Settle `#tree`'s own eyebrow/h2 first (Workstream 3 — see
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
    await scrollIntoViewAndSettle(page, "#tree-heading");
    // The coursework and capstone case studies render after the stage and are
    // always in the document; the ones inside a branch sit in a collapsed
    // panel, which this test would have to open first.
    const trigger = page
      .locator("#tree [data-unbranched-case-studies]")
      .getByRole("button", { name: /Read the full case study/ })
      .first();
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Let the companions finish moving before the audit. The scroll above
    // sends the pair on a multi-second walk back to the reading band, and
    // during that transit the follower can pass through the lead's toggle
    // clearance — the same mid-stride state round 8 ruled a permitted
    // design behavior when a placement test photographed it (companion
    // tests poll for settled before asserting for exactly this reason).
    // The audit's contract is the resting UI. The transit window itself is
    // real and tracked for shrinking (follower should trail the lead's
    // live position on long walks — see the round-15 tracker entry), but
    // sampling mid-walk here would fail on motion the design permits.
    await page
      .waitForFunction(
        () => {
          const buttons = document.querySelectorAll<HTMLElement>(
            "button.pointer-events-auto.absolute",
          );
          const now = [...buttons].map((b) => b.style.transform).join("|");
          const w = window as unknown as { __axeCatSample?: string; __axeCatStable?: number };
          w.__axeCatStable = w.__axeCatSample === now ? (w.__axeCatStable ?? 0) + 1 : 0;
          w.__axeCatSample = now;
          return w.__axeCatStable >= 3;
        },
        { polling: 250, timeout: 20_000 },
      )
      .catch(() => {
        // Cats that never fully settle (a scheduled scene) shouldn't dead-end
        // the audit; the assertion below still runs against whatever state
        // exists, exactly as it always did.
      });
    await auditHasNoViolations(page);
  });

  test("zero WCAG violations with the origin-story player open", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "the player only mounts at >=1024px; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollIntoViewAndSettle(page, "#tree-heading");
    const button = page.locator("#tree").getByRole("button", { name: "Watch how it grew" });
    // Round 18's second plan put this control on the *finished* tree: while the
    // pin is in force and the acts are still running, the stylesheet hides it so
    // it cannot compete with the scrubber. "Show me the whole tree" is the end
    // state. The locator above is unchanged; only the route to it is new.
    await page.locator("#tree").getByRole("button", { name: "Show me the whole tree" }).click();
    await button.click();
    await expect(page.locator("[data-origin-stage]")).toBeVisible();
    // The stage mounting is also the instant `OriginStory.tsx`'s conductor
    // stamps `data-origin-running` and starts fading out the tree's own
    // non-growable chrome — a branch's summary card and a leaf's disclosure
    // text (globals.css, "Origin story v2 — chronological growth":
    // `[data-origin-running] [data-origin-pending] [data-tree-panel]` and
    // friends) — over `--dur-settle` (500ms), holding `visibility: visible` for
    // nearly the whole transition so the fade actually plays. Auditing the
    // instant the stage appears catches that fade mid-flight: a card at
    // `opacity: 0.05` and `visibility: visible` is a real, if momentary,
    // contrast violation to axe, even though it is milliseconds away from
    // settling honestly (hidden) or reverting (Skip/Escape). Polling for the
    // computed `visibility` that transition ends on — rather than a fixed wait
    // guessing how long it takes — settles exactly when the fade finishes, on
    // any machine.
    //
    // This polled the root plinth's own `[data-cat-nap] > p` until round 18
    // stopped rendering the plinth and the root labels; the branch panels are
    // what carries the same fade now. `-1` rather than `0` when there are no
    // panels at all, so a drawing that stopped rendering them could not make
    // this poll succeed by having nothing to wait for.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const panels = Array.from(
            document.querySelectorAll<HTMLElement>("#tree [data-tree-panel]"),
          );
          if (panels.length === 0) return -1;
          return panels.filter((el) => getComputedStyle(el).visibility === "hidden").length;
        }),
      )
      .toBeGreaterThan(0);
    await auditHasNoViolations(page);
  });

  test("zero WCAG violations with the chat in Contact loaded and answered, by day and by night", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // The chat lives in Contact's `#ask` (round 18, see AskLoader.tsx) and
    // is a dynamically-imported chunk that loads only as the block nears the
    // viewport. Audits taken from the top run before it exists, and the ones
    // that scroll past Contact to `#closing` may catch it loaded or mid-load,
    // with no turn asked. It is the page's most interactive component, so it
    // earns its own audit, loaded for certain and with a turn on screen.
    await scrollIntoViewAndSettle(page, "#ask");
    const questionField = page.getByRole("textbox", { name: "Ask a question about this portfolio" });
    await expect(questionField).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Where did he study?" }).click();
    await expect(page.getByRole("list", { name: "Conversation" }).getByText("Where did he study?")).toBeVisible();
    // Scoped to the chat's block rather than the full page, same pattern as
    // the off-base-tone audits below: the fact worth auditing here is the
    // chat's own markup with a turn on screen — in Contact's `deep` tone —
    // not the whole page over again.
    for (const theme of ["day", "night"] as const) {
      if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
        await page.getByRole("button", { name: `Switch to ${theme} theme` }).click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      }
      await auditHasNoViolations(page, "#ask");
    }
  });

  test("zero WCAG violations with the globe landed and the handoff link shown", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // The one piece of UI on this page that does not exist until a visitor
    // does something: `#worlds` renders the career-tree handoff link only once
    // the flight has actually landed and a seed is on the globe (see
    // `WorldsStage.tsx`). Every other audit in this file sees the section in
    // its pre-flight state, so without this the link ships with no automated
    // coverage at all — and it is a prose link on a `tone="deep"` ground,
    // which is both a contrast pair and axe's `link-in-text-block` rule (a
    // link may not be distinguished from its surrounding text by colour
    // alone; `.ink-link`'s resting underline is what satisfies it).
    await scrollIntoViewAndSettle(page, "#worlds-heading");
    const fly = page.locator("#worlds").getByRole("button", { name: /take the flight/i });
    await expect(fly).toBeVisible({ timeout: 30_000 });
    await fly.click();
    await expect(
      page.locator("#worlds").getByRole("link", { name: /career tree/i }),
    ).toBeVisible({ timeout: 15_000 });
    await auditHasNoViolations(page, "#worlds");
  });
});

/**
 * Sections that leave the base ground. Every semantic colour alias is
 * repointed by the tone class, so these are the likeliest places for a
 * contrast regression to hide: `deep` is a half-step off the base, and
 * `contrast` changes the ground out from under every nested component at once.
 */
test.describe("off-base section tones", () => {
  test("Worlds (#worlds, tone deep) has zero WCAG violations", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollIntoViewAndSettle(page, "#worlds-heading");
    await auditHasNoViolations(page, "#worlds");
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
    await stageSettled(page);
    await auditHasNoViolations(page);
  });

  test("zero WCAG violations in the deep and contrast tones", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollIntoViewAndSettle(page, "#closing");
    await auditHasNoViolations(page, "#closing");
    // The globe is `tone="deep"`: its stage and list. The full-page audits
    // above see it too, but scoped is what reports a contrast pair against
    // `--color-paper-deep` as belonging to the section that owns it.
    await scrollIntoViewAndSettle(page, "#worlds-heading");
    await auditHasNoViolations(page, "#worlds");
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
