import { test, expect, type Locator, type Page } from "@playwright/test";
import { careerEntries, projects } from "../src/content/portfolio";
import { buildDrawnTree } from "../src/lib/knowledge-tree";
import { buildTerminal } from "../src/lib/terminal";

// Matches the `lg:` breakpoint (1024px) from which the Journey's drawing
// shows above its timeline.
const DESKTOP_MIN_WIDTH = 1024;

/**
 * Where a per-entry fragment comes to rest: `scroll-mt-20` (80px) on the
 * timeline row that carries it, which is the 3.5rem (56px) sticky header plus
 * 24px of air.
 */
const ENTRY_RESTING_TOP = 80;
/** A pixel or two of sub-pixel rounding, and nothing like enough to hide a
 *  scroll that stopped somewhere else entirely. */
const RESTING_TOLERANCE = 2;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

function viewportHeight(page: Page): number {
  return page.viewportSize()?.height ?? 0;
}

/**
 * The element's offset from the top of the viewport once it has stopped
 * moving.
 *
 * Deliberately not `expect.poll`: that returns on its first *passing* sample,
 * so a threshold assertion on a smooth scroll passes at whatever point the
 * scroll happens to be sampled at — a regression that parked the entry at
 * 400px would satisfy `>= 64` on the way past and never be seen. This polls
 * for stability instead: the same rounded offset three reads running, and
 * only then is it handed back to be asserted against the one number the
 * contract actually names.
 */
async function restingTop(element: Locator): Promise<number> {
  const read = () => element.evaluate((node) => Math.round(node.getBoundingClientRect().top));
  // Never accept a rest before the scroll has had a chance to start: with
  // JavaScript on, opening a row can move content above the target after the
  // browser's own first landing.
  await element.page().waitForTimeout(250);
  let stable = 0;
  let previous = await read();
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await element.page().waitForTimeout(100);
    const next = await read();
    stable = next === previous ? stable + 1 : 0;
    previous = next;
    if (stable >= 2) return next;
  }
  throw new Error(`element never stopped scrolling (last offset ${previous}px)`);
}

function expectSettledAtScrollMargin(top: number, message: string) {
  expect(top, message).toBeGreaterThanOrEqual(ENTRY_RESTING_TOP - RESTING_TOLERANCE);
  expect(top, message).toBeLessThanOrEqual(ENTRY_RESTING_TOP + RESTING_TOLERANCE);
}

test.beforeEach(async ({ page }) => {
  // Playwright retries clicks until an element is actionable, but it dispatches
  // key presses immediately and reads the DOM immediately. Both race React's
  // hydration on a page this long. `networkidle` was the old approximation of
  // "the islands are live now", and under full-matrix dev-server load it lied
  // often enough to flake a different click-based test on each run (hero tabs,
  // case-study disclosures — round 12's integration log has the tally).
  // `html[data-ink-ready]` is the real signal: InkReveal stamps it from a
  // client effect, and effects only flush after the hydration pass that
  // attaches every island's handlers has committed.
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Every test in this file runs with JavaScript on and motion allowed, the
  // two conditions under which InkReveal stamps the attribute. (A
  // "without JavaScript" describe used to share this hook and needed a guard
  // here; it went with the tree figure's page-load reveal it tested, and the
  // no-JS landing is `e2e/legacy-anchors.spec.ts`'s now.)
  await page.waitForSelector("html[data-ink-ready]", { timeout: 30_000 });
});

