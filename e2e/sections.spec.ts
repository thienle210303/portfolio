import { test, expect, type Locator, type Page } from "@playwright/test";
import { careerEntries, codeTabs, problemSolvingLoop, profile, skillCategories } from "../src/content/portfolio";
import { experiments, workflowStages } from "../src/content/ai-experiments";
import type { SkillCategory } from "../src/types/portfolio";

// Widened for the same reason src/lib/knowledge-tree.ts widens careerEntries:
// `skillCategories` is declared with `satisfies`, so its `lenses` arrays stay
// literal tuples and narrow `.includes()`'s parameter to whichever lens that
// one category happens to carry. Ordinary arrays here are what a query
// across every category actually needs.
const CATEGORIES: readonly SkillCategory[] = skillCategories;

// Matches the `lg:` breakpoint (1024px) that switches several sections'
// desktop/mobile presentations, e.g. the career tree's drawn figure vs. its
// indented-list fallback.
const DESKTOP_MIN_WIDTH = 1024;

/**
 * Where a timeline entry comes to rest: `scroll-margin-top: 80px` on the
 * `<li>`, which is the 4rem sticky header plus a rem of air.
 */
const ENTRY_RESTING_TOP = 80;
/** A pixel or two of sub-pixel rounding, and nothing like enough to hide a
 *  scroll that stopped somewhere else entirely. */
const RESTING_TOLERANCE = 2;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
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
  // Never accept a rest before the scroll has had a chance to start: the
  // filtered path widens the filter first and scrolls on the commit after.
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
  // The "without JavaScript" describe below shares this hook, and with
  // scripts off the attribute can never arrive. `page.evaluate` itself runs
  // over CDP regardless of `javaScriptEnabled`, so the discriminator is
  // whether the page's own scripts ran: Next's inline flight script always
  // defines `__next_f` — absent exactly when page scripts are disabled.
  const jsLive = await page.evaluate(() => "__next_f" in window);
  if (jsLive) await page.waitForSelector("html[data-ink-ready]", { timeout: 30_000 });
});

