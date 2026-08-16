import { test, expect, type Page } from "@playwright/test";
import { codeTabs } from "../src/content/portfolio";
import { workflowStages, experiments } from "../src/content/ai-experiments";

// Matches the `lg:` breakpoint (1024px) that switches the workflow explorer
// between its desktop tablist and its mobile accordion stack.
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

test.describe("hero", () => {
  test("exactly one h1 renders on the page", async ({ page }) => {
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("code artifact tabs switch panels via mouse and keyboard", async ({ page }) => {
    const tablist = page.getByRole("tablist", { name: "Code artifact tabs" });
    const tabs = tablist.getByRole("tab");
    await expect(tabs).toHaveCount(codeTabs.length);

    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("region", { name: codeTabs[1].filename })).toBeVisible();

    await tabs.nth(1).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(2)).toBeFocused();

    await page.keyboard.press("Home");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("region", { name: codeTabs[0].filename })).toBeVisible();
  });
});

test.describe("selected work", () => {
  test("a case-study disclosure expands and collapses; collapsed content is not reachable by Tab", async ({
    page,
  }) => {
    const work = page.locator("#work");
    const trigger = work.getByRole("button", { name: /Read the full case study/ }).first();
    const panelId = await trigger.getAttribute("aria-controls");

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(work.getByRole("heading", { name: "Problem", level: 4 }).first()).toBeVisible();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(work.getByRole("heading", { name: "Problem", level: 4 }).first()).toBeHidden();

    await trigger.focus();
    await page.keyboard.press("Tab");
    const stillInsidePanel = await page.evaluate((id) => {
      const panel = id ? document.getElementById(id) : null;
      return panel ? panel.contains(document.activeElement) : false;
    }, panelId);
    expect(stillInsidePanel, "Tab from the collapsed trigger must not land inside its panel").toBe(false);
  });
});

test.describe("ai workflow lab", () => {
  test("workflow explorer selects stages by keyboard on desktop", async ({ page }) => {
    test.skip(viewportWidth(page) < DESKTOP_MIN_WIDTH, "desktop-only explorer");

    const tablist = page.getByRole("tablist", { name: "Workflow stages" });
    const tabs = tablist.getByRole("tab");
    const heading = page.getByRole("tabpanel").locator("h4");
    const before = await heading.textContent();

    await tabs.first().focus();
    await page.keyboard.press("ArrowDown");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(heading).not.toHaveText(before ?? "");
  });

  test("workflow explorer renders accordions on mobile", async ({ page }) => {
    test.skip(viewportWidth(page) >= DESKTOP_MIN_WIDTH, "mobile-only accordions");

    await expect(page.getByRole("tablist", { name: "Workflow stages" })).toBeHidden();
    const firstStage = page.getByRole("button", { name: workflowStages[0].label });
    await firstStage.click();
    await expect(firstStage).toHaveAttribute("aria-expanded", "true");
  });

  test("an Exploring experiment shows no fabricated outcome", async ({ page }) => {
    const exploring = experiments.find((experiment) => experiment.status === "Exploring");
    if (!exploring) throw new Error("content fixture assumption failed: no Exploring experiment found");

    const article = page
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: exploring.title, level: 4 }) });
    await article.getByRole("button", { name: /Read the full experiment/ }).click();

    await expect(article.getByText("No results yet — this is an open question.")).toBeVisible();
    await expect(article.getByText("Outcome", { exact: true })).toHaveCount(0);
  });
});

test.describe("career journey", () => {
  test("filters change the visible entry count and announce it in a live region", async ({ page }) => {
    const journey = page.locator("#journey");
    const list = journey.getByRole("list", { name: "Career timeline" });
    const status = journey.getByRole("status").filter({ hasText: "Showing" });

    const allCount = await list.getByRole("listitem").count();
    const initialStatusText = await status.textContent();

    await journey.getByRole("radiogroup", { name: "Filter career entries by type" }).getByRole("radio", { name: "Work" }).click();

    await expect(status).not.toHaveText(initialStatusText ?? "");
    const workCount = await list.getByRole("listitem").count();
    expect(workCount).toBeGreaterThan(0);
    expect(workCount).toBeLessThan(allCount);
  });
});

test.describe("skills", () => {
  test("renders every category with its evidence, and rates nothing", async ({ page }) => {
    const skills = page.locator("#skills");
    await expect(skills).toBeVisible();

    // Skills moved here when the résumé section was removed; this is now the
    // only place on the page they appear, so an empty render would silently
    // lose content rather than merely look wrong.
    const categories = skills.locator("ul > li > h3");
    expect(await categories.count()).toBeGreaterThan(0);

    // No self-assigned proficiency. Checked as *rating widgets* rather than as
    // "no percentages anywhere" — an evidence line legitimately reads "92%
    // accuracy", which is a sourced measurement, not a rating of himself.
    await expect(skills.locator('[role="progressbar"], meter, progress')).toHaveCount(0);
    await expect(skills.getByText(/\d\s*\/\s*(5|10)\b/)).toHaveCount(0);
    await expect(skills.getByText(/★|⭐/)).toHaveCount(0);
  });
});
