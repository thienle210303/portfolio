import { test, expect, type Page } from "@playwright/test";
import { navItems } from "../src/content/portfolio";

/**
 * "Ask this site" — a chat thread over the portfolio's own content. Rounds 16
 * and 17 kept it behind the hero code artifact's fourth tab, "Ask Thien";
 * round 18 moved it to Contact, under "Ask about my work" (`#ask`), and the
 * hero went back to three code tabs. The chat is still a lazily imported
 * chunk: it does not exist on the page until `#ask` nears the viewport
 * (`AskLoader.tsx`). Every chat e2e test belongs here, not in
 * `sections.spec.ts`, along with the hero artifact's compact rendering,
 * which this file has owned since round 12 (WP-K).
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

/** The chat's home in Contact (round 18): a wrapper with a stable id. */
function askBlock(page: Page) {
  return page.locator("#ask");
}

/**
 * Reaching the chat: load the page, bring `#ask` into view. The chat is a
 * lazily imported chunk that starts loading as the block nears the viewport,
 * so the wait is for the question field, not for the scroll to settle.
 */
async function openChat(page: Page) {
  await page.goto("/");
  await askBlock(page).scrollIntoViewIfNeeded();
  await expect(questionField(page)).toBeVisible({ timeout: 15_000 });
}

