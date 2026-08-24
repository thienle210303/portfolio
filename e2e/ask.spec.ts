import { test, expect, type Page } from "@playwright/test";

/**
 * "Ask this site" — a chat thread over the portfolio's own content — plus,
 * since round 12 (WP-K), the hero's compact code artifact and its fourth
 * tab, "Ask Thien". Both live in this one file per the round's file
 * ownership split: every hero-chat e2e test belongs here, not in
 * `sections.spec.ts`.
 *
 * The property worth testing is not answer quality — that is pinned by unit
 * tests against the index in tests/lib/answers.test.ts, and the live-mode
 * route's own contract is pinned in tests/api/ask.test.ts. What matters here
 * is the promise the surrounding section makes: by default this box answers
 * questions *without* running a model, so it must work with no network,
 * invent nothing, say plainly when the site has no answer, and behave like an
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

/** The conversation list — one `<li>` per question asked so far. */
function conversation(page: Page) {
  return page.locator("#lab").getByRole("list", { name: "Conversation" });
}

/** The scrolling thread window (round 12, WP-K) that `conversation` nests
 *  inside — its own accessible name, independent of the list's. */
function conversationLog(page: Page) {
  return page.locator("#lab").getByRole("log", { name: "Conversation thread" });
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
    await page.goto("/");
    await page.waitForLoadState("networkidle");

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
    await page.goto("/");
    // Wait for hydration before typing. Without this the Enter key lands on a
    // form React has not attached to yet, the browser performs its own native
    // submit, and the assertion below fails against a freshly reloaded page —
    // the failure log shows a navigation to "/?" rather than a missing string.
    await page.waitForLoadState("networkidle");

    await questionField(page).fill("what is the capital of France");
    await page.keyboard.press("Enter");

    const turn = lastTurn(page);
    await expect(turn.getByText(/Nothing on this page answers that/)).toBeVisible();
    await expect(turn.getByRole("list", { name: "Sourced answers" })).toHaveCount(0);
  });

  test("works with the network offline — there is no model to fetch", async ({ page, context }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

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
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const suggestions = page.locator("#lab ul li button");
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
    await page.goto("/");
    await page.waitForLoadState("networkidle");

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
    await page.goto("/");
    await page.waitForLoadState("networkidle");

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
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const field = questionField(page);
    await field.focus();
    await field.fill("scraper");
    await page.keyboard.press("Enter");
    await expect(lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();
  });

  test("is a real thread: every turn stays in the thread, in order, and the thread scrolls — not the page", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

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
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // A real bug found while building this: `lastTurn.scrollIntoView()`
    // walks every scrollable ancestor, including the page — Chromium will
    // satisfy it by scrolling the *window* thousands of pixels rather than
    // (or as well as) the inner log, whenever the inner box alone can't
    // bring the target into the outer viewport (verified directly: a
    // detached repro scrolled `window.scrollY` by five figures for a target
    // already inside a correctly-configured `overflow:auto` box). The fix
    // scrolls the log region itself via `Element.scrollTo()`, which is
    // scoped to that one box and never touches an ancestor.
    //
    // This does not assert `window.scrollY` is *unchanged* end to end —
    // `ask()` still calls `fieldRef.current.focus()` after every question
    // (round 10, "keeps focus in hand"), and focusing an off-screen input
    // legitimately scrolls the page a little to reveal it; measured directly
    // across three questions here, that follow-focus movement lands under
    // 1000px total. What the old bug did was different in kind, not degree:
    // five- and six-figure page-level jumps for a single turn, scaling with
    // how far down the *page* the thread happened to sit. 2000px is
    // comfortably above the measured legitimate nudge and comfortably below
    // what an ancestor-climbing regression would produce.
    await page.evaluate(() => document.getElementById("lab")?.scrollIntoView());
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
    await page.goto("/");
    await page.waitForLoadState("networkidle");

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
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: "Clear conversation" })).toHaveCount(0);

    await page.getByRole("button", { name: "Where did he study?" }).click();
    const clearButton = page.getByRole("button", { name: "Clear conversation" });
    await expect(clearButton).toBeVisible();

    await clearButton.click();

    await expect(page.getByRole("button", { name: "Clear conversation" })).toHaveCount(0);
    await expect(conversation(page)).toHaveCount(0);
    await expect(questionField(page)).toBeFocused();

    // Nothing was ever persisted, so a reload starts fresh either way — this
    // just confirms clearing didn't leave the thread in some half-cleared
    // state a reload would then contradict.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Clear conversation" })).toHaveCount(0);
  });

  test("keeps focus in the input after asking, ready for a follow-up with no mouse", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

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
});

