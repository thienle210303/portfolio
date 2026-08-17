import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The companion cats and their quick-actions toolkit.
 *
 * The cats are decoration with a job attached, and the job is what these tests
 * cover: they must be operable by keyboard, must never be the only route to
 * anything, must stay out of the way when a visitor asks for less motion, must
 * never park on top of content, and must be removable — with a way back from
 * everything except the one action that says it has no way back.
 *
 * Their animation is deliberately not asserted. Pose, phase and position are
 * cosmetic, one of the two cats is deliberately non-deterministic, and pinning
 * any of it would make the suite fail every time the drawing is retouched.
 */

const DESKTOP_WIDTH = 1440;
const MOBILE_WIDTH = 375;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

/** The lead cat: the only companion element with an accessible name, because
 *  it is the only one that is a control. */
function catButton(page: Page) {
  return page.getByRole("button", { name: /quick actions/i });
}

function restingBox(page: Page) {
  return page.getByRole("button", { name: /wake the cats/i });
}

test.describe("companion", () => {
  test("opens and closes its toolkit, and Escape returns focus to the cat", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cat = catButton(page);
    await expect(cat).toHaveAttribute("aria-expanded", "false");

    await cat.click();
    await expect(cat).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: /^GitHub/ }).last()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(cat).toHaveAttribute("aria-expanded", "false");
    await expect(cat).toBeFocused();
  });

  test("is reachable and operable by keyboard alone", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cat = catButton(page);
    await cat.focus();
    await expect(cat).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(cat).toHaveAttribute("aria-expanded", "true");

    // Opening moves focus into the panel, so the first Tab stays inside it
    // rather than stranding the visitor back at the top of the document.
    const focusedInPanel = await page.evaluate(() =>
      document.getElementById("companion-actions")?.contains(document.activeElement),
    );
    expect(focusedInPanel).toBe(true);
  });

  test("every toolkit action also exists elsewhere on the page", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "content is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await catButton(page).click();

    const panel = page.locator("#companion-actions");

    // Section jumps resolve to real sections.
    // Root-relative, so the toolkit works from /resume as well as from home.
    for (const id of ["work", "journey", "skills", "contact"]) {
      const link = panel.locator(`a[href="/#${id}"]`);
      await expect(link).toHaveCount(1);
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    // The social links point at the same URLs the footer already carries, so
    // the cats are a shortcut rather than a second source of truth.
    for (const name of [/^GitHub/, /^LinkedIn/]) {
      const inPanel = panel.getByRole("link", { name });
      const href = await inPanel.getAttribute("href");
      expect(href).toBeTruthy();
      await expect(page.locator(`footer a[href="${href}"]`)).toHaveCount(1);
      await expect(inPanel).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  test("draws two independently positioned cats, not one pair", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Two separately positioned elements is the whole point of FB-6: one
    // element containing both cats cannot give them different behaviour. Their
    // *positions* are not asserted — the tabby is deliberately erratic.
    await expect(page.locator("[data-companion] svg")).toHaveCount(2);

    const placement = await page.evaluate(() => {
      const wrappers = Array.from(document.querySelectorAll("[data-companion] svg")).map(
        (svg) => svg.closest("[data-companion] > *") as HTMLElement | null,
      );
      return {
        distinct: new Set(wrappers).size,
        positioned: wrappers.filter((el) => el?.style.transform.includes("translate3d")).length,
      };
    });
    expect(placement.distinct).toBe(2);
    expect(placement.positioned).toBe(2);
  });

  test("sends the cats to a visible resting box, which brings them back", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await catButton(page).click();
    await page.getByRole("button", { name: /send the cats away/i }).click();

    // Gone from roaming, but not gone: the bed is a real, labelled control and
    // focus has followed the visitor into it.
    await expect(catButton(page)).toHaveCount(0);
    await expect(restingBox(page)).toBeVisible();
    await expect(restingBox(page)).toBeFocused();

    // Survives a reload — this is a preference, not a session quirk.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(catButton(page)).toHaveCount(0);
    await expect(restingBox(page)).toBeVisible();

    // And the way back exists, which is the entire point of FB-5.
    await restingBox(page).click();
    await expect(catButton(page)).toBeVisible();
    await expect(restingBox(page)).toHaveCount(0);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(catButton(page)).toBeVisible();
  });

  test("can be turned off for good, from the toolkit and from the box", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await catButton(page).click();
    await page.getByRole("button", { name: /turn the cats off/i }).click();

    // Nothing companion-related is left anywhere on the page.
    await expect(catButton(page)).toHaveCount(0);
    await expect(restingBox(page)).toHaveCount(0);
    await expect(page.locator("[data-companion]")).toHaveCount(0);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("[data-companion]")).toHaveCount(0);

    // Nothing else on the page depends on them: contact routes still resolve.
    await expect(page.locator("#contact")).toBeVisible();

    // The same escape hatch is reachable from the bed, without waking them
    // first — a visitor who wants them gone should never have to let them out.
    await page.evaluate(() => window.localStorage.setItem("companion", "resting"));
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(restingBox(page)).toBeVisible();
    await page.getByRole("button", { name: /turn the cats off/i }).click();
    await expect(page.locator("[data-companion]")).toHaveCount(0);
  });

  test("never comes to rest on top of readable content", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Park the pointer in the middle of the hero's prose and let them settle.
    // Passing overlap while they walk is fine and deliberate; what must never
    // happen is a cat asleep on a paragraph — so this polls rather than waiting
    // a fixed time, which also keeps it honest about *when* the rule applies.
    const prose = page.locator("#main p").first();
    await prose.scrollIntoViewIfNeeded();
    const box = await prose.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const readable =
              "p,h1,h2,h3,h4,h5,h6,li,dt,dd,blockquote,pre,code,figure,table,a,button,input,textarea,select,label";
            return Array.from(document.querySelectorAll("[data-companion] svg")).flatMap((svg) => {
              const rect = svg.getBoundingClientRect();
              // The feet and the belly, which is where a cat actually rests.
              const points: Array<[number, number]> = [
                [rect.left + 6, rect.bottom - 6],
                [rect.right - 6, rect.bottom - 6],
                [rect.left + rect.width / 2, rect.top + rect.height * 0.6],
              ];
              return points.flatMap(([x, y]) =>
                document
                  .elementsFromPoint(x, y)
                  .filter((el) => !el.closest("[data-companion]"))
                  .slice(0, 1)
                  .filter((el) => el.closest(readable))
                  .map((el) => `${el.tagName.toLowerCase()} at ${Math.round(x)},${Math.round(y)}`),
              );
            });
          }),
        { timeout: 10_000, message: "a cat came to rest on top of content" },
      )
      .toEqual([]);
  });

  test("does not roam when the visitor asks for reduced motion", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: DESKTOP_WIDTH, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cat = catButton(page);
    const before = await cat.boundingBox();
    await page.mouse.move(300, 300);
    await page.mouse.move(1100, 700);
    await page.waitForTimeout(600);
    const after = await cat.boundingBox();

    expect(before).not.toBeNull();
    expect(after).toEqual(before);
    // Still fully usable — they are parked, not removed.
    await cat.click();
    await expect(cat).toHaveAttribute("aria-expanded", "true");

    // And the dismissal still works, without any of the escort theatrics: the
    // cats are in the box the moment the action is taken.
    await page.getByRole("button", { name: /send the cats away/i }).click();
    await expect(restingBox(page)).toBeVisible();
    await expect(catButton(page)).toHaveCount(0);
    // No third cat anywhere: the police escort is skipped entirely here.
    await expect(page.locator("[data-companion] svg")).toHaveCount(2);

    await context.close();
  });

  test("adds no WCAG violations with its toolkit open", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await catButton(page).click();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations,
      results.violations.map((violation) => `[${violation.id}] ${violation.help}`).join("\n"),
    ).toEqual([]);
  });

  test("adds no WCAG violations with the cats in their box", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.localStorage.setItem("companion", "resting"));
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(restingBox(page)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations,
      results.violations.map((violation) => `[${violation.id}] ${violation.help}`).join("\n"),
    ).toEqual([]);
  });

  test("is not printed", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "print CSS is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.emulateMedia({ media: "print" });
    await expect(catButton(page)).toBeHidden();
  });
});