test.describe("hero", () => {
  test("exactly one h1 renders on the page", async ({ page }) => {
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("code artifact tabs switch panels via mouse and keyboard", async ({ page }) => {
    const tablist = page.getByRole("tablist", { name: "Code artifact tabs" });
    const tabs = tablist.getByRole("tab");
    // The three authored code tabs plus "Ask Thien" (round 12, WP-K) — the
    // mini chat rides the same tablist but is not a codeTabs member; its own
    // behavior is pinned in e2e/ask.spec.ts.
    await expect(tabs).toHaveCount(codeTabs.length + 1);

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

/**
 * Round 15: the graph layer attached to the problem-solving ring — a small,
 * curated set of `workflowStages` gates (`watchFor`) and checkpoints
 * (`humanOwns[0]`), rendered verbatim by `WorkflowGraph.tsx`. See that
 * component's own doc comment for why these four stages and not the other
 * six, and why it attaches to the ring as a whole rather than to any one
 * station. `ProblemSolvingLoop.tsx` itself (built round 7, hardened round 8)
 * is untouched by this round; the first test below is the guard for that.
 */
test.describe("philosophy", () => {
  const philosophy = (page: Page) => page.locator("#philosophy");

  test("the problem-solving ring keeps its nine authored stations, untouched by the graph layer", async ({
    page,
  }) => {
    const loop = philosophy(page).getByRole("list", { name: "The loop" });
    // Direct children only: two of the nine stations (`test`, `iterate`) carry
    // their own nested `<ul role="list">` fork of branches
    // (ProblemSolvingLoop.tsx's `Fork`), and an unscoped `getByRole("listitem")`
    // matches those nested items too, along with the nine stations themselves.
    await expect(loop.locator(":scope > li")).toHaveCount(problemSolvingLoop.length);
  });

  test("the graph layer renders a curated stage's gate and checkpoint, verbatim", async ({ page }) => {
    const stage = workflowStages.find((candidate) => candidate.id === "tests");
    if (!stage) throw new Error("content fixture assumption failed: no 'tests' workflow stage found");
    const checkpoint = stage.humanOwns[0];
    if (!checkpoint) {
      throw new Error("content fixture assumption failed: 'tests' workflow stage has no humanOwns entry");
    }

    const gates = philosophy(page).getByRole("list", { name: "Verification gates" });
    const checkpoints = philosophy(page).getByRole("list", { name: "Human checkpoints" });
    await expect(gates.getByText(stage.watchFor)).toBeVisible();
    await expect(checkpoints.getByText(checkpoint)).toBeVisible();
  });

  test("a workflow stage outside the curated set draws nothing, even though it carries an equally authored gate", async ({
    page,
  }) => {
    const undrawn = workflowStages.find((candidate) => candidate.id === "diagnose");
    if (!undrawn) throw new Error("content fixture assumption failed: no 'diagnose' workflow stage found");
    await expect(philosophy(page).getByText(undrawn.watchFor)).toHaveCount(0);
  });

  test("the graph layer's connecting bracket to the ring only draws at >=1024px", async ({ page }) => {
    const bracket = philosophy(page).locator("[data-philosophy-graph-bracket]");
    await expect(bracket).toHaveCount(1);
    const display = await bracket.evaluate((element) => getComputedStyle(element).display);
    if (viewportWidth(page) >= DESKTOP_MIN_WIDTH) {
      expect(display).not.toBe("none");
    } else {
      expect(display).toBe("none");
    }
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

/**
 * Round 10 merged the old "career journey" section (a filterable
 * chronological timeline, `#journey`) into the career tree as its own "List"
 * face — see src/sections/CareerTree/CareerTree.tsx, ViewToggle.tsx and
 * view-state.ts. One `#tree` section, one "Tree / List" toggle choosing which
 * face is on screen, and the old `#journey` id survives as a zero-size
 * landing target so nothing that ever bookmarked it breaks.
 */
test.describe("career tree", () => {
  test("the section renders and still answers #journey", async ({ page }) => {
    await expect(page.locator("#tree")).toBeVisible();
    // Not visible — it is a zero-size landing target (see CareerTree.tsx) —
    // but it must exist, and exactly once, or an old bookmark goes nowhere.
    await expect(page.locator("#journey")).toHaveCount(1);
  });

  /** The two toggle buttons, by their own accessible name — `exact: true`
   *  because "Tree" would otherwise substring-match nothing here, but is
   *  cheap insurance against a future label change making one a substring of
   *  the other. */
  function viewToggle(page: Page, label: "Tree" | "List"): Locator {
    return page.locator("#tree").getByRole("button", { name: label, exact: true });
  }

  test("the toggle defaults to Tree at >=1024px and List below it", async ({ page }) => {
    const treeButton = viewToggle(page, "Tree");
    const listButton = viewToggle(page, "List");
    const [expectPressed, expectUnpressed] =
      viewportWidth(page) >= DESKTOP_MIN_WIDTH ? [treeButton, listButton] : [listButton, treeButton];

    await expect(expectPressed).toHaveAttribute("aria-pressed", "true");
    await expect(expectUnpressed).toHaveAttribute("aria-pressed", "false");
  });

  test("choosing a face — by mouse or keyboard — shows it and hides the other", async ({ page }) => {
    const tree = page.locator("#tree");
    const treeButton = viewToggle(page, "Tree");
    const listButton = viewToggle(page, "List");
    const list = tree.getByRole("list", { name: "Career timeline" });

    await listButton.click();
    await expect(listButton).toHaveAttribute("aria-pressed", "true");
    await expect(treeButton).toHaveAttribute("aria-pressed", "false");
    await expect(list).toBeVisible();

    // Keyboard: Tab to reach it (real buttons are natively tab-stops), Enter
    // to activate it — no bespoke key handling to verify beyond that.
    await treeButton.focus();
    await page.keyboard.press("Enter");
    await expect(treeButton).toHaveAttribute("aria-pressed", "true");
    await expect(listButton).toHaveAttribute("aria-pressed", "false");
    await expect(list).toBeHidden();
  });

  test.describe("list face — the career timeline", () => {
    test.beforeEach(async ({ page }) => {
      await viewToggle(page, "List").click();
    });

    test("filters change the visible entry count and announce it in a live region", async ({
      page,
    }) => {
      const tree = page.locator("#tree");
      const list = tree.getByRole("list", { name: "Career timeline" });
      const status = tree.getByRole("status").filter({ hasText: "Showing" });

      const allCount = await list.getByRole("listitem").count();
      const initialStatusText = await status.textContent();

      await tree
        .getByRole("radiogroup", { name: "Filter career entries by type" })
        .getByRole("radio", { name: "Work" })
        .click();

      await expect(status).not.toHaveText(initialStatusText ?? "");
      const workCount = await list.getByRole("listitem").count();
      expect(workCount).toBeGreaterThan(0);
      expect(workCount).toBeLessThan(allCount);
    });
  });

  test("on the Tree face, the drawing shows at >=1024px with the list hidden, and the reverse below it", async ({
    page,
  }) => {
    // Forced on regardless of viewport: this test is about the Tree face's
    // own *internal* presentation switch (KnowledgeTree.tsx — the drawn tree
    // vs. its indented-list fallback), which is a different axis from the
    // outer Tree/List toggle covered above. Below 1024px the outer default is
    // now List, which would otherwise hide both internal presentations and
    // make the "reverse below it" branch fail for the wrong reason.
    await viewToggle(page, "Tree").click();
    const tree = page.locator("#tree");

    // The drawn presentation's branch panels end their accessible name in
    // "Show detail — …" and the list presentation's own branch toggles end
    // theirs in "Show what … involved" (Disclosure appends the label after
    // the summary text) — two different controls with two different
    // accessible names, so a substring match on either is a reliable "which
    // presentation is actually in the tree" probe. See
    // src/sections/CareerTree/KnowledgeTree.tsx for why exactly one of the
    // two presentations is ever in the accessibility tree at a given width.
    const drawingBranch = tree.getByRole("button", { name: /Show detail — /}).first();
    const listBranch = tree.getByRole("button", { name: /Show what .+ involved/}).first();

    if (viewportWidth(page) >= DESKTOP_MIN_WIDTH) {
      await expect(drawingBranch).toBeVisible();
      await expect(listBranch).toBeHidden();
    } else {
      await expect(drawingBranch).toBeHidden();
      await expect(listBranch).toBeVisible();
    }
  });

  /*
   * Round 13: the mobile/AT list gets its own drawn ink (a trunk, a curved
   * bough per row, year rings, a "still growing" tip) — see
   * src/sections/CareerTree/list-ink.tsx. It is meant to be pure decoration
   * layered onto the accessible list that has always been here: this test
   * proves that rather than trusting it, by checking every drawn piece is
   * `aria-hidden` and that the list's own accessible controls — one "Show
   * what … involved" button per career entry — are unaffected by any of it.
   */
  test("the list's drawn ink is pure decoration layered onto the same accessible list", async ({
    page,
  }) => {
    test.skip(
      viewportWidth(page) >= DESKTOP_MIN_WIDTH,
      "this ink only exists in KnowledgeTreeList.tsx, the <1024px presentation — see list-ink.tsx",
    );
    await viewToggle(page, "Tree").click();
    const tree = page.locator("#tree");

    // Either wording: the very first (oldest) branch defaults open, so its
    // own trigger already reads "Hide what … involved" rather than "Show
    // what … involved" — see KnowledgeTreeList.tsx's `defaultOpen`.
    const branchButtons = tree.getByRole("button", { name: /(Show|Hide) what .+ involved/ });
    const branchCount = await branchButtons.count();
    expect(branchCount, "expected at least one career entry in the list").toBeGreaterThan(0);

    // One continuous trunk …
    const trunk = tree.locator("[data-tree-list-trunk]");
    await expect(trunk).toHaveCount(1);
    await expect(trunk).toHaveAttribute("aria-hidden", "true");

    // … one bough per row, joining it to the trunk …
    const boughs = tree.locator('[data-tree-list-part="bough"]');
    await expect(boughs).toHaveCount(branchCount);
    for (const bough of await boughs.all()) {
      await expect(bough).toHaveAttribute("aria-hidden", "true");
    }

    // … and one growing tip at the newest end.
    const tip = tree.locator("[data-tree-list-tip]");
    await expect(tip).toHaveCount(1);
    await expect(tip).toHaveAttribute("aria-hidden", "true");
    await expect(tip.locator("[data-tree-list-shoot-label]")).toHaveText(/still growing/i);

    // None of it changed how many accessible controls the list itself
    // exposes — the same count `on the Tree face, the drawing shows …`
    // above already established this list has, before this ink existed.
    await expect(branchButtons).toHaveCount(branchCount);
  });

  test("opening a branch panel reveals its detail, including the case-study link when one exists", async ({
    page,
  }) => {
    test.skip(
      viewportWidth(page) < DESKTOP_MIN_WIDTH,
      "a branch panel is only its own control in the drawn presentation — see KnowledgeTreeList.tsx",
    );
    await viewToggle(page, "Tree").click();

    const tree = page.locator("#tree");
    // DoorDash carries two case studies (src/content/portfolio.ts,
    // careerEntryId "doordash") and, since round 12's tree inversion, draws
    // as exactly one branch — no more re-resolving-to-a-different-DoorDash
    // trap from a name that used to repeat once per tagged lens. Resolved to
    // a fixed id before clicking, still: expanding it flips its own
    // accessible name from "Show detail — …" to "Hide detail — …"
    // (Disclosure's expandLabel/collapseLabel swap), which would otherwise
    // make a live `/Show detail — /` locator match nothing at all the
    // instant this one opens.
    const triggerId = await tree
      .getByRole("button", { name: /Show detail — /})
      .filter({ hasText: "DoorDash, Inc." })
      .first()
      .getAttribute("id");
    expect(triggerId, "expected the DoorDash branch trigger").toBeTruthy();
    const trigger = page.locator(`#${triggerId}`);

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const panelId = await trigger.getAttribute("aria-controls");
    expect(panelId, "Disclosure trigger must expose aria-controls").toBeTruthy();
    const panel = page.locator(`#${panelId}`);

    // Detail: kind + date range always renders once opened.
    await expect(panel.getByText(/Role · /)).toBeVisible();

    // The case-study link, present because this branch has one — points at
    // that case study's own article, not merely at the section holding all
    // of them, and that article actually exists.
    const caseStudyLink = panel.locator('a[href^="#work-"]').first();
    await expect(caseStudyLink).toBeVisible();
    const href = await caseStudyLink.getAttribute("href");
    expect(href, "expected a per-study fragment").toBeTruthy();
    await expect(page.locator(href ?? "")).toHaveCount(1);
  });

  test("every case-study link the tree renders resolves to a real article", async ({ page }) => {
    // A sweep across the whole figure, not just the one DoorDash leaf above:
    // every `#work-<id>` fragment any leaf renders, in either presentation,
    // must land on a real `<article>` — the same dead-fragment guard the
    // timeline links already get further down this file.
    const unresolved = await page.evaluate(() => {
      const links = [...document.querySelectorAll('#tree a[href^="#work-"]')];
      return links
        .map((link) => link.getAttribute("href") ?? "")
        .filter((href) => document.getElementById(href.slice(1)) === null);
    });
    expect(unresolved, "a case-study link must resolve to a real article").toEqual([]);
  });

  /*
   * The branch panels' second cross-link: back to the one timeline entry
   * each branch was built from (`#journey-entry-<id>`, src/sections/
   * CareerTree/anchors.ts). Round 12 moved this from the leaf to the branch
   * panel (a leaf is now a single authored fact with nothing further to
   * disclose — see the "Why the branch panel alone is interactive" note in
   * DrawnTree.tsx), so there is one of these per branch now, not one per
   * (lens, entry) pair. Four things about it are worth a test rather than a
   * reading, because all four failed a first attempt at this feature:
   *
   *   - it exists only inside an *open* branch panel, so fourteen branches
   *     do not become fourteen tab stops;
   *   - it lands clear of the 4rem sticky header;
   *   - it works while the timeline is filtered to a category that excludes
   *     the entry, which is the case where a plain fragment link silently
   *     does nothing;
   *   - since round 10, it also has to switch the section from its Tree face
   *     to its List face — the entry's `<li>` can be in the document and
   *     still be unreachable, sitting under a `display: none` ancestor.
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

  test("a branch panel's timeline link is in the tab order only while that panel is open", async ({
    page,
  }) => {
    test.skip(
      viewportWidth(page) < DESKTOP_MIN_WIDTH,
      "a branch panel is only its own control in the drawn presentation — see KnowledgeTreeList.tsx",
    );

    const tree = page.locator("#tree");
    // Round 12: a branch panel's id is `tree-branch-<entryId>` — one panel
    // per career entry, not one leaf per (lens, entry) pair — so this is now
    // an exact id lookup rather than a wildcard prefix/suffix match.
    const trigger = tree.locator(`#tree-branch-${linkedEntry.id}-trigger`);
    await expect(trigger, `expected a branch panel for career entry "${linkedEntry.id}"`).toHaveCount(1);
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
    expect(landedInPanel, "Tab from a collapsed branch panel must not reach its timeline link").toBe(false);
  });

  /**
   * The one visible copy of the branch's timeline link, opened if it needs
   * to be. Both presentations keep this link inside that branch's own
   * `Disclosure` now — round 12 flattened the list from "lens panel holding
   * branch rows" to "one Disclosure per branch", the same shape the drawing
   * already used, so both need an explicit open rather than only the drawn
   * one. Whichever internal presentation shows at this width, the other one
   * is `display: none`, so its copy of the same link is not visible — and
   * the outer Tree face has to be forced on first, or the whole panel
   * holding both presentations is `display: none` regardless of width
   * (mobile's default face is now List — see view-state.ts).
   */
  const revealBranchTimelineLink = async (page: Page): Promise<Locator> => {
    const tree = page.locator("#tree");
    await tree.getByRole("button", { name: "Tree", exact: true }).click();
    const idPrefix = viewportWidth(page) >= DESKTOP_MIN_WIDTH ? "tree-branch-" : "tree-list-branch-";
    const trigger = tree.locator(`#${idPrefix}${linkedEntry.id}-trigger`);
    if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
    const link = tree.locator(`a[href="#${ENTRY_ANCHOR}"]:visible`).first();
    await link.scrollIntoViewIfNeeded();
    return link;
  };

  test("a branch panel's timeline link switches the section to List, lands on its entry, even when the filter excludes it", async ({
    page,
  }) => {
    const tree = page.locator("#tree");
    // Start on the List face so the "Work" filter is actually the state a
    // visitor following the branch panel's link a moment later would be
    // filtering away from — the click below re-selects Tree, but the filter itself is
    // Timeline's own state and survives the face switch untouched.
    await tree.getByRole("button", { name: "List", exact: true }).click();
    await tree.getByRole("radio", { name: "Work" }).click();
    await expect(page.locator(`#${ENTRY_ANCHOR}`)).toHaveCount(0);

    const link = await revealBranchTimelineLink(page);
    await link.click();

    const entry = page.locator(`#${ENTRY_ANCHOR}`);
    await expect(entry).toBeVisible();
    await expect(entry).toBeFocused();
    // The section switched itself back to its List face — a leaf's link is
    // useless if it lands on an entry still sitting under `display: none`.
    await expect(tree.getByRole("button", { name: "List", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // The filter was widened to include it again, and the live region says
    // what is actually showing.
    await expect(tree.getByRole("radio", { name: "All" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // And it came to rest at its scroll margin, not merely somewhere below
    // the sticky header on the way past.
    expectSettledAtScrollMargin(
      await restingTop(entry),
      "the entry must settle at its 80px scroll margin, clear of the 4rem sticky header",
    );
    const rest = await entry.evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      viewport: window.innerHeight,
    }));
    expect(rest.top, "inside the viewport").toBeLessThan(rest.viewport);
  });

  /*
   * The case `hashchange` cannot cover, and the only reason the document-level
   * click listener in Timeline.tsx exists: a second activation of a link whose
   * fragment the page is *already* on navigates nowhere and fires no event at
   * all. A visitor reaches that state by following a leaf and then filtering
   * the entry away again — at which point the link they just used silently
   * stops working unless something notices the click itself.
   */
  test("re-clicking the link the page is already on re-reveals a re-filtered entry", async ({
    page,
  }) => {
    const tree = page.locator("#tree");
    const entry = page.locator(`#${ENTRY_ANCHOR}`);

    // First visit, from the default "all" filter: an ordinary fragment
    // navigation, which sets the hash.
    const link = await revealBranchTimelineLink(page);
    await link.click();
    await expect(entry).toBeFocused();
    await expect.poll(() => new URL(page.url()).hash).toBe(`#${ENTRY_ANCHOR}`);

    // Filter the entry back out. The hash still names it, so the second click
    // below changes nothing about the URL and fires neither `hashchange` nor
    // anything else the effects above could hear. Switching back to Tree
    // first is what makes the second click below a genuine re-click of a
    // branch panel's link rather than a click on an already-visible list entry.
    await tree.getByRole("radio", { name: "Work" }).click();
    await expect(entry).toHaveCount(0);

    const again = await revealBranchTimelineLink(page);
    await again.click();

    await expect(entry).toBeVisible();
    await expect(entry).toBeFocused();
    await expect(tree.getByRole("button", { name: "List", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(tree.getByRole("radio", { name: "All" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expectSettledAtScrollMargin(
      await restingTop(entry),
      "a re-click must land the entry where the first click did",
    );
  });

  /*
   * The other half of that listener: it runs on *every* click in the document,
   * so the thing it must be best at is doing nothing. `TreeCrossLink`
   * (src/sections/CareerTree/cross-link.tsx) is an ordinary in-page link
   * nearby — Skills ends with one pointing at `#tree` — clicked twice, so the
   * second click takes exactly the branch the test above relies on and has
   * to fall straight back out of it.
   */
  test("an ordinary in-page link leaves the timeline's filter alone", async ({ page }) => {
    const tree = page.locator("#tree");
    await tree.getByRole("button", { name: "List", exact: true }).click();
    const status = tree.getByRole("status");

    await tree.getByRole("radio", { name: "Work" }).click();
    await expect(tree.getByRole("radio", { name: "Work" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const filtered = await status.textContent();
    expect(filtered, "the live region should be reporting a filtered count").toMatch(
      /Showing \d+ of \d+ entr/,
    );
    await expect(page.locator(`#${ENTRY_ANCHOR}`)).toHaveCount(0);

    const crossLink = page.locator('a[href="#tree"]').first();
    await crossLink.scrollIntoViewIfNeeded();
    await crossLink.click();
    await expect.poll(() => new URL(page.url()).hash).toBe("#tree");
    // Again, now that the page is already on that fragment.
    await crossLink.scrollIntoViewIfNeeded();
    await crossLink.click();

    await expect(tree.getByRole("radio", { name: "Work" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(status).toHaveText(filtered ?? "");
    await expect(page.locator(`#${ENTRY_ANCHOR}`)).toHaveCount(0);
    // And nothing pulled focus into the timeline: revealing an entry focuses
    // its `<li>`, so this is the same claim from the other side. Asserted
    // against the entry rather than the link, because whether a click focuses
    // the anchor it lands on is the platform's business, not this page's.
    expect(
      await page.evaluate(
        () =>
          document.activeElement instanceof HTMLElement &&
          document.activeElement.id.startsWith("journey-entry-"),
      ),
      "an ordinary in-page link must not move focus onto a timeline entry",
    ).toBe(false);
  });

  test("a cold load of an entry's fragment lands on it, clear of the header", async ({ page }) => {
    // A real cold load, not a hash hop. The file-level beforeEach has already
    // loaded "/", so going straight to the fragment from here would be a
    // same-document hash navigation — a different story from this test's
    // name, and one where Next's dev router intermittently drops the
    // fragment before `hashchange` ever fires (measured: location.hash === ""
    // at failure, 10/12 repeats). Interposing about:blank makes the next
    // goto a genuine fresh document load, which is the visitor path this
    // test exists to protect. The in-page hash-hop story has its own tests
    // above, driven by real link clicks.
    await page.goto("about:blank");
    await page.goto(`/#${ENTRY_ANCHOR}`);
    await page.waitForLoadState("networkidle");

    const entry = page.locator(`#${ENTRY_ANCHOR}`);
    await expect(entry).toBeVisible();
    await expect(entry).toBeFocused();

    expectSettledAtScrollMargin(
      await restingTop(entry),
      "a cold load must settle at the entry's 80px scroll margin",
    );
  });

  /*
   * Cross-highlighting (TreeFigure.tsx): pointer or focus on a technology
   * leaf or a root label stamps `data-tree-hit` on the set that attribute
   * says it should. Round 12 retired a third case along with the lens
   * branches it depended on: through round 11 a root label also brightened
   * every lens panel its authored `category.lenses` named, and vice versa;
   * now that lenses no longer draw as their own branch of the tree, that
   * edge has no target left to name, and `RootLabels.tsx` no longer prints
   * the "Feeds …" line it came from. The two tests below assert the honest
   * replacement — a root highlights only itself and its own lateral root —
   * rather than keeping tests for a feature this round removed.
   */
  test("hovering a root label highlights only itself and its own lateral root", async ({
    page,
  }) => {
    test.skip(
      viewportWidth(page) < DESKTOP_MIN_WIDTH,
      "root labels sit under their own root's tip only in the drawn presentation",
    );

    const category = CATEGORIES[0];
    const tree = page.locator("#tree");
    // `networkidle` in beforeEach only proves the bundle finished downloading,
    // not that TreeFigure's effect has attached its pointerover/focus
    // listeners yet — under load (dev-mode compilation, a slower machine) a
    // hover dispatched between those two moments lands on nothing. Wait for
    // the island's own "listeners are on" signal instead of guessing at a
    // delay.
    await expect(tree.locator("[data-tree-live]")).toHaveCount(1);
    const rootLabel = tree.locator(`[data-tree-root="${category.id}"]:visible`).first();
    await rootLabel.scrollIntoViewIfNeeded();
    await rootLabel.hover();

    const result = await page.evaluate((categoryId: string) => {
      const hit = [...document.querySelectorAll("#tree [data-tree-hit]")];
      return {
        total: hit.length,
        root: hit.filter((el) => el.getAttribute("data-tree-root") === categoryId).length,
        lateral: hit.filter((el) => el.getAttribute("data-tree-lateral") === categoryId).length,
      };
    }, category.id);

    expect(result.root, "the hovered root label itself must be in the hit set").toBeGreaterThan(0);
    expect(result.lateral, "its own lateral root underground must be in the hit set").toBeGreaterThan(0);
    // And nothing else: no lens panel, no branch, no leaf lights up — the
    // roots are label-only now (see RootLabels.tsx).
    expect(result.total).toBe(result.root + result.lateral);
  });

  test("focusing a branch panel highlights only itself — nothing underground lights up", async ({
    page,
  }) => {
    test.skip(
      viewportWidth(page) < DESKTOP_MIN_WIDTH,
      "a branch panel is only its own control in the drawn presentation",
    );

    const tree = page.locator("#tree");
    // See the hover test above for why this waits on the island's own
    // "listeners are on" signal rather than trusting `networkidle`.
    await expect(tree.locator("[data-tree-live]")).toHaveCount(1);
    const trigger = tree
      .getByRole("button", { name: /Show detail — /})
      .filter({ hasText: "DoorDash, Inc." })
      .first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();

    const hitRootCount = await page.evaluate(
      () => document.querySelectorAll("#tree [data-tree-root][data-tree-hit]").length,
    );
    expect(hitRootCount, "a branch panel must not brighten any root — that edge no longer exists").toBe(0);
  });

  test("hovering a technology leaf highlights every other leaf that lists it, in either presentation", async ({
    page,
  }) => {
    test.skip(
      viewportWidth(page) < DESKTOP_MIN_WIDTH,
      "hover-driven cross-highlighting is exercised at desktop width only, matching the rest of this block",
    );

    const tree = page.locator("#tree");
    await expect(tree.locator("[data-tree-live]")).toHaveCount(1);
    // Round 12: a technology is its own leaf mark, always visible on its
    // branch's twig — no panel needs opening to reach one any more.
    const tag = tree.locator("[data-tree-tech]:visible").first();
    const slug = await tag.getAttribute("data-tree-tech");
    expect(slug, "expected at least one technology leaf on the drawing").toBeTruthy();

    await tag.scrollIntoViewIfNeeded();
    await tag.hover();

    const counts = await page.evaluate((needle: string) => {
      const homes = [...document.querySelectorAll(`#tree [data-tree-tech="${needle}"]`)];
      const hit = homes.filter((el) => el.hasAttribute("data-tree-hit"));
      return { homes: homes.length, hit: hit.length };
    }, slug as string);

    expect(counts.homes, "the fixture should list this technology in more than one place").toBeGreaterThan(0);
    expect(counts.hit).toBe(counts.homes);
  });

  /*
   * Growth draw-in (the shared `InkReveal` primitive, Workstream 3, stamps
   * `data-inked` on `[data-tree-figure]`'s own `data-ink-root`). This file
   * owns only the tree's half of that contract — see the "Career tree
   * figure" block in globals.css and the reconciliation note atop
   * TreeFigure.tsx. Two states matter, and they get one test each: with no
   * gate anywhere (a no-JS visit — the only remaining way `data-ink-ready`
   * is genuinely absent now that InkReveal ships), the pending CSS must
   * never have applied; and on an ordinary JS visit, scrolling the figure
   * into view must stamp it `data-inked` and carry the drawing all the way
   * to its finished state, not leave it parked mid-growth.
   */
  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("with no ink-reveal gate present, the tree renders fully drawn", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("html[data-ink-ready]")).toHaveCount(0);

      const state = await page.evaluate(() => {
        const figure = document.querySelector("[data-tree-figure]");
        const draw = figure?.querySelector("path.tree-draw");
        const grow = figure?.querySelector(".tree-grow, .tree-grow-down");
        const fade = figure?.querySelector(".tree-fade");
        return {
          dashoffset: draw ? getComputedStyle(draw).strokeDashoffset : undefined,
          transform: grow ? getComputedStyle(grow).transform : undefined,
          opacity: fade ? getComputedStyle(fade).opacity : undefined,
        };
      });

      // The pending rule (`[data-ink-ready] [data-tree-figure]:not([data-inked])`)
      // sets `stroke-dashoffset: 1` and `scaleY(0)`; with no gate it never
      // matched, so everything stays at its initial, fully-drawn value.
      expect(state.dashoffset).not.toBe("1px");
      expect(state.transform === "none" || state.transform === undefined).toBe(true);
      expect(state.opacity === "1" || state.opacity === undefined).toBe(true);
    });
  });

  test("scrolled into view, the inked figure draws to completion", async ({ page }) => {
    test.skip(
      viewportWidth(page) < DESKTOP_MIN_WIDTH,
      "below 1024px the drawn presentation is display: none, so its ink root never intersects",
    );

    const figure = page.locator("[data-tree-figure]");
    await figure.scrollIntoViewIfNeeded();

    // InkReveal's observer stamps the wrapper once it clears the -12%
    // rootMargin; from there the CSS transitions (600ms draw, 500ms settle)
    // carry every layer to its finished state.
    await expect(page.locator("[data-tree-figure][data-inked]")).toHaveCount(1);

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const figureEl = document.querySelector("[data-tree-figure]");
            const draw = figureEl?.querySelector("path.tree-draw");
            const grow = figureEl?.querySelector(".tree-grow, .tree-grow-down");
            const fade = figureEl?.querySelector(".tree-fade");
            return {
              dashoffset: draw ? parseFloat(getComputedStyle(draw).strokeDashoffset) : 0,
              transform: grow ? getComputedStyle(grow).transform : "none",
              opacity: fade ? getComputedStyle(fade).opacity : "1",
            };
          }),
        { message: "the drawing must finish, not park mid-growth" },
      )
      .toEqual({ dashoffset: 0, transform: "none", opacity: "1" });
  });

  test("reduced motion: the tree renders fully drawn, never mid-growth", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const state = await page.evaluate(() => {
      const figure = document.querySelector("[data-tree-figure]");
      const draw = figure?.querySelector("path.tree-draw");
      const fade = figure?.querySelector(".tree-fade");
      return {
        dashoffset: draw ? getComputedStyle(draw).strokeDashoffset : undefined,
        opacity: fade ? getComputedStyle(fade).opacity : undefined,
      };
    });

    expect(state.dashoffset).not.toBe("1");
    expect(state.opacity === "1" || state.opacity === undefined).toBe(true);
  });

  /*
   * The always-on changes from the origin-story plan's Task 2: the drawing
   * never claims to be finished (an unfinished shoot, annotated), and the
   * root plinth is drawing rather than a card floating on top of it.
   */
  test("the unfinished shoot draws with its still-growing annotation", async ({ page }) => {
    test.skip(
      viewportWidth(page) < DESKTOP_MIN_WIDTH,
      "below 1024px the drawn presentation is display: none",
    );

    const tree = page.locator("#tree");
    await expect(tree.locator("[data-tree-shoot]")).toHaveCount(1);
    // Round 13 gave the mobile list its own "still growing" tip
    // (KnowledgeTreeList.tsx's `ListGrowingTip`, see list-ink.tsx) — a
    // second element carrying this same text now exists in the DOM at every
    // width, just `display: none` here since the drawn presentation is what
    // shows at >=1024px. `:visible` scopes the count to whichever
    // presentation is actually on screen, same convention as the
    // `[data-tree-tech]:visible` probe above.
    await expect(
      tree.locator('[data-tree-shoot-label]:visible, [data-tree-list-shoot-label]:visible'),
    ).toHaveCount(1);
  });

  test("the ground band renders as drawing, not a boxed card", async ({ page }) => {
    test.skip(
      viewportWidth(page) < DESKTOP_MIN_WIDTH,
      "the plinth's boxed-card removal is a >=1024px change; below that it never had a background to begin with",
    );

    const band = page.locator("#tree [data-cat-nap]");
    await expect(band.getByText(profile.name, { exact: true })).toBeVisible();

    const backgroundColor = await band.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(backgroundColor).toBe("rgba(0, 0, 0, 0)");
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