test.describe("hero", () => {
  test("exactly one h1 renders on the page", async ({ page }) => {
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("terminal tabs switch panels via mouse and keyboard", async ({ page }) => {
    const terminal = buildTerminal();
    const tablist = page.getByRole("tablist", { name: "Terminal" });
    const tabs = tablist.getByRole("tab");
    const panel = page.locator("#about").getByRole("tabpanel");
    await expect(tabs).toHaveCount(terminal.length);

    // Click-and-verify as one retried unit: `networkidle` in beforeEach only
    // approximates "the islands are live" (its own comment says so), and
    // under full-matrix dev-server load a click can land on a tablist React
    // has not attached to yet — the click succeeds, nothing flips, and a
    // plain assertion waits on state that will never arrive. Retrying the
    // click keeps the contract honest: a genuinely broken switch still
    // fails after the timeout.
    await expect(async () => {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true", { timeout: 1000 });
    }).toPass({ timeout: 15_000 });
    await expect(panel).toContainText(`$ ${terminal[1].command}`);

    await tabs.nth(1).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(2)).toBeFocused();

    await page.keyboard.press("Home");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(panel).toContainText(`$ ${terminal[0].command}`);
    await expect(panel).toContainText("motto: Practice makes AI.");
  });

  test("holds no chat: the Ask field lives in #contact", async ({ page }) => {
    const field = { name: "Ask a question about this portfolio" };
    await expect(page.getByRole("tab", { name: "Ask Thien" })).toHaveCount(0);
    await expect(page.locator("#about").getByRole("textbox", field)).toHaveCount(0);
    // AskLoader mounts the chat only as #ask nears the viewport.
    await page.locator("#ask").scrollIntoViewIfNeeded();
    await expect(page.locator("#contact").getByRole("textbox", field)).toHaveCount(1, { timeout: 15_000 });
  });
});

// Selected Work was deleted in round 18; its case studies render inside the
// Journey's branches. The ones that are not inside a branch (the coursework and
// the capstone) are always in the document, which is what makes them the one
// place this can be exercised without first opening a branch.
test.describe("case studies", () => {
  test("a case-study disclosure expands and collapses; collapsed content is not reachable by Tab", async ({
    page,
  }) => {
    const work = page.locator("#tree [data-unbranched-case-studies]");
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

test.describe("screen recordings", () => {
  const recorded = projects.filter((project) => project.recording);

  test("a full scroll, Journey included, requests nothing from /media/", async ({ page }) => {
    const media: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/media/")) media.push(request.url());
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = Math.max(200, Math.floor(viewportHeight(page) / 2));
    for (let y = 0; y <= height; y += step) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(40);
    }
    await page.waitForLoadState("networkidle");

    expect(await page.locator("#tree video").count(), "no <video> before a press").toBe(0);
    expect(media, "nothing under /media/ may load until a visitor asks").toEqual([]);
  });

  test("pressing play on a closed case study requests one mp4 and one poster", async ({ page }) => {
    expect(recorded.length, "no project carries a recording").toBeGreaterThan(0);
    const project = recorded[0];
    const media: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/media/")) media.push(new URL(request.url()).pathname);
    });

    const article = page.locator(`#work-${project.id}`);
    const trigger = article.getByRole("button", { name: /Read the full case study/ });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(article.locator("video")).toHaveCount(0);
    expect(media, "nothing loads before the press").toEqual([]);

    await article.getByRole("button", { name: "Play the screen recording" }).click();
    const video = article.locator("video");
    await expect(video).toHaveCount(1);
    await expect(trigger, "the press does not open the disclosure").toHaveAttribute("aria-expanded", "false");
    await expect(video).toHaveAttribute("aria-label", `${project.title} \u2014 screen recording`);
    await expect.poll(() => media.filter((url) => url.endsWith(".mp4")).length).toBe(1);
    await page.waitForLoadState("networkidle");

    expect(media.filter((url) => url.endsWith(".mp4"))).toEqual([`/media/${project.recording}.mp4`]);
    expect(media.filter((url) => url.endsWith(".jpg"))).toEqual([`/media/${project.recording}.jpg`]);
  });
  // Food Route and MentorHub have no case study: each button sits under its line of the
  // credentials strip. Any recording added later is picked up from content.
  const recordedEntries = careerEntries.filter((entry) => entry.recording);

  test("the entries' recordings are found in content", () => {
    expect(recordedEntries.map((entry) => entry.recording)).toEqual(expect.arrayContaining(["foodroute", "mentorhub"]));
  });

  for (const entry of recordedEntries) {
    test(`pressing play on ${entry.role} requests one mp4 and one poster`, async ({ page }) => {
      const media: string[] = [];
      page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/media/")) media.push(new URL(request.url()).pathname);
      });

      const button = page.getByRole("button", { name: `Play the screen recording of ${entry.role}` });
      // Not `li:has(button)`: the press replaces the button with the video.
      const line = page.locator("[data-credentials-strip] li", { hasText: entry.role });
      await button.scrollIntoViewIfNeeded();
      await expect(line.locator("video")).toHaveCount(0);
      expect(media, "nothing loads before the press").toEqual([]);

      await button.click();
      const video = line.locator("video");
      await expect(video).toHaveCount(1);
      await expect(video).toHaveAttribute("aria-label", `${entry.role} — screen recording`);
      await expect(video).toHaveAccessibleDescription(entry.recordingDescription ?? "");
      await expect.poll(() => media.filter((url) => url.endsWith(".mp4")).length).toBe(1);
      await page.waitForLoadState("networkidle");

      expect(media.filter((url) => url.endsWith(".mp4"))).toEqual([`/media/${entry.recording}.mp4`]);
      expect(media.filter((url) => url.endsWith(".jpg"))).toEqual([`/media/${entry.recording}.jpg`]);
    });
  }
});

