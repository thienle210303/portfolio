import { test, expect, type Page } from "@playwright/test";
import { navItems } from "../src/content/portfolio";

/**
 * "Ask this site" — a chat thread over the portfolio's own content. Rounds 16
 * and 17 kept it behind a fourth tab in the hero; round 18 moved it to
 * Contact, under "Ask me" (`#ask`). The chat is still a lazily
 * imported chunk: it does not exist on the page until `#ask` nears the
 * viewport (`AskLoader.tsx`). Every chat e2e test belongs here, not in
 * `sections.spec.ts`.
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
  return page.getByRole("textbox", { name: "Your question" });
}

test.describe("ask this site", () => {
  test("answers a suggested question with sourced, linked evidence", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openChat(page);

    await page.getByRole("button", { name: "What do you do at DoorDash?" }).click();

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
    await expect(turn.getByText(/I haven’t written anything here that answers that/)).toBeVisible();
    await expect(turn.getByRole("list", { name: "Sourced answers" })).toHaveCount(0);
  });

  test("works with the network offline — there is no model to fetch", async ({ page, context }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openChat(page);

    // Everything the feature needs already shipped with the page. If a model
    // or an API ever creeps in behind this box while live mode is off, this
    // test is what catches it.
    await context.setOffline(true);
    await page.getByRole("button", { name: "What have you measured?" }).click();
    await expect(lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();
    await context.setOffline(false);
  });

  test("every suggested question is a live control, not a dead one", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openChat(page);

    const suggestions = askBlock(page).locator('[aria-label="Try asking"] button');
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);

    // Round 25: a question already asked leaves the suggestions, so the next
    // one to try is always the first that is left.
    for (let index = 0; index < count; index++) {
      const question = (await suggestions.first().textContent()) ?? "";
      await suggestions.first().click();
      const turn = lastTurn(page);
      await expect(turn).toContainText(question);
      // Either real results or the honest "nothing here" line — never blank.
      const answered = await turn.getByRole("list", { name: "Sourced answers" }).getByRole("listitem").count();
      const declined = await turn.getByText(/I haven’t written anything here that answers that/).count();
      expect(answered + declined, `suggestion ${index} produced no response`).toBeGreaterThan(0);
      expect(answered, `suggestion ${index} is a dead control`).toBeGreaterThan(0);
      await expect(suggestions).toHaveCount(count - index - 1);
    }
  });

  test("a question already asked leaves the suggestions, typed or tapped, and Clear brings them back", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openChat(page);

    const tryAsking = askBlock(page).getByRole("list", { name: "Try asking" });
    const all = await tryAsking.getByRole("button").allTextContents();
    expect(all.length).toBeGreaterThanOrEqual(3);

    await page.getByRole("button", { name: all[0] }).click();
    await expect(tryAsking.getByRole("button")).toHaveText(all.slice(1));
    // The words are still on the page once: in the thread, as the question.
    await expect(askBlock(page).getByText(all[0], { exact: true })).toHaveCount(1);

    // Typing a suggestion's exact words is asking it too.
    await questionField(page).fill(all[2]);
    await page.keyboard.press("Enter");
    await expect(tryAsking.getByRole("button")).toHaveText([all[1], ...all.slice(3)]);
    // A question of my own takes nothing away.
    await questionField(page).fill("scraper");
    await page.keyboard.press("Enter");
    await expect(tryAsking.getByRole("button")).toHaveText([all[1], ...all.slice(3)]);

    // With every one asked, "or try" goes with them.
    for (const question of [all[1], ...all.slice(3)]) await page.getByRole("button", { name: question }).click();
    await expect(tryAsking).toHaveCount(0);
    await expect(askBlock(page).getByText("or try")).toHaveCount(0);

    await page.getByRole("button", { name: "Clear conversation" }).click();
    await expect(tryAsking.getByRole("button")).toHaveText(all);
  });

  test("offers the same answer as a code artifact, one view at a time", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openChat(page);

    await page.getByRole("button", { name: "What have you measured?" }).click();
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
    await expect(artifact).toContainText('question: "What have you measured?"');

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

    await page.getByRole("button", { name: "What have you measured?" }).click();
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

    await page.getByRole("button", { name: "What do you do at DoorDash?" }).click();
    await expect(lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();
    // The window unfolds over 200ms: measure the page once it is open.
    await expect
      .poll(() => conversationLog(page).evaluate((el) => Math.round(el.getBoundingClientRect().height)))
      .toBe(23 * 16);

    const pageHeightAfterOneTurn = await page.evaluate(() => document.documentElement.scrollHeight);

    await questionField(page).fill("what is the capital of France");
    await page.keyboard.press("Enter");
    await expect(lastTurn(page).getByText(/I haven’t written anything here that answers that/)).toBeVisible();

    await page.getByRole("button", { name: "What have you measured?" }).click();
    await expect(lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();

    const pageHeightAfterThreeTurns = await page.evaluate(() => document.documentElement.scrollHeight);

    // Round 25 (it reverses round 22's "one size from the start"): idle, the
    // notepad is as tall as its promise, and the first question opens it to
    // its one fixed window, so the page grows once, by less than that window
    // (23rem here). After that it never grows again, however many are asked.
    const windowHeight = await conversationLog(page).evaluate((el) => el.getBoundingClientRect().height);
    expect(windowHeight).toBeCloseTo(23 * 16, 0);
    expect(pageHeightAfterOneTurn).toBeGreaterThan(pageHeightBeforeAnyTurn);
    expect(pageHeightAfterOneTurn - pageHeightBeforeAnyTurn).toBeLessThan(windowHeight);
    expect(pageHeightAfterThreeTurns).toBeLessThanOrEqual(pageHeightAfterOneTurn + 4);

    // All three turns are still there, in order, inside the scrolling log —
    // direct children only, same reasoning as `lastTurn`: a bare listitem
    // role query would also count each turn's nested sourced answers.
    const log = conversationLog(page);
    await expect(log).toHaveAttribute("tabindex", "0");
    const turns = conversation(page).locator(":scope > li");
    await expect(turns).toHaveCount(3);
    await expect(turns.nth(0)).toContainText("What do you do at DoorDash?");
    await expect(turns.nth(0)).toContainText(/DoorDash/i);
    await expect(turns.nth(1)).toContainText("what is the capital of France");
    await expect(turns.nth(2)).toContainText("What have you measured?");
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
    // Since round 21 the chat is a short strip near the page's end, so a
    // reader scrolled onto it may have nothing below to lurch into. Put its
    // bottom edge at the viewport's bottom, which leaves the footer below.
    await page.evaluate(() => {
      const box = document.querySelector("#ask")!.getBoundingClientRect();
      window.scrollTo(0, window.scrollY + box.bottom - window.innerHeight);
    });
    const windowScrollBefore = await page.evaluate(() => window.scrollY);
    const roomBelow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight - window.scrollY,
    );
    expect(roomBelow, "the page has no room to lurch, so this test could not fail").toBeGreaterThan(LURCH);

    for (const question of [
      "What do you do at DoorDash?",
      "What have you measured?",
      "Are you from Việt Nam?",
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

    await page.getByRole("button", { name: "What do you do at DoorDash?" }).click();
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

    await page.getByRole("button", { name: "What have you measured?" }).click();
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
    await page.getByRole("button", { name: "What have you measured?" }).click();
    await expect(questionField(page)).toBeFocused();
  });

  test("the conversation survives a client-side trip to the résumé route and back", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    // The one remaining case that unmounts the chat (see `threadCache` in
    // AskThisSite.tsx). Contact's "Résumé" chip opens a dialog now (round 23),
    // so the only client-side trip is the nav's: `/resume` links back with
    // `next/link`. Nothing on `/` links there, so go by history: open the
    // route in the same tab, then follow its "Back to the site" link.
    await openChat(page);
    const input = questionField(page);
    await input.fill("What did Thien build at DoorDash?");
    await input.press("Enter");
    await expect(conversation(page).getByText("What did Thien build at DoorDash?")).toBeVisible();

    await page.evaluate(() => (window as unknown as { next: { router: { push: (u: string) => void } } }).next.router.push("/resume"));
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
/* The answers, on paper (round 24)                                            */
/* -------------------------------------------------------------------------- */

