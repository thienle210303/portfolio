import { test, expect, type Page } from "@playwright/test";

/**
 * "Ask this site" — a chat thread over the portfolio's own content. Since
 * round 12 (WP-K) this file also owned the hero's compact code artifact and
 * its fourth tab, "Ask Thien"; since round 16 that tab is the *only* place
 * the chat lives. The Lab used to render this same component (`AskThisSite`)
 * directly in its own section; that static import is gone, so the chat no
 * longer exists anywhere until a visitor opens the hero's "Ask Thien" tab.
 * Every hero-chat e2e test still belongs here, not in `sections.spec.ts`.
 *
 * The property worth testing is not answer quality — that is pinned by unit
 * tests against the index in tests/lib/answers.test.ts, and the live-mode
 * route's own contract is pinned in tests/api/ask.test.ts. What matters here
 * is the promise the chat makes: by default this box answers questions
 * *without* running a model, so it must work with no network, invent
 * nothing, say plainly when the site has no answer, and behave like an
 * actual conversation — every turn stays in the thread, in order, and the
 * thread itself scrolls rather than the page — and the visitor never has to
 * reach for the mouse to ask a follow-up. This suite runs with no ASK_LLM_*
 * env vars set, so `liveModeConfigured` is false throughout — exactly the
 * state the site actually deploys in today.
 */

const DESKTOP_WIDTH = 1440;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

/**
 * The chat moved out of the Lab and into the hero's code artifact (round 16).
 * Reaching it is now: load the page, select the fourth tab. The panel is a
 * lazily imported chunk, so the wait is for the question field, not for the
 * tab's own click to settle.
 */
async function openHeroChat(page: Page) {
  await page.goto("/");
  await page.getByRole("tab", { name: "Ask Thien" }).click();
  await expect(questionField(page)).toBeVisible({ timeout: 15_000 });
}

/** The conversation list — one `<li>` per question asked so far. Unscoped:
 *  the chat now mounts in exactly one place on the page (the hero's "Ask
 *  Thien" panel, and only while it is the active tab), so there is nothing
 *  else on the page this could accidentally match. */
function conversation(page: Page) {
  return page.getByRole("list", { name: "Conversation" });
}

/** The scrolling thread window (round 12, WP-K) that `conversation` nests
 *  inside — its own accessible name, independent of the list's. */
function conversationLog(page: Page) {
  return page.getByRole("log", { name: "Conversation thread" });
}

/**
 * The most recently asked turn's own root `<li>`.
 *
 * Not `getByRole("listitem").last()`: role queries match descendants, and
 * each answered turn nests a "Sourced answers" list whose own `<li>`s would
 * win `.last()` — a single-turn thread counts 4 listitems that way, and the
 * chained "Sourced answers" lookup then searches inside a leaf answer and
 * finds nothing. Only structure separates a turn from a sourced answer
 * (a no-answer turn is just a paragraph, so no `has:` filter can carry it),
 * hence the one CSS child combinator: a turn is a direct child of the
 * conversation list.
 */
function lastTurn(page: Page) {
  return conversation(page).locator(":scope > li").last();
}

/**
 * The question field, by its accessible name rather than its placeholder —
 * the placeholder text changes from "or ask your own" to "ask a follow-up"
 * once the thread has a first turn, so a placeholder-based locator would go
 * stale mid-test the moment that happens.
 */
function questionField(page: Page) {
  return page.getByRole("textbox", { name: "Ask a question about this portfolio" });
}

