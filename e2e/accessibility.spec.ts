import { test, expect } from "@playwright/test";

/** Converts a computed-style time value ("0.2s", "0.01ms", "200ms") to
 * milliseconds so reduced-motion durations can be compared numerically
 * regardless of which unit the browser chose to serialise. */
function parseCssTimeToMs(value: string): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("ms")) return parseFloat(trimmed);
  if (trimmed.endsWith("s")) return parseFloat(trimmed) * 1000;
  return parseFloat(trimmed);
}

test("heading order never skips a level, document-wide", async ({ page }) => {
  await page.goto("/");
  const levels = await page.evaluate(() =>
    Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => Number(el.tagName[1])),
  );

  expect(levels[0], "the page's first heading must be the single <h1>").toBe(1);

  const skips: string[] = [];
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) skips.push(`h${levels[i - 1]} -> h${levels[i]} (position ${i})`);
  }
  expect(skips, skips.join(", ")).toEqual([]);
});

test("every interactive element has an accessible name", async ({ page }) => {
  await page.goto("/");

  // A deliberately approximate (not spec-complete) accessible-name
  // computation: aria-label, then aria-labelledby, then label association
  // for form controls, then text content — enough to catch a genuinely
  // nameless control without pulling in an accessibility-tree library.
  const unnamed = await page.evaluate(() => {
    function isHiddenFromAT(el: Element): boolean {
      return el.closest('[aria-hidden="true"]') !== null;
    }
    function accessibleNameApprox(el: Element): string {
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel?.trim()) return ariaLabel.trim();

      const labelledBy = el.getAttribute("aria-labelledby");
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" ")
          .trim();
        if (text) return text;
      }

      const tag = el.tagName.toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") {
        const id = el.getAttribute("id");
        if (id) {
          const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (label?.textContent?.trim()) return label.textContent.trim();
        }
        const wrapping = el.closest("label");
        if (wrapping?.textContent?.trim()) return wrapping.textContent.trim();
        return el.getAttribute("title")?.trim() ?? "";
      }

      return el.textContent?.trim() || el.getAttribute("title")?.trim() || "";
    }

    const selector =
      'a[href], button, input:not([type="hidden"]), select, textarea, ' +
      '[role="tab"], [role="radio"], [role="button"], [role="link"]';
    const offenders: string[] = [];
    for (const el of Array.from(document.querySelectorAll(selector))) {
      if (isHiddenFromAT(el)) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (accessibleNameApprox(el).length === 0) {
        offenders.push(el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ""));
      }
    }
    return offenders;
  });

  expect(unnamed, `elements missing an accessible name: ${unnamed.join(", ")}`).toEqual([]);
});

test("focus is visible on keyboard navigation", async ({ page }) => {
  await page.goto("/");

  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      return { outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth) };
    });
    expect(outline, `Tab press #${i + 1} left no element focused`).not.toBeNull();
    expect(outline?.outlineStyle, `Tab press #${i + 1}`).not.toBe("none");
    expect(outline?.outlineWidth ?? 0, `Tab press #${i + 1}`).toBeGreaterThan(0);
  }
});

test("prefers-reduced-motion: reduce is honoured", async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "reduce" });

  const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(scrollBehavior).toBe("auto");

  const trigger = page.locator("#work").getByRole("button", { name: /Read the full case study/ }).first();
  const panelId = await trigger.getAttribute("aria-controls");
  await trigger.click();

  const duration = await page.evaluate((id) => {
    const panel = id ? document.getElementById(id) : null;
    return panel ? getComputedStyle(panel).transitionDuration : null;
  }, panelId);

  expect(duration, "disclosure panel must expose a transition-duration").not.toBeNull();
  expect(parseCssTimeToMs(duration ?? "1s")).toBeLessThan(5);
});

test("no console.error and no React hydration warnings on load", async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
    if (msg.type() === "warning") warnings.push(msg.text());
  });
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Hydration-mismatch warnings can land a beat after `load`/`networkidle`.
  await page.waitForTimeout(500);

  expect(pageErrors, `uncaught page errors: ${pageErrors.join(" | ")}`).toEqual([]);
  expect(errors, `console.error messages: ${errors.join(" | ")}`).toEqual([]);

  const hydrationPattern =
    /hydrat|did not match|server rendered html|content does not match|switched to client rendering/i;
  const hydrationHits = [...errors, ...warnings].filter((message) => hydrationPattern.test(message));
  expect(hydrationHits, `hydration-related console messages: ${hydrationHits.join(" | ")}`).toEqual([]);
});

/**
 * The guard on the test directly above. `SiteAnalytics.tsx` mounts Vercel Web
 * Analytics and Speed Insights only when `VERCEL_ENV === "production"`, which
 * is never true in dev or under Playwright — and that gate is what keeps the
 * zero-`console.error` assertion above honest. Ungated, `@vercel/analytics`
 * fetches a debug script from va.vercel-scripts.com on every dev page load, so
 * an offline or sandboxed run would fail that test for a reason that has
 * nothing to do with the page.
 *
 * Asserted on the network rather than on the absence of a `<script>` tag,
 * because both packages inject their tag from an effect: a tag-only check
 * would pass while the request was still going out.
 */
test("ships no analytics requests outside a production deployment", async ({ page }) => {
  const analyticsRequests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/va\.vercel-scripts\.com|\/_vercel\/(insights|speed-insights)/.test(url)) {
      analyticsRequests.push(url);
    }
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expect(
    analyticsRequests,
    `analytics requests leaked into a non-production build: ${analyticsRequests.join(" | ")}`,
  ).toEqual([]);
});

/**
 * The disclosure the analytics gate above is the other half of. Vercel Web
 * Analytics needs no consent banner (cookieless, no personal data), so this
 * one colophon line is the whole of what the page says about measuring itself
 * — which makes it worth pinning, so it cannot quietly disappear while the
 * scripts stay.
 */
test("the footer discloses the analytics in one plain line", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("contentinfo").getByText("Anonymous page counts, no cookies (Vercel)"),
  ).toBeVisible();
});