/**
 * The Journey (`#tree`). Round 20 replaced the pinned stage with three stacked
 * blocks — the highlight cards, the drawing (>=1024px only), and the timeline:
 * one `KnowledgeTreeList` row per drawn entry, at every width, opening one at a
 * time. The timeline owns the `journey-entry-<id>` and `work-<projectId>` ids,
 * so every deep link into the Journey now lands on a row.
 */
test.describe("career tree", () => {
  /** The entry the row tests open: the role with the most case studies, so the
   *  open row has real focusable content inside it. */
  const PANEL_ENTRY = "doordash";
  const PANEL_STUDIES = projects.filter((project) => project.careerEntryId === PANEL_ENTRY).length;
  if (PANEL_STUDIES === 0) {
    throw new Error(`content fixture assumption failed: no case study belongs to "${PANEL_ENTRY}"`);
  }
  /** The drawn entries, oldest first — what the timeline has one row for. */
  const DRAWN = buildDrawnTree();
  const panelEntry = careerEntries.find((entry) => entry.id === PANEL_ENTRY);
  if (!panelEntry) throw new Error(`"${PANEL_ENTRY}" is no longer a career entry`);

  const row = (page: Page, entryId: string) => page.locator(`#tree #journey-entry-${entryId}`);
  const rowTrigger = (page: Page, entryId: string) =>
    page.locator(`#tree #tree-list-branch-${entryId}-trigger`);
  const rowPanel = (page: Page, entryId: string) =>
    page.locator(`#tree #tree-list-branch-${entryId}-panel`);

  test("the section renders and still answers #journey", async ({ page }) => {
    await expect(page.locator("#tree")).toBeVisible();
    // Not visible — it is a zero-size landing target (see CareerTree.tsx) —
    // but it must exist, and exactly once, or an old bookmark goes nowhere.
    // Where it lands is `e2e/legacy-anchors.spec.ts`'s job.
    await expect(page.locator("#journey")).toHaveCount(1);
  });

  test("no pinned stage", async ({ page }) => {
    await expect(page.locator("[data-stage]")).toHaveCount(0);
    await expect(page.locator("[data-act]")).toHaveCount(0);
    // The margin rail (`Section`'s `.rail`) is sticky in every section at lg
    // and is not the Journey's; everything else inside #tree must scroll.
    const sticky = await page.locator("#tree").evaluate((tree) =>
      Array.from(tree.querySelectorAll("*"))
        .filter((element) => !element.closest(".rail"))
        .filter((element) => getComputedStyle(element).position === "sticky")
        .map((element) => element.outerHTML.slice(0, 80)),
    );
    expect(sticky, "something inside #tree is position: sticky").toEqual([]);
  });

  test("the drawing shows at >=1024px only, and the timeline at every width", async ({ page }) => {
    const drawing = page.locator("#tree [data-origin-host]");
    if (viewportWidth(page) >= DESKTOP_MIN_WIDTH) await expect(drawing).toBeVisible();
    else await expect(drawing).toBeHidden();
    await expect(page.locator("#tree [data-timeline] [data-tree-branch]")).toHaveCount(DRAWN.length);
    await expect(row(page, DRAWN[0].id)).toBeVisible();
  });

  test("timeline rows: year, role · org, headline at rest", async ({ page }) => {
    expect(DRAWN.length, "no drawn entries, so no row was checked").toBeGreaterThan(0);
    for (const branch of DRAWN) {
      const trigger = rowTrigger(page, branch.id);
      await expect(trigger, branch.id).toHaveAttribute("aria-expanded", "false");
      await expect(trigger, branch.id).toContainText(String(branch.startYear));
      await expect(trigger, branch.id).toContainText(
        branch.organization ? `${branch.label} · ${branch.organization}` : branch.label,
      );
      const headline = row(page, branch.id).locator("[data-tree-headline]");
      if (branch.headline) {
        await expect(headline, branch.id).toHaveText(branch.headline);
        await expect(headline, branch.id).toBeVisible();
        // Outside the trigger: it is read at rest, never folded into the
        // button's name.
        expect(await trigger.textContent(), branch.id).not.toContain(branch.headline);
      }
      // At rest the body is closed: nothing inside it is visible.
      await expect(rowPanel(page, branch.id).getByText("What it changed"), branch.id).toBeHidden();
    }
  });

  test("one row open at a time", async ({ page }) => {
    const [, second, third, fourth] = DRAWN;
    await rowTrigger(page, second.id).scrollIntoViewIfNeeded();
    await rowTrigger(page, second.id).click();
    await expect(rowTrigger(page, second.id)).toHaveAttribute("aria-expanded", "true");

    await rowTrigger(page, third.id).click();
    await expect(rowTrigger(page, third.id)).toHaveAttribute("aria-expanded", "true");
    await expect(rowTrigger(page, second.id)).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator('#tree [data-timeline] button[aria-expanded="true"][id^="tree-list-branch-"]')).toHaveCount(1);

    // The keyboard does the same, and focus stays on the row that was pressed.
    await rowTrigger(page, fourth.id).focus();
    await page.keyboard.press("Enter");
    await expect(rowTrigger(page, fourth.id)).toHaveAttribute("aria-expanded", "true");
    await expect(rowTrigger(page, third.id)).toHaveAttribute("aria-expanded", "false");
    await expect(rowTrigger(page, fourth.id)).toBeFocused();
    await page.keyboard.press("Space");
    await expect(rowTrigger(page, fourth.id)).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator('#tree [data-timeline] button[aria-expanded="true"][id^="tree-list-branch-"]')).toHaveCount(0);
  });

  test("opened row shows What it changed, impact verbatim, chips, case study", async ({ page }) => {
    const trigger = rowTrigger(page, PANEL_ENTRY);
    await trigger.scrollIntoViewIfNeeded();
    const panel = rowPanel(page, PANEL_ENTRY);
    const chips = panel.locator('[aria-label^="Technologies used"]');
    // Chips live in the body now, so a closed row shows none of them.
    await expect(chips).toBeHidden();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(panel.getByText("What it changed", { exact: true })).toBeVisible();
    expect(panelEntry.impact.length, "the entry authors no impact line").toBeGreaterThan(0);
    await expect(panel.locator('ul[aria-labelledby$="-changed"] > li')).toHaveText([...panelEntry.impact]);
    await expect(chips).toBeVisible();
    await expect(chips.locator(":scope > li > span:first-child")).toHaveText([...panelEntry.technologies]);
    const articles = panel.locator('article[id^="work-"]');
    await expect(articles).toHaveCount(PANEL_STUDIES);
    await expect(articles.first()).toBeVisible();
  });

  test("a closed row's case studies stay out of the tab order", async ({ page }) => {
    const trigger = rowTrigger(page, PANEL_ENTRY);
    await trigger.scrollIntoViewIfNeeded();
    const inner = rowPanel(page, PANEL_ENTRY).getByRole("button", {
      name: /Read the full case study/,
      includeHidden: true,
    });
    await expect(inner).toHaveCount(PANEL_STUDIES);
    await expect(inner.first()).toBeHidden();

    await trigger.click();
    await expect(inner.first()).toBeVisible();
    await trigger.click();
    await expect(inner.first()).toBeHidden();

    await trigger.focus();
    await page.keyboard.press("Tab");
    const landedInPanel = await page.evaluate(
      (id) => document.getElementById(id)?.contains(document.activeElement) ?? false,
      `tree-list-branch-${PANEL_ENTRY}-panel`,
    );
    expect(landedInPanel, "Tab from a closed row must not reach inside it").toBe(false);
  });

  test("legacy anchors land on rows", async ({ page }) => {
    // Two cold loads plus stability polls; the budget follows the work.
    test.slow();
    const study = projects.find((project) => project.id === "dd-scraper-platform");
    expect(study?.careerEntryId, "dd-scraper-platform no longer belongs to doordash").toBe(PANEL_ENTRY);

    // A real cold load each time, not a same-document hash hop.
    await page.goto("about:blank");
    await page.goto(`/#journey-entry-${PANEL_ENTRY}`);
    await page.waitForLoadState("networkidle");
    await expect(rowTrigger(page, PANEL_ENTRY)).toHaveAttribute("aria-expanded", "true");
    expectSettledAtScrollMargin(
      await restingTop(row(page, PANEL_ENTRY)),
      "a cold load must settle the entry's row at its 80px scroll margin",
    );

    await page.goto("about:blank");
    await page.goto("/#work-dd-scraper-platform");
    await page.waitForLoadState("networkidle");
    await expect(rowTrigger(page, PANEL_ENTRY)).toHaveAttribute("aria-expanded", "true");
    const article = page.locator("#work-dd-scraper-platform");
    await expect(article).toBeVisible();
    await restingTop(article);
    await expect(article).toBeInViewport();
  });

  test("branch label links to its row", async ({ page }) => {
    test.skip(viewportWidth(page) < DESKTOP_MIN_WIDTH, "the drawing only shows from lg up");
    const links = page.locator('#tree [data-origin-host] [data-tree-panel] a[href^="#journey-entry-"]');
    await expect(links).toHaveCount(DRAWN.length);
    await expect(page.locator("#tree [data-origin-host] [data-tree-panel] button")).toHaveCount(0);

    const link = page.locator(
      `#tree [data-origin-host] [data-tree-panel] a[href="#journey-entry-${PANEL_ENTRY}"]`,
    );
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(rowTrigger(page, PANEL_ENTRY)).toHaveAttribute("aria-expanded", "true");
    expectSettledAtScrollMargin(
      await restingTop(row(page, PANEL_ENTRY)),
      "the branch label must land its row at the 80px scroll margin",
    );
  });

  test("highlight card jumps to its row", async ({ page }) => {
    // A row above the target is open first: opening the target closes it, and
    // the target must still end up where the reader was sent.
    await rowTrigger(page, DRAWN[0].id).scrollIntoViewIfNeeded();
    await rowTrigger(page, DRAWN[0].id).click();
    await expect(rowTrigger(page, DRAWN[0].id)).toHaveAttribute("aria-expanded", "true");

    const card = page.locator(`#tree a[href="#journey-entry-${PANEL_ENTRY}"]`).first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect(rowTrigger(page, PANEL_ENTRY)).toHaveAttribute("aria-expanded", "true");
    await expect(rowTrigger(page, DRAWN[0].id)).toHaveAttribute("aria-expanded", "false");
    await expect(row(page, PANEL_ENTRY)).toBeInViewport();
  });

  /*
   * Round 13: the list gets its own drawn ink (a trunk, a curved bough per
   * row, year rings, a "still growing" tip) — see list-ink.tsx. It is meant to
   * be pure decoration layered onto the accessible list: this checks every
   * drawn piece is `aria-hidden` and that the list's own controls — one per
   * drawn branch — are unaffected by any of it.
   */
  test("the list's drawn ink is pure decoration layered onto the same accessible list", async ({
    page,
  }) => {
    const tree = page.locator("#tree");
    const branchButtons = tree.getByRole("button", { name: /(Show|Hide) what .+ involved/ });
    await expect(branchButtons).toHaveCount(DRAWN.length);

    const trunk = tree.locator("[data-tree-list-trunk]");
    await expect(trunk).toHaveCount(1);
    await expect(trunk).toHaveAttribute("aria-hidden", "true");

    const boughs = tree.locator('[data-tree-list-part="bough"]');
    await expect(boughs).toHaveCount(DRAWN.length);
    for (const bough of await boughs.all()) {
      await expect(bough).toHaveAttribute("aria-hidden", "true");
    }

    const tip = tree.locator("[data-tree-list-tip]");
    await expect(tip).toHaveCount(1);
    await expect(tip).toHaveAttribute("aria-hidden", "true");
    await expect(tip.locator("[data-tree-list-shoot-label]")).toHaveText(/still growing/i);
  });

  /*
   * The drawing never claims to be finished — an unfinished shoot, annotated.
   */
  test("the unfinished shoot draws with its still-growing annotation", async ({ page }) => {
    test.skip(
      viewportWidth(page) < DESKTOP_MIN_WIDTH,
      "below 1024px the drawn presentation is display: none",
    );
    const tree = page.locator("#tree");
    await expect(tree.locator("[data-tree-shoot]")).toHaveCount(1);
    await expect(tree.locator("[data-tree-shoot-label]:visible")).toHaveCount(1);
  });
});