test.describe("ask this site", () => {
  test("answers a suggested question with sourced, linked evidence", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openHeroChat(page);

    await page.getByRole("button", { name: "What does he do at DoorDash?" }).click();

    const turn = lastTurn(page);
    const results = turn.getByRole("list", { name: "Sourced answers" }).getByRole("listitem");
    await expect(results.first()).toBeVisible();

    // Every answer carries a source and a route back to where it lives.
    const first = results.first();
    await expect(first).toContainText(/DoorDash/i);
    await expect(first.getByRole("link", { name: /Read it in/ })).toHaveAttribute(
      "href",
      /^#(about|philosophy|work|lab|journey|resume)$/,
    );
  });

  test("says so plainly when the site has no answer, and invents nothing", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openHeroChat(page);

    await questionField(page).fill("what is the capital of France");
    await page.keyboard.press("Enter");

    const turn = lastTurn(page);
    await expect(turn.getByText(/Nothing on this page answers that/)).toBeVisible();
    await expect(turn.getByRole("list", { name: "Sourced answers" })).toHaveCount(0);
  });

  test("works with the network offline — there is no model to fetch", async ({ page, context }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openHeroChat(page);

    // Everything the feature needs already shipped with the page. If a model
    // or an API ever creeps in behind this box while live mode is off, this
    // test is what catches it.
    await context.setOffline(true);
    await page.getByRole("button", { name: "Where did he study?" }).click();
    await expect(lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();
    await context.setOffline(false);
  });

  test("every suggested question is a live control, not a dead one", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openHeroChat(page);

    const suggestions = page.locator('[data-hero-step="code"] ul li button');
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index++) {
      await suggestions.nth(index).click();
      const turn = lastTurn(page);
      // Either real results or the honest "nothing here" line — never blank.
      const answered = await turn.getByRole("list", { name: "Sourced answers" }).getByRole("listitem").count();
      const declined = await turn.getByText(/Nothing on this page answers that/).count();
      expect(answered + declined, `suggestion ${index} produced no response`).toBeGreaterThan(0);
      expect(answered, `suggestion ${index} is a dead control`).toBeGreaterThan(0);
    }
  });

  test("offers the same answer as a code artifact, one view at a time", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openHeroChat(page);

    await page.getByRole("button", { name: "Where did he study?" }).click();
    const turn = lastTurn(page);

    // Scoped to this turn's tablist on purpose: an unscoped `tab` named
    // "Code" would also match the workflow stage tabs in other sections.
    const views = turn.getByRole("tablist", { name: "Answer view" });

    // Prose is the answer; code is the flourish, so prose is what arrives.
    await expect(turn.getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();
    const codeTab = views.getByRole("tab", { name: "Code" });
    await expect(codeTab).toHaveAttribute("aria-selected", "false");

    await codeTab.click();
    // The first turn in a fresh thread is always "answer-1.ts" —
    // `answerFilename` in answer-code.ts numbers turns by their position.
    const artifact = turn.getByRole("region", { name: "answer-1.ts" });
    await expect(artifact).toBeVisible();
    // The visitor's question, quoted back as a string literal rather than
    // paraphrased — the same discipline the prose view keeps.
    await expect(artifact).toContainText('question: "Where did he study?"');

    // Only one rendering is ever in the DOM, so a screen reader is never handed
    // the same answer twice.
    await expect(turn.getByRole("list", { name: "Sourced answers" })).toHaveCount(0);

    await views.getByRole("tab", { name: "Prose" }).click();
    await expect(turn.getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();
    await expect(turn.getByRole("region", { name: "answer-1.ts" })).toHaveCount(0);
  });

  test("the code view is reachable by keyboard alone", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openHeroChat(page);

    await page.getByRole("button", { name: "Where did he study?" }).click();
    const turn = lastTurn(page);

    const views = turn.getByRole("tablist", { name: "Answer view" });
    await views.getByRole("tab", { name: "Prose" }).focus();
    await page.keyboard.press("ArrowRight");

    await expect(views.getByRole("tab", { name: "Code" })).toBeFocused();
    await expect(turn.getByRole("region", { name: "answer-1.ts" })).toBeVisible();
  });

  test("is keyboard operable end to end", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openHeroChat(page);

    const field = questionField(page);
    await field.focus();
    await field.fill("scraper");
    await page.keyboard.press("Enter");
    await expect(lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();
  });

  test("is a real thread: every turn stays in the thread, in order, and the thread scrolls — not the page", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openHeroChat(page);

    // Round 10's contract was "every question asked stays on screen" — an
    // unbounded thread made that literally true by growing the *page* one
    // turn at a time, which is exactly what the owner reported this round:
    // "if I click multiple buttons it just keeps stacking up on the page."
    // The honest version: every turn stays in the thread, in order, inside
    // a scroll window the page's own height no longer answers to.
    const pageHeightBeforeAnyTurn = await page.evaluate(() => document.documentElement.scrollHeight);

    await page.getByRole("button", { name: "What does he do at DoorDash?" }).click();
    await expect(lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();

    const pageHeightAfterOneTurn = await page.evaluate(() => document.documentElement.scrollHeight);

    await questionField(page).fill("what is the capital of France");
    await page.keyboard.press("Enter");
    await expect(lastTurn(page).getByText(/Nothing on this page answers that/)).toBeVisible();

    await page.getByRole("button", { name: "Where did he study?" }).click();
    await expect(lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();

    const pageHeightAfterThreeTurns = await page.evaluate(() => document.documentElement.scrollHeight);

    // The scroll window appearing (turns 0 → 1) does change the page's
    // height once — the "Clear conversation" row and the window itself
    // replace the idle hint. What must not happen is the page growing
    // *again* for the second and third turns, the way it did before this
    // round: a few px of rounding slack, nothing resembling three more
    // turns' worth of prose.
    expect(pageHeightAfterThreeTurns).toBeLessThanOrEqual(pageHeightAfterOneTurn + 4);
    expect(pageHeightAfterOneTurn).toBeGreaterThanOrEqual(pageHeightBeforeAnyTurn);

    // All three turns are still there, in order, inside the scrolling log —
    // direct children only, same reasoning as `lastTurn`: a bare listitem
    // role query would also count each turn's nested sourced answers.
    const log = conversationLog(page);
    await expect(log).toHaveAttribute("tabindex", "0");
    const turns = conversation(page).locator(":scope > li");
    await expect(turns).toHaveCount(3);
    await expect(turns.nth(0)).toContainText("What does he do at DoorDash?");
    await expect(turns.nth(0)).toContainText(/DoorDash/i);
    await expect(turns.nth(1)).toContainText("what is the capital of France");
    await expect(turns.nth(2)).toContainText("Where did he study?");
  });

  test("scrolls the thread window internally, without the page lurching to follow it", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openHeroChat(page);

    // A real bug found while building this: `lastTurn.scrollIntoView()`
    // walks every scrollable ancestor, including the page — Chromium will
    // satisfy it by scrolling the *window* thousands of pixels rather than
    // (or as well as) the inner log, whenever the inner box alone can't
    // bring the target into the outer viewport (verified directly: a
    // detached repro scrolled `window.scrollY` by five figures for a target
    // already inside a correctly-configured `overflow:auto` box). The fix
    // scrolls the log region itself via `Element.scrollTo()`, which is
    // scoped to that one box and never touches an ancestor. The hero sits at
    // the top of the page, so there is no large pre-existing scroll to undo
    // here the way there was when the chat lived in the Lab further down.
    const windowScrollBefore = await page.evaluate(() => window.scrollY);

    for (const question of [
      "What does he do at DoorDash?",
      "Where did he study?",
      "What has he actually measured?",
    ]) {
      await page.getByRole("button", { name: question }).click();
      await expect(
        lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first(),
      ).toBeVisible();
    }

    const windowScrollAfter = await page.evaluate(() => window.scrollY);
    expect(Math.abs(windowScrollAfter - windowScrollBefore)).toBeLessThan(2000);

    // The log region did scroll internally, though — it wound up somewhere
    // past its own top, not stuck at 0 with three turns' worth of content
    // hidden below the fold.
    const log = conversationLog(page);
    await expect(async () => {
      const logScrollTop = await log.evaluate((el) => el.scrollTop);
      expect(logScrollTop).toBeGreaterThan(0);
    }).toPass();
  });

  test("the scroll region is keyboard-reachable, with a proper accessible name, and does not trap focus", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openHeroChat(page);

    // Idle: nothing to scroll yet, so no extra tab stop.
    await expect(conversationLog(page)).not.toHaveAttribute("tabindex");

    await page.getByRole("button", { name: "What does he do at DoorDash?" }).click();
    const log = conversationLog(page);
    await expect(log).toHaveAttribute("tabindex", "0");

    await log.focus();
    await expect(log).toBeFocused();

    // Tab moves on — into the turn's own focusable content first (a source
    // link), then eventually past the region to the compose area below —
    // never stuck cycling back to the log container itself.
    await page.keyboard.press("Tab");
    await expect(log).not.toBeFocused();
  });

  test("Clear conversation is state-only: it appears once a turn exists, empties the thread, and returns focus to the input", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openHeroChat(page);

    await expect(page.getByRole("button", { name: "Clear conversation" })).toHaveCount(0);

    await page.getByRole("button", { name: "Where did he study?" }).click();
    const clearButton = page.getByRole("button", { name: "Clear conversation" });
    await expect(clearButton).toBeVisible();

    await clearButton.click();

    await expect(page.getByRole("button", { name: "Clear conversation" })).toHaveCount(0);
    await expect(conversation(page)).toHaveCount(0);
    await expect(questionField(page)).toBeFocused();

    // Nothing was ever persisted, so a fresh page load starts empty either
    // way. `openHeroChat` already does a full `page.goto("/")` -- a second,
    // separate reload before it would just repeat that navigation -- and a
    // fresh load also resets the hero back to its default "Profile" tab, so
    // reopening the chat here is what actually re-confirms the thread is gone.
    await openHeroChat(page);
    await expect(page.getByRole("button", { name: "Clear conversation" })).toHaveCount(0);
    await expect(conversation(page)).toHaveCount(0);
  });

  test("keeps focus in the input after asking, ready for a follow-up with no mouse", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openHeroChat(page);

    const field = questionField(page);
    await field.focus();
    await field.fill("scraper");
    await page.keyboard.press("Enter");
    await expect(field).toBeFocused();

    // A suggestion button click moves focus to the button by default; this
    // box pulls it back to the field so a keyboard-only visitor can keep
    // going without reaching for anything else.
    await page.getByRole("button", { name: "Where did he study?" }).click();
    await expect(questionField(page)).toBeFocused();
  });

  test("the conversation survives switching to another code tab and back", async ({ page }) => {
    await openHeroChat(page);
    const input = questionField(page);
    await input.fill("What did Thien build at DoorDash?");
    await input.press("Enter");
    await expect(page.getByText("What did Thien build at DoorDash?")).toBeVisible();

    await page.getByRole("tab", { name: "Profile" }).click();
    await expect(page.getByText("What did Thien build at DoorDash?")).toHaveCount(0);

    await page.getByRole("tab", { name: "Ask Thien" }).click();
    await expect(page.getByText("What did Thien build at DoorDash?")).toBeVisible();
  });
});

