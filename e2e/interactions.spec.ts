import { test, expect, type Locator, type Page } from "@playwright/test";
import { resumeLenses } from "../src/content/portfolio";
import { workflowStages } from "../src/content/ai-experiments";

const DESKTOP_MIN_WIDTH = 1024;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
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
async function connectorGapsPx(list: Locator): Promise<number[]> {
  return list.evaluate((listEl) => {
    const items = Array.from(listEl.children) as HTMLElement[];
    const gaps: number[] = [];
    for (let i = 0; i < items.length - 1; i++) {
      const line = items[i].querySelector(':scope > [aria-hidden="true"] > .w-px');
      const dot = items[i + 1].querySelector(':scope > [aria-hidden="true"] > .rounded-full');
      if (!line || !dot) continue;
      gaps.push(dot.getBoundingClientRect().top - line.getBoundingClientRect().bottom);
    }
    return gaps;
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
      }
    }
  });
});

test.describe("résumé lens x depth", () => {
  const GROUP_IDS = ["resume-group-experience", "resume-group-skills", "resume-group-milestones"];

  test("all 12 lens x depth combinations avoid an unexplained empty pane; Deep Dive shows more than Quick Scan", async ({
    page,
  }) => {
    const resume = page.locator("#resume");
    const lensGroup = resume.getByRole("radiogroup", { name: "Filter résumé by lens" });
    const depthGroup = resume.getByRole("group", { name: "Résumé detail level" });
    const pane = resume.getByRole("status").filter({ hasText: "Showing" }).locator("xpath=..");

    for (const lensLabel of ["All", ...resumeLenses.map((lens) => lens.label)]) {
      await lensGroup.getByRole("radio", { name: lensLabel }).click();

      for (const groupId of GROUP_IDS) {
        const panel = page.locator(`#${groupId}-panel`);
        const hasEntries = (await panel.locator('[role="list"] > *').count()) > 0;
        const hasExplanation = (await panel.getByText(/match this lens/).count()) > 0;
        expect(hasEntries || hasExplanation, `lens "${lensLabel}": #${groupId} is empty with no explanation`).toBe(
          true,
        );
      }

      await depthGroup.getByRole("button", { name: "Quick Scan" }).click();
      const quickLength = (await pane.innerText()).length;
      await depthGroup.getByRole("button", { name: "Deep Dive" }).click();
      const deepLength = (await pane.innerText()).length;
      expect(deepLength, `lens "${lensLabel}": Deep Dive should show more than Quick Scan`).toBeGreaterThan(
        quickLength,
      );
    }
  });

  test("reset returns lens and depth to their defaults and becomes disabled", async ({ page }) => {
    const resume = page.locator("#resume");
    const resetButton = resume.getByRole("button", { name: "Reset filters" });
    await expect(resetButton).toBeDisabled();

    await resume
      .getByRole("radiogroup", { name: "Filter résumé by lens" })
      .getByRole("radio", { name: resumeLenses[0].label })
      .click();
    await resume.getByRole("group", { name: "Résumé detail level" }).getByRole("button", { name: "Deep Dive" }).click();
    await expect(resetButton).toBeEnabled();

    await resetButton.click();
    await expect(resetButton).toBeDisabled();
    await expect(
      resume.getByRole("radiogroup", { name: "Filter résumé by lens" }).getByRole("radio", { name: "All" }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      resume.getByRole("group", { name: "Résumé detail level" }).getByRole("button", { name: "Quick Scan" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("hero code panel", () => {
  test("scrolls inside itself at 320px while the page itself does not", async ({ page }) => {
    test.skip(viewportWidth(page) !== 320, "smallest configured viewport only");

    const region = page.getByRole("region", { name: "builder.ts" });
    await region.evaluate((el) => {
      el.scrollLeft = 200;
    });
    const panelScroll = await region.evaluate((el) => el.scrollLeft);
    const pageScrollX = await page.evaluate(() => window.scrollX);
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

    expect(panelScroll, "the hero code panel should have scrolled internally").toBeGreaterThan(0);
    expect(pageScrollX, "the page itself must not have scrolled horizontally").toBe(0);
    expect(pageOverflow, "the page must not gain horizontal overflow from the internal scroll").toBeLessThanOrEqual(
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
