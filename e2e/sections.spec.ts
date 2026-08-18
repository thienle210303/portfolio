import { test, expect, type Page } from "@playwright/test";
import { careerEntries, codeTabs } from "../src/content/portfolio";
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

test.describe("career tree", () => {
  test("the section renders", async ({ page }) => {
    await expect(page.locator("#tree")).toBeVisible();
  });

  test("the drawing shows at >=1024px with the list hidden, and the reverse below it", async ({
    page,
  }) => {
    const tree = page.locator("#tree");

    // The drawn presentation's leaves end their accessible name in "Show
    // detail — …" and the list presentation's lens-level toggles end theirs
    // in "Show what sits under …" (Disclosure appends the label after the
    // summary text) — two different controls with two different accessible
    // names, so a substring match on either is a reliable "which
    // presentation is actually in the tree" probe. See
    // src/sections/CareerTree/KnowledgeTree.tsx for why exactly one of the
    // two presentations is ever in the accessibility tree at a given width.
    const drawingLeaf = tree.getByRole("button", { name: /Show detail — /}).first();
    const listLens = tree.getByRole("button", { name: /Show what sits under /}).first();

    if (viewportWidth(page) >= DESKTOP_MIN_WIDTH) {
      await expect(drawingLeaf).toBeVisible();
      await expect(listLens).toBeHidden();
    } else {
      await expect(drawingLeaf).toBeHidden();
      await expect(listLens).toBeVisible();
    }
  });

  test("opening a leaf reveals its detail, including the case-study link when one exists", async ({
    page,
  }) => {
    test.skip(
      viewportWidth(page) < DESKTOP_MIN_WIDTH,
      "a leaf is only its own control in the drawn presentation — see KnowledgeTreeList.tsx",
    );

    const tree = page.locator("#tree");
    // DoorDash carries two case studies (src/content/portfolio.ts,
    // careerEntryId "doordash"), and appears as a leaf on every lens it is
    // tagged with, so any leaf bearing its name is a leaf known to have a
    // case-study link once opened. Resolved to a fixed id before clicking,
    // not kept as a live role/name locator: expanding it flips its own
    // accessible name from "Show detail — …" to "Hide detail — …"
    // (Disclosure's expandLabel/collapseLabel swap), which would otherwise
    // make a `/Show detail — /` locator silently re-resolve to a *different*
    // DoorDash leaf the moment this one opens.
    const candidateId = await tree
      .getByRole("button", { name: /Show detail — /})
      .filter({ hasText: "DoorDash, Inc." })
      .first()
      .getAttribute("id");
    expect(candidateId, "expected at least one DoorDash leaf trigger").toBeTruthy();
    const trigger = page.locator(`#${candidateId}`);

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const panelId = await trigger.getAttribute("aria-controls");
    expect(panelId, "Disclosure trigger must expose aria-controls").toBeTruthy();
    const panel = page.locator(`#${panelId}`);

    // Detail: kind + date range always renders once opened.
    await expect(panel.getByText(/Role · /)).toBeVisible();

    // The case-study link, present because this leaf has one — points at
    // the section that actually holds it, and that section exists.
    const caseStudyLink = panel.locator('a[href="#work"]');
    await expect(caseStudyLink).toBeVisible();
    await expect(page.locator("#work")).toHaveCount(1);
  });

  /*
   * The leaves' second cross-link: back to the one timeline entry each leaf
   * was built from (`#journey-entry-<id>`, src/sections/CareerJourney/
   * anchors.ts). Three things about it are worth a test rather than a
   * reading, because all three failed a first attempt at this feature:
   *
   *   - it exists only inside an *open* leaf, so twenty-five leaves do not
   *     become twenty-five tab stops;
   *   - it lands clear of the 4rem sticky header;
   *   - it works while the timeline is filtered to a category that excludes
   *     the entry, which is the case where a plain fragment link silently
   *     does nothing.
   */
  const linkedEntry = careerEntries.find(
    (entry) => entry.type === "milestone" && entry.lenses.length > 0,
  );
  if (!linkedEntry) {
    throw new Error("content fixture assumption failed: no lens-tagged milestone entry found");
  }
  // A milestone, deliberately: the "Work" filter below then genuinely
  // excludes it, which is the state this whole mechanism exists for.
  const ENTRY_ANCHOR = `journey-entry-${linkedEntry.id}`;

  test("every timeline link the tree renders resolves to a real entry", async ({ page }) => {
    const unresolved = await page.evaluate(() => {
      const links = [...document.querySelectorAll('#tree a[href^="#journey-entry-"]')];
      return links
        .map((link) => link.getAttribute("href") ?? "")
        .filter((href) => document.getElementById(href.slice(1)) === null);
    });
    expect(unresolved, "a leaf must render no link rather than a dead fragment").toEqual([]);
    expect(
      await page.locator('#tree a[href^="#journey-entry-"]').count(),
      "the tree should link at the timeline at all",
    ).toBeGreaterThan(0);
  });

  test("a leaf's timeline link is in the tab order only while that leaf is open", async ({
    page,
  }) => {
    test.skip(
      viewportWidth(page) < DESKTOP_MIN_WIDTH,
      "a leaf is only its own control in the drawn presentation — see KnowledgeTreeList.tsx",
    );

    const tree = page.locator("#tree");
    const triggerId = await tree
      .locator(`button[id^="tree-leaf-"][id$="-${linkedEntry.id}-trigger"]`)
      .first()
      .getAttribute("id");
    expect(triggerId, `expected a leaf for career entry "${linkedEntry.id}"`).toBeTruthy();
    const trigger = page.locator(`#${triggerId}`);
    const panelId = await trigger.getAttribute("aria-controls");
    const link = page.locator(`#${panelId} a[href="#${ENTRY_ANCHOR}"]`);

    // Collapsed: Disclosure holds its panel at `visibility: hidden`, which
    // takes the link out of the tab order and the accessibility tree both.
    await expect(link).toBeHidden();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(link).toBeVisible();

    await trigger.click();
    await expect(link).toBeHidden();

    // Hidden is the mechanism; out of the tab order is the point. Same probe
    // the case-study disclosure above uses.
    await trigger.focus();
    await page.keyboard.press("Tab");
    const landedInPanel = await page.evaluate((id) => {
      const panel = id ? document.getElementById(id) : null;
      return panel ? panel.contains(document.activeElement) : false;
    }, panelId);
    expect(landedInPanel, "Tab from a collapsed leaf must not reach its timeline link").toBe(false);
  });

  test("a leaf's timeline link lands on its entry even when the filter excludes it", async ({
    page,
  }) => {
    const journey = page.locator("#journey");
    const tree = page.locator("#tree");

    await journey.getByRole("radio", { name: "Work" }).click();
    await expect(page.locator(`#${ENTRY_ANCHOR}`)).toHaveCount(0);

    if (viewportWidth(page) >= DESKTOP_MIN_WIDTH) {
      // The drawing keeps each leaf's link in that leaf's own panel; the list
      // presentation keeps it in the branch row, inside the lens's panel,
      // which is already open for the first lens.
      await tree
        .locator(`button[id^="tree-leaf-"][id$="-${linkedEntry.id}-trigger"]`)
        .first()
        .click();
    }
    // Whichever presentation is displayed at this width — the other one is
    // `display: none`, so its copy of the same link is not visible.
    const link = tree.locator(`a[href="#${ENTRY_ANCHOR}"]:visible`).first();
    await link.scrollIntoViewIfNeeded();
    await link.click();

    const entry = page.locator(`#${ENTRY_ANCHOR}`);
    await expect(entry).toBeVisible();
    await expect(entry).toBeFocused();
    // The filter was widened to include it again, and the live region says
    // what is actually showing.
    await expect(journey.getByRole("radio", { name: "All" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // And it landed below the sticky header rather than behind it. Polled,
    // because the scroll is smooth unless the visitor asked otherwise.
    await expect
      .poll(async () => entry.evaluate((element) => Math.round(element.getBoundingClientRect().top)), {
        message: "the entry must come to rest clear of the 4rem sticky header",
      })
      .toBeGreaterThanOrEqual(64);
    const rest = await entry.evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      viewport: window.innerHeight,
    }));
    expect(rest.top, "inside the viewport").toBeLessThan(rest.viewport);
  });

  test("a cold load of an entry's fragment lands on it, clear of the header", async ({ page }) => {
    await page.goto(`/#${ENTRY_ANCHOR}`);
    await page.waitForLoadState("networkidle");

    const entry = page.locator(`#${ENTRY_ANCHOR}`);
    await expect(entry).toBeVisible();
    await expect(entry).toBeFocused();

    await expect
      .poll(async () => entry.evaluate((element) => Math.round(element.getBoundingClientRect().top)), {
        message: "a cold load must come to rest clear of the 4rem sticky header",
      })
      .toBeGreaterThanOrEqual(64);
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