/* -------------------------------------------------------------------------- */
/* The hero's code artifact: three authored tabs plus "Ask Thien" (round 12)  */
/* -------------------------------------------------------------------------- */

function heroTablist(page: Page) {
  return page.getByRole("tablist", { name: "Code artifact tabs" });
}

function heroAskTab(page: Page) {
  return heroTablist(page).getByRole("tab", { name: "Ask Thien" });
}

test.describe("hero code artifact — compact rendering", () => {
  test("renders noticeably smaller padding than an ordinary CodeBlock (a turn's own Code view, once opened)", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "layout is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The hero's own wrapper: p-3 (12px), not the ordinary p-4 (16px).
    const heroWrapper = page.locator('[data-hero-step="code"]');
    const heroWrapperPadding = await heroWrapper.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    expect(heroWrapperPadding).toBeLessThan(16);

    // The active tab's CodeBlock itself steps down too.
    const heroRegion = page.getByRole("region", { name: "builder.ts" });
    const heroRegionPadding = await heroRegion.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    expect(heroRegionPadding).toBeLessThan(16);

    // A CodeBlock elsewhere in the same artifact (a turn's own "answer, as
    // data" view inside the "Ask Thien" tab) keeps the ordinary size —
    // proving compact is scoped to the three authored tabs
    // (`HeroCodeArtifact.tsx` passes `compact` only to those), not a global
    // change to every CodeBlock the hero renders.
    await heroAskTab(page).click();
    await expect(questionField(page)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Where did he study?" }).click();
    const turn = conversation(page).locator(":scope > li").last();
    await turn.getByRole("tablist", { name: "Answer view" }).getByRole("tab", { name: "Code" }).click();
    const answerRegion = page.getByRole("region", { name: "answer-1.ts" });
    const answerRegionPadding = await answerRegion.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    expect(answerRegionPadding).toBe(16);
  });

  test("the three authored tabs' content is unchanged — only the rendering shrank", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "layout is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("region", { name: "builder.ts" })).toContainText(
      'role: "Software Engineer"',
    );
    await heroTablist(page).getByRole("tab", { name: "Principles" }).click();
    await expect(page.getByRole("region", { name: "principles.ts" })).toContainText(
      "Read the system before changing it",
    );
  });

  test("holds up in both themes (no overlapping/clipped code text)", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "layout is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    for (const theme of ["day", "night"] as const) {
      await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
      const region = page.getByRole("region", { name: "builder.ts" });
      await expect(region).toBeVisible();
      await expect(region).toContainText('role: "Software Engineer"');
    }
  });
});