test.describe("the answers, on paper", () => {
  test("a question arrives as a numbered slip and the answer as taped clippings, figures in accent mono", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openChat(page);

    await page.getByRole("button", { name: "What have you measured?" }).click();
    const turn = lastTurn(page);
    await expect(turn.locator(".ask-slip")).toContainText("What have you measured?");
    await expect(turn.locator(".ask-slip-stub")).toHaveText(/No\.\s*01/);

    const clipping = turn.locator(".ask-clip", { hasText: "17 hours → 3 minutes" });
    await expect(clipping.locator(".ask-tape")).toHaveCount(1);
    const figure = clipping.locator(".ask-figure");
    await expect(figure).toHaveText("17 hours → 3 minutes");
    // `--accent`, in Courier Prime: measured on the page, not assumed.
    const { color, accent, family } = await figure.evaluate((el) => {
      const probe = document.createElement("span");
      probe.style.color = "var(--accent)";
      el.parentElement!.appendChild(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      return { color: getComputedStyle(el).color, accent, family: getComputedStyle(el).fontFamily };
    });
    expect(color).toBe(accent);
    expect(family.toLowerCase()).toContain("courier");
  });

  test("the tab on a clipping's edge is a 44px target and leads to its section", async ({ page }) => {
    await openChat(page);

    await page.getByRole("button", { name: "What do you do at DoorDash?" }).dispatchEvent("click");
    const tab = lastTurn(page).getByRole("link", { name: /More on this in/ }).first();
    await expect(tab).toBeVisible();
    const box = await tab.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    // The arrow is drawn, not read: the name is the sentence alone.
    await expect(tab).toHaveAccessibleName(/^More on this in \w+$/);
  });

  test("paper settles in where motion is welcome, and is simply there under reduced motion", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    const paperAnimations = () =>
      page.evaluate(
        () =>
          document
            .querySelector("#ask")!
            .getAnimations({ subtree: true })
            .filter((animation) => animation instanceof CSSAnimation && animation.animationName.startsWith("ask-"))
            .length,
      );

    await openChat(page);
    await page.getByRole("button", { name: "What have you measured?" }).click();
    expect(await paperAnimations(), "no paper landed").toBeGreaterThan(0);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await openChat(page);
    await page.getByRole("button", { name: "What have you measured?" }).click();
    await expect(lastTurn(page).locator(".ask-clip").first()).toBeVisible();
    expect(await paperAnimations(), "paper moved under reduced motion").toBe(0);
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
    await expect(askBlock(page).getByRole("heading", { level: 3, name: "Ask me" })).toBeVisible();
    // The companion perches on the first <aside> in #contact (the business
    // card); the chat must not become it.
    await expect(page.locator("#contact aside")).toHaveCount(1);
    await expect(page.locator("#contact aside #ask")).toHaveCount(0);
  });

  test("a link to /#ask lands on the chat, loaded", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/#ask");
    await expect(questionField(page)).toBeVisible({ timeout: 15_000 });
    await expect(askBlock(page).getByRole("heading", { name: "Ask me" })).toBeInViewport();
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
        (await response.text()).includes("Your question"),
    );
    await askBlock(page).scrollIntoViewIfNeeded();
    await chunkResponse;

    await expect(questionField(page)).toBeVisible({ timeout: 15_000 });
  });

  // The chat's place is held before it loads (round 25: by the idle notepad
  // itself, see the walk below; through round 24 by `--ask-room`), so nothing
  // after it moves when it lands.
  test("the chat landing does not move what follows it", async ({ page }) => {
    test.skip(viewportWidth(page) === 390, "covered by 375; five widths are enough");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#record [data-diary]")).toHaveAttribute("data-live", "");
    await expect(questionField(page)).toHaveCount(0);

    const footerOffset = () =>
      page.evaluate(() => {
        const footer = document.querySelector("footer");
        if (!footer) throw new Error("the page has no footer");
        return footer.getBoundingClientRect().top + window.scrollY;
      });
    const before = await footerOffset();

    await askBlock(page).scrollIntoViewIfNeeded();
    await expect(questionField(page)).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(300);
    const after = await footerOffset();

    expect(Math.abs(after - before), `the footer moved ${after - before}px when the chat landed`).toBeLessThanOrEqual(2);
  });

  // Why it does not move (round 25): the place is held by the idle notepad
  // itself, drawn by `AskLoader` from the pieces the chat uses, not by a
  // measured min-height. So the placeholder and the idle chat must be the
  // same height at EVERY width, including the ones between this matrix's
  // projects where a line of the promise or a suggestion re-wraps. This walks
  // them: the placeholder first (it is in the server's HTML, laid out even
  // far below the fold), then the chat.
  test("the placeholder is exactly as tall as the idle chat, from 320 to 1920", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "walks its own widths; run once");
    test.setTimeout(120_000);
    const widths: number[] = [];
    for (let width = 320; width <= 1920; width += width < 700 ? 12 : 60) widths.push(width);

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(questionField(page)).toHaveCount(0);
    const heightOf = (selector: string) =>
      page.evaluate((sel) => {
        const el = document.querySelector<HTMLElement>(sel);
        if (!el) throw new Error(`${sel} is not on the page`);
        // No min-height holds either up: the height is the content's.
        return { height: el.getBoundingClientRect().height, minHeight: getComputedStyle(el).minHeight };
      }, selector);

    const placeholder: number[] = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      // Still waiting: the chat must not have been asked for by the resize.
      const slot = await heightOf("[data-ask-slot]");
      expect(["0px", "auto"]).toContain(slot.minHeight);
      placeholder.push(slot.height);
    }

    await page.setViewportSize({ width: DESKTOP_WIDTH, height: 900 });
    await askBlock(page).scrollIntoViewIfNeeded();
    await expect(questionField(page)).toBeVisible({ timeout: 15_000 });
    const differences: string[] = [];
    for (const [index, width] of widths.entries()) {
      await page.setViewportSize({ width, height: 900 });
      const chat = await heightOf("[data-ask-chat]");
      expect(["0px", "auto"]).toContain(chat.minHeight);
      if (Math.abs(chat.height - placeholder[index]) > 0.5) {
        differences.push(`${width}px: placeholder ${placeholder[index]}px, chat ${chat.height}px`);
      }
    }
    expect(differences).toEqual([]);
  });

  test("the placeholder is paper, not controls, and is not shown with JavaScript off", async ({ page, browser }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const slot = page.locator("#ask [data-ask-slot]");
    await expect(slot).toHaveCount(1);
    // The idle notepad is drawn, with the promise and the suggestions...
    await expect(slot.locator("[data-ask-shell]").first()).toBeVisible();
    await expect(slot).toContainText("No question asked yet.");
    await expect(slot).toContainText("What do you do at DoorDash?");
    // ...and none of it can be found, focused or pressed.
    await expect(slot.locator("a, button, input, [tabindex]")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Your question" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "What do you do at DoorDash?" })).toHaveCount(0);
    for (const shell of await slot.locator("[data-ask-shell]").all()) {
      await expect(shell).toHaveAttribute("aria-hidden", "true");
      await expect(shell).toHaveAttribute("inert", "");
    }

    // With JavaScript off the chat never comes: one line, and no blank paper.
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: DESKTOP_WIDTH, height: 900 } });
    const plain = await context.newPage();
    await plain.goto("/");
    const ask = plain.locator("#ask");
    await expect(ask.getByRole("heading", { name: "Ask me" })).toBeVisible();
    // By CSS, not by text: Playwright's text engine skips <noscript>.
    const line = ask.locator("noscript p");
    await expect(line).toBeVisible();
    await expect(line).toHaveText("The chat needs JavaScript.");
    for (const shell of await ask.locator("[data-ask-shell]").all()) await expect(shell).toBeHidden();
    expect((await ask.boundingBox())!.height).toBeLessThan(140);
    await context.close();
  });

  // Round 25: short until there is something in it. Deliberately not
  // viewport-gated: the window's height is the thing that varies with width.
  test("the notepad is short while idle, opens to its one window on the first question, and stays that height", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openChat(page);
    const log = conversationLog(page);
    const measure = () =>
      log.evaluate((el) => ({
        height: el.getBoundingClientRect().height,
        scrolls: el.scrollHeight > el.clientHeight + 1,
        overflowY: getComputedStyle(el).overflowY,
      }));

    const { width, height } = page.viewportSize()!;
    const rem = 16;
    // 23rem from 1024; below it most of the screen, 26rem at most.
    const windowHeight = width >= 1024 ? 23 * rem : Math.min(26 * rem, 0.6 * height);

    const idle = await measure();
    // As tall as the blank slip and the promise: nothing to scroll, nothing
    // blank, and shorter than the window it will open to.
    expect(idle.scrolls).toBe(false);
    expect(idle.height).toBeLessThan(windowHeight);
    const written = await log.evaluate((el) => {
      const last = el.querySelector(".ask-lined")!.getBoundingClientRect();
      return el.getBoundingClientRect().bottom - last.bottom;
    });
    expect(written, "blank paper under the promise").toBeLessThanOrEqual(2);

    await page.getByRole("button", { name: "What do you do at DoorDash?" }).dispatchEvent("click");
    await expect(lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();
    const open = await measure();
    expect(open.height).toBeCloseTo(windowHeight, 0);
    expect(open.overflowY).toBe("auto");

    await page.getByRole("button", { name: "What have you measured?" }).dispatchEvent("click");
    await expect(conversation(page).locator(":scope > li")).toHaveCount(2);
    expect((await measure()).height).toBeCloseTo(windowHeight, 0);

    // Cleared, it is the idle notepad again.
    await page.getByRole("button", { name: "Clear conversation" }).dispatchEvent("click");
    await expect(conversation(page)).toHaveCount(0);
    expect((await measure()).height).toBeCloseTo(idle.height, 0);
  });

  test("the first answer's clipping shows whole in the window, with its tab", async ({ page }) => {
    // Round 24's 17rem window showed about 130px of an answer on a phone and
    // cut "More on this in …" through its text.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openChat(page);
    await page.getByRole("button", { name: "What do you do at DoorDash?" }).dispatchEvent("click");
    const turn = lastTurn(page);
    const clipping = turn.locator(".ask-clip").first();
    await expect(clipping).toBeVisible();
    const shown = await conversationLog(page).evaluate((log) => {
      const view = log.getBoundingClientRect();
      const clip = log.querySelector(".ask-clip")!;
      const tab = clip.querySelector(".ask-clip-tab-paper");
      const within = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.top >= view.top - 1 && r.bottom <= view.bottom + 1;
      };
      const first = clip.getBoundingClientRect();
      return { clipping: within(clip), tab: tab ? within(tab) : null, answerShown: view.bottom - first.top };
    });
    // More of the answer than round 24's 130px, at every width...
    expect(shown.answerShown).toBeGreaterThan(150);
    // ...and on any screen at least an iPhone SE 2's height (667px), the whole
    // first clipping and its tab. A 568px screen's window is 60% of it, 341px,
    // which holds the slip, the tabs and most of the clipping, not all.
    if (page.viewportSize()!.height >= 667) {
      expect(shown.clipping, "the first clipping is cut by the window").toBe(true);
      expect(shown.tab, "the clipping's tab is cut by the window").not.toBe(false);
    }
  });

  test("the window unfolds from the idle height where motion is welcome", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await openChat(page);
    const log = conversationLog(page);
    const idle = await log.evaluate((el) => el.getBoundingClientRect().height);
    await page.getByRole("button", { name: "What have you measured?" }).click();
    const unfold = await log.evaluate((el) => {
      const animation = el.getAnimations().find((a) => a instanceof CSSAnimation && a.animationName === "ask-unfold");
      return {
        from: (el as HTMLElement).style.getPropertyValue("--ask-from"),
        duration: animation ? (animation.effect!.getComputedTiming().duration as number) : null,
      };
    });
    expect(parseFloat(unfold.from)).toBeCloseTo(idle, 0);
    expect(unfold.duration).toBe(200);
    await expect.poll(() => log.evaluate((el) => el.getBoundingClientRect().height)).toBeCloseTo(23 * 16, 0);
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