/*
 * A fragment below the Journey, landed on a cold load, and a reload that must
 * not jump back to it: a reload restores the reader's own scroll position.
 */
test.describe("fragment landings around the Journey", () => {
  test("a cold load of /#ask lands on it", async ({ page }) => {
    // Below lg the page ends too soon after #ask for the browser to scroll it
    // up to its margin (measured at 768px: scrolled to the bottom, #ask at 199px).
    test.skip(viewportWidth(page) < DESKTOP_MIN_WIDTH, "#ask sits too near the page's end below lg");
    await page.goto("about:blank");
    await page.goto("/#ask");
    await page.waitForLoadState("networkidle");
    expectSettledAtScrollMargin(
      await restingTop(page.locator("#ask")),
      "a cold load must settle #ask at its 80px scroll margin",
    );
  });

  test("a reload after scrolling away from the fragment does not jump back to it", async ({ page }) => {
    await page.goto("about:blank");
    await page.goto("/#contact");
    await page.waitForLoadState("networkidle");

    // Read somewhere else: the Worlds section, far above Contact.
    await page.locator("#worlds").evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(500);
    const before = await page.evaluate(() => window.scrollY);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Not vacuous: Contact really is far from where the reader was.
    const contactTop = await page.locator("#contact").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(contactTop)).toBeGreaterThan(1000);
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before), "the reload jumped the reader").toBeLessThan(50);
  });
});