test.describe("hero code artifact — Ask Thien tab", () => {
  test("is a fourth tab in the same tablist, and keyboard behaviour (Home/End/Arrow/wrap) is unchanged", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const tabs = heroTablist(page).getByRole("tab");
    await expect(tabs).toHaveCount(4);
    await expect(tabs.nth(3)).toHaveAccessibleName("Ask Thien");

    await tabs.nth(0).focus();
    await page.keyboard.press("End");
    await expect(tabs.nth(3)).toBeFocused();
    await expect(tabs.nth(3)).toHaveAttribute("aria-selected", "true");

    // Wraps past the last tab back to the first, same as any other Tabs
    // instance on the site.
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(0)).toBeFocused();
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.nth(3)).toBeFocused();
  });

  test("the engine chunk lazy-loads only once the tab is actually activated", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Tabs only ever mounts the active panel (Profile, by default), so the
    // chat's own field must not exist in the DOM before its tab is chosen.
    await expect(questionField(page)).toHaveCount(0);

    const chunkRequest = page.waitForRequest(
      (request) => request.resourceType() === "script" && request.url().includes("/_next/static/"),
    );
    await heroAskTab(page).click();
    // A new script request fires as a direct result of activating the tab —
    // the `import()` behind it, not something already on the page.
    await chunkRequest;

    await expect(questionField(page)).toBeVisible();
  });

  // Deliberately not viewport-gated, unlike the tests above: this is the one
  // property that is *supposed* to vary with width, and the scoped run for
  // this work package always includes chromium-1440 plus one narrow project
  // (`pnpm exec playwright test e2e/ask.spec.ts --project=chromium-1440
  // --project=chromium-<width>`). Below `lg` the hero stacks (identity, then
  // the code artifact, then the rail — see Hero.tsx) but the artifact and
  // its tablist render exactly as they do at desktop width; the tablist's
  // own horizontal scroll (Tabs.tsx) is what keeps a fourth tab reachable
  // instead of wrapping or being clipped, so "Ask Thien" works the same way
  // on a phone as it does at 1440 rather than vanishing below `lg`.
  test("works at narrow viewports too, with 44px targets and no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const askTab = heroAskTab(page);
    await askTab.scrollIntoViewIfNeeded();
    const tabBox = await askTab.boundingBox();
    expect(tabBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await askTab.click();
    const field = questionField(page);
    await expect(field).toBeVisible({ timeout: 15_000 });
    await field.fill("scraper");
    await field.press("Enter");
    await expect(page.getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