/* -------------------------------------------------------------------------- */
/* The hero: compact code artifact + the "Ask Thien" tab (round 12, WP-K)     */
/* -------------------------------------------------------------------------- */

function heroTablist(page: Page) {
  return page.getByRole("tablist", { name: "Code artifact tabs" });
}

function heroAskTab(page: Page) {
  return heroTablist(page).getByRole("tab", { name: "Ask Thien" });
}

/** The mini chat's own question field, distinct in accessible name from the
 *  Lab's `questionField` above — the two must never be confused by a shared
 *  locator, since a test that meant the Lab's full thread must not silently
 *  end up typing into the hero's single-turn mini chat instead. */
function heroQuestionField(page: Page) {
  return page.getByRole("textbox", { name: "Ask Thien a question about this portfolio" });
}

test.describe("hero code artifact — compact rendering", () => {
  test("renders noticeably smaller padding than an ordinary CodeBlock (the Lab's own, once opened)", async ({ page }) => {
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

    // A CodeBlock elsewhere on the page (a turn's own "answer, as data" view
    // in the Lab) keeps the ordinary size — proving compact is scoped to
    // the hero, not a global change to every CodeBlock on the site.
    await page.getByRole("button", { name: "Where did he study?" }).click();
    await lastTurn(page)
      .getByRole("tablist", { name: "Answer view" })
      .getByRole("tab", { name: "Code" })
      .click();
    const labRegion = page.getByRole("region", { name: "answer-1.ts" });
    const labRegionPadding = await labRegion.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    expect(labRegionPadding).toBe(16);
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
    // mini chat's field must not exist in the DOM before its tab is chosen.
    await expect(heroQuestionField(page)).toHaveCount(0);

    const chunkRequest = page.waitForRequest(
      (request) => request.resourceType() === "script" && request.url().includes("/_next/static/"),
    );
    await heroAskTab(page).click();
    // A new script request fires as a direct result of activating the tab —
    // the `import()` behind it, not something already on the page.
    await chunkRequest;

    await expect(heroQuestionField(page)).toBeVisible();
  });

  test("answers with the same sourced evidence as the Lab, latest turn only, no Code view, and links back to the Lab", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await heroAskTab(page).click();
    await expect(page.getByText("A lexical index over this page — no model.")).toBeVisible();

    const field = heroQuestionField(page);
    await field.fill("What does he do at DoorDash?");
    await field.press("Enter");

    const results = page.getByRole("list", { name: "Sourced answers" });
    await expect(results.getByRole("listitem").first()).toBeVisible();
    await expect(results).toContainText(/DoorDash/i);

    // Prose only — no second "answer, as data" view here.
    await expect(page.locator('[data-hero-step="code"]').getByRole("tab", { name: "Code" })).toHaveCount(0);

    // A second question replaces the first turn rather than appending —
    // the mini chat shows the latest turn only. Scoped to the hero wrapper:
    // the Lab further down the page has its own "What does he do at
    // DoorDash?" suggestion button, which an unscoped query would also
    // match regardless of the mini chat's own state.
    await field.fill("Where did he study?");
    await field.press("Enter");
    await expect(
      page.locator('[data-hero-step="code"]').getByText("What does he do at DoorDash?"),
    ).toHaveCount(0);

    const link = page.getByRole("link", { name: /Full conversation in the Lab/ });
    await expect(link).toHaveAttribute("href", "#lab");

    // Static engine, no live network call — the hero tab never wires up
    // `/api/ask` regardless of live-mode configuration.
    await expect(page.getByText("Live mode")).toHaveCount(0);
  });

  test("keeps focus in the mini chat's field after asking, and stays keyboard-operable end to end", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await heroAskTab(page).click();
    const field = heroQuestionField(page);
    await field.focus();
    await field.fill("scraper");
    await page.keyboard.press("Enter");

    await expect(field).toBeFocused();
    await expect(page.getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();
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
    const field = heroQuestionField(page);
    await expect(field).toBeVisible();
    await field.fill("scraper");
    await field.press("Enter");
    await expect(page.getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