/** The conversation list — one `<li>` per question asked so far. Unscoped:
 *  the chat mounts in exactly one place on the page (Contact's `#ask`), so
 *  there is nothing else on the page this could accidentally match. */
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
    await openChat(page);

    await page.getByRole("button", { name: "What does he do at DoorDash?" }).click();

    const turn = lastTurn(page);
    const results = turn.getByRole("list", { name: "Sourced answers" }).getByRole("listitem");
    await expect(results.first()).toBeVisible();

    // Every answer carries a source and a route back to where it lives.
    const first = results.first();
    await expect(first).toContainText(/DoorDash/i);
    // "More on this in …", not "Read it in …": a citation's section renders the
    // passage's subject, not necessarily the sentence (see `Document.sectionId`
    // in src/lib/answer-corpus.ts, and the note on `ProseAnswers`).
    await expect(first.getByRole("link", { name: /More on this in/ })).toHaveAttribute(
      "href",
      // Every section the page has, plus the `#journey` alias the Journey
      // renders. Derived from the nav rather than typed out: a hand-written
      // alternation here kept `work` and `skills` alive after round 18 deleted
      // both sections. (No document cites `journey` since round 18's Task 13 —
      // `tests/lib/answers.test.ts` asserts that — so the alternative is an
      // allowance this spec no longer exercises.)
      new RegExp(`^#(${[...navItems.map((item) => item.sectionId), "journey"].join("|")})$`),
    );
  });

  test("says so plainly when the site has no answer, and invents nothing", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openChat(page);

    await questionField(page).fill("what is the capital of France");
    await page.keyboard.press("Enter");

    const turn = lastTurn(page);
    await expect(turn.getByText(/Nothing written for this site answers that/)).toBeVisible();
    await expect(turn.getByRole("list", { name: "Sourced answers" })).toHaveCount(0);
  });

  test("works with the network offline — there is no model to fetch", async ({ page, context }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openChat(page);

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
    await openChat(page);

    const suggestions = askBlock(page).locator('[aria-label="Try asking"] button');
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index++) {
      await suggestions.nth(index).click();
      const turn = lastTurn(page);
      // Either real results or the honest "nothing here" line — never blank.
      const answered = await turn.getByRole("list", { name: "Sourced answers" }).getByRole("listitem").count();
      const declined = await turn.getByText(/Nothing written for this site answers that/).count();
      expect(answered + declined, `suggestion ${index} produced no response`).toBeGreaterThan(0);
      expect(answered, `suggestion ${index} is a dead control`).toBeGreaterThan(0);
    }
  });

  test("offers the same answer as a code artifact, one view at a time", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openChat(page);

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
    await openChat(page);

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
    await openChat(page);

    const field = questionField(page);
    await field.focus();
    await field.fill("scraper");
    await page.keyboard.press("Enter");
    await expect(lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();
  });

  test("is a real thread: every turn stays in the thread, in order, and the thread scrolls — not the page", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openChat(page);

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
    await expect(lastTurn(page).getByText(/Nothing written for this site answers that/)).toBeVisible();

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
    await openChat(page);

    // A real bug found while building this: `lastTurn.scrollIntoView()`
    // walks every scrollable ancestor, including the page — Chromium will
    // satisfy it by scrolling the *window* thousands of pixels rather than
    // (or as well as) the inner log, whenever the inner box alone can't
    // bring the target into the outer viewport (verified directly: a
    // detached repro scrolled `window.scrollY` by five figures for a target
    // already inside a correctly-configured `overflow:auto` box). The fix
    // scrolls the log region itself via `Element.scrollTo()`, which is
    // scoped to that one box and never touches an ancestor. `openChat` has
    // already scrolled the page to `#ask`, so this measures movement from
    // there, not from the top.
    //
    // The bound is tight on purpose: the old 2000px allowance could not
    // fail. And it is only meaningful if the page *could* lurch that far, so
    // the room below is asserted first.
    const LURCH = 50;
    const windowScrollBefore = await page.evaluate(() => window.scrollY);
    const roomBelow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight - window.scrollY,
    );
    expect(roomBelow, "the page has no room to lurch, so this test could not fail").toBeGreaterThan(LURCH);

    for (const question of [
      "What does he do at DoorDash?",
      "Where did he study?",
      "What has he actually measured?",
    ]) {
      // `dispatchEvent`, not `click()`: Playwright scrolls a target into view
      // before clicking it, which would move the window itself and hide or
      // fake the very movement this measures.
      await page.getByRole("button", { name: question }).dispatchEvent("click");
      await expect(
        lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first(),
      ).toBeVisible();
    }

    const windowScrollAfter = await page.evaluate(() => window.scrollY);
    expect(Math.abs(windowScrollAfter - windowScrollBefore)).toBeLessThan(LURCH);

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
    await openChat(page);

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
    await openChat(page);

    await expect(page.getByRole("button", { name: "Clear conversation" })).toHaveCount(0);

    await page.getByRole("button", { name: "Where did he study?" }).click();
    const clearButton = page.getByRole("button", { name: "Clear conversation" });
    await expect(clearButton).toBeVisible();

    await clearButton.click();

    await expect(page.getByRole("button", { name: "Clear conversation" })).toHaveCount(0);
    await expect(conversation(page)).toHaveCount(0);
    await expect(questionField(page)).toBeFocused();

    // Nothing was ever persisted, so a fresh page load starts empty either
    // way. `openChat` already does a full `page.goto("/")` -- a second,
    // separate reload before it would just repeat that navigation -- so
    // reopening the chat here is what actually re-confirms the thread is gone.
    await openChat(page);
    await expect(page.getByRole("button", { name: "Clear conversation" })).toHaveCount(0);
    await expect(conversation(page)).toHaveCount(0);
  });

  test("keeps focus in the input after asking, ready for a follow-up with no mouse", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openChat(page);

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

  test("the conversation survives a client-side trip to the résumé and back", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    // The one remaining case that unmounts the chat (see `threadCache` in
    // AskThisSite.tsx): `/` and `/resume` link to each other with
    // `next/link`, so the trip is a client-side navigation and the module
    // scope the thread lives in survives it.
    await openChat(page);
    const input = questionField(page);
    await input.fill("What did Thien build at DoorDash?");
    await input.press("Enter");
    await expect(conversation(page).getByText("What did Thien build at DoorDash?")).toBeVisible();

    await page.getByRole("link", { name: "Open résumé" }).click();
    await expect(page).toHaveURL(/\/resume$/);
    await page.getByRole("link", { name: "Back to the site" }).click();
    await expect(page).toHaveURL(/\/$/);

    await askBlock(page).scrollIntoViewIfNeeded();
    await expect(conversation(page).getByText("What did Thien build at DoorDash?")).toBeVisible({
      timeout: 15_000,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* The hero's code artifact: three authored tabs (round 12, round 18)          */
/* -------------------------------------------------------------------------- */

function heroTablist(page: Page) {
  return page.getByRole("tablist", { name: "Code artifact tabs" });
}

test.describe("hero code artifact — compact rendering", () => {
  test("renders noticeably smaller padding than an ordinary CodeBlock (a chat turn's own Code view)", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "layout is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The hero's own wrapper: p-3 (12px), not the ordinary p-4 (16px).
    const heroWrapper = page.locator('[data-hero-step="code"]');
    const heroWrapperPadding = await heroWrapper.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    expect(heroWrapperPadding).toBeLessThan(16);

    // The active tab's CodeBlock itself steps down too.
    const heroRegion = page.getByRole("region", { name: "src/lib/globe.ts" });
    const heroRegionPadding = await heroRegion.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    expect(heroRegionPadding).toBeLessThan(16);

    // A CodeBlock elsewhere on the page (a chat turn's own "answer, as data"
    // view, in Contact's `#ask`) keeps the ordinary size — proving compact
    // is scoped to the hero's authored tabs (`HeroCodeArtifact.tsx` passes
    // `compact` only to those), not a global change to every CodeBlock.
    await askBlock(page).scrollIntoViewIfNeeded();
    await expect(questionField(page)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Where did he study?" }).click();
    const turn = conversation(page).locator(":scope > li").last();
    await turn.getByRole("tablist", { name: "Answer view" }).getByRole("tab", { name: "Code" }).click();
    const answerRegion = page.getByRole("region", { name: "answer-1.ts" });
    const answerRegionPadding = await answerRegion.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    expect(answerRegionPadding).toBe(16);
  });

  test("the authored tabs render their real excerpts", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "layout is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("region", { name: "src/lib/globe.ts" })).toContainText(
      "export function project(",
    );
    await heroTablist(page).getByRole("tab", { name: "The rule" }).click();
    await expect(page.getByRole("region", { name: "tests/lib/worlds.test.ts" })).toContainText(
      "renders every field plaque verbatim",
    );
  });

  test("holds up in both themes (no overlapping/clipped code text)", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "layout is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    for (const theme of ["day", "night"] as const) {
      await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
      const region = page.getByRole("region", { name: "src/lib/globe.ts" });
      await expect(region).toBeVisible();
      await expect(region).toContainText("export function project(");
    }
  });

  test("is three code tabs, with no chat tab left behind", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(heroTablist(page).getByRole("tab")).toHaveCount(3);
    await expect(page.getByRole("tab", { name: "Ask Thien" })).toHaveCount(0);
    await expect(page.locator("#about").getByRole("textbox", { name: "Ask a question about this portfolio" })).toHaveCount(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Ask, in Contact (round 18)                                                  */
/* -------------------------------------------------------------------------- */

test.describe("ask, in contact", () => {
  test("sits in #contact under its own heading, and is not the card's <aside>", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "structure is viewport-independent; run once");
    await page.goto("/");

    await expect(page.locator("#contact #ask")).toHaveCount(1);
    await expect(askBlock(page).getByRole("heading", { level: 3, name: "Ask about my work" })).toBeVisible();
    // The companion perches on the first <aside> in #contact (the business
    // card); the chat must not become it.
    await expect(page.locator("#contact aside")).toHaveCount(1);
    await expect(page.locator("#contact aside #ask")).toHaveCount(0);
  });

  test("a link to /#ask lands on the chat, loaded", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/#ask");
    await expect(questionField(page)).toBeVisible({ timeout: 15_000 });
    await expect(askBlock(page).getByRole("heading", { name: "Ask about my work" })).toBeInViewport();
  });

  test("the engine chunk lazy-loads only once #ask nears the viewport", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // At the top of the page the block is thousands of pixels away, well
    // outside its load-ahead margin, so the chat's own field must not exist.
    await expect(questionField(page)).toHaveCount(0);

    // Every script the page has already asked for, so the request awaited
    // below has to be a NEW one — and one whose body is the chat itself (its
    // field's accessible name is a string literal in that chunk), not any
    // other late script.
    const loaded = new Set(
      await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name)),
    );
    const chunkResponse = page.waitForResponse(
      async (response) =>
        response.request().resourceType() === "script" &&
        !loaded.has(response.url()) &&
        (await response.text()).includes("Ask a question about this portfolio"),
    );
    await askBlock(page).scrollIntoViewIfNeeded();
    await chunkResponse;

    await expect(questionField(page)).toBeVisible({ timeout: 15_000 });
  });

  // The chat's room (`--ask-room` in globals.css) is reserved before it
  // loads, so nothing after it moves when it lands. Measured where the
  // breakpoints put different heights in force.
  test("the chat landing does not move what follows it", async ({ page }) => {
    test.skip(viewportWidth(page) === 390, "covered by 375; five widths are enough");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#tree [data-stage]")).toHaveAttribute("data-stage-settled", "");
    await expect(questionField(page)).toHaveCount(0);

    const closingOffset = () =>
      page.evaluate(() => {
        const closing = document.querySelector("#closing");
        if (!closing) throw new Error("the page has no closing section");
        return closing.getBoundingClientRect().top + window.scrollY;
      });
    const before = await closingOffset();

    await askBlock(page).scrollIntoViewIfNeeded();
    await expect(questionField(page)).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(300);
    const after = await closingOffset();

    expect(Math.abs(after - before), `#closing moved ${after - before}px when the chat landed`).toBeLessThanOrEqual(2);
  });

  // The other half of that room: not so tall that the landed chat sits over a
  // blank gap. The matrix has no width between 390 and 768, where the idle
  // chat shrinks from ~1006px to ~750px, so this walks that range itself.
  test("the chat's room is never much taller than the chat, between the phone and tablet widths", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "walks its own widths; run once");
    await openChat(page);

    const gaps: string[] = [];
    for (let width = 400; width < 640; width += 8) {
      await page.setViewportSize({ width, height: 900 });
      const { natural, reserved } = await page.evaluate(() => {
        const chat = document.querySelector<HTMLElement>("[data-ask-chat]");
        if (!chat) throw new Error("the chat has no root");
        chat.style.minHeight = "0px";
        const height = chat.getBoundingClientRect().height;
        chat.style.minHeight = "";
        return { natural: height, reserved: parseFloat(getComputedStyle(chat).minHeight) };
      });
      // Never short (the #closing test above needs that), and never more
      // than 200px of blank under the chat (330px before the 400px step).
      if (reserved < natural - 1 || reserved - natural > 200) {
        gaps.push(`${width}px: room ${reserved}px for a ${Math.round(natural)}px chat`);
      }
    }
    expect(gaps).toEqual([]);
  });

  // Deliberately not viewport-gated: this is the one property that is
  // *supposed* to vary with width. Contact stacks below `lg` and the chat
  // stacks with it; it must stay usable, with 44px targets, and must not
  // push the page wider than the screen.
  test("works at narrow viewports too, with 44px targets and no horizontal overflow", async ({ page }) => {
    await openChat(page);

    const suggestion = askBlock(page).locator('[aria-label="Try asking"] button').first();
    const box = await suggestion.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    const field = questionField(page);
    await field.fill("scraper");
    await field.press("Enter");
    await expect(page.getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
