import { test, expect, type Page } from "@playwright/test";

/**
 * "Ask this site" — a chat thread over the portfolio's own content.
 *
 * The property worth testing is not answer quality — that is pinned by unit
 * tests against the index in tests/lib/answers.test.ts, and the live-mode
 * route's own contract is pinned in tests/api/ask.test.ts. What matters here
 * is the promise the surrounding section makes: by default this box answers
 * questions *without* running a model, so it must work with no network,
 * invent nothing, say plainly when the site has no answer, and behave like an
 * actual conversation — every turn stays on screen, and the visitor never has
 * to reach for the mouse to ask a follow-up. This suite runs with no
 * ASK_LLM_* env vars set, so `liveModeConfigured` is false throughout —
 * exactly the state the site actually deploys in today.
 */

const DESKTOP_WIDTH = 1440;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

/** The conversation list — one `<li>` per question asked so far. */
function conversation(page: Page) {
  return page.locator("#lab").getByRole("list", { name: "Conversation" });
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

  test("is a real thread: every question asked stays on screen, in order", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "behaviour is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "What does he do at DoorDash?" }).click();
    await expect(lastTurn(page).getByRole("list", { name: "Sourced answers" }).getByRole("listitem").first()).toBeVisible();

    await questionField(page).fill("what is the capital of France");
    await page.keyboard.press("Enter");
    await expect(lastTurn(page).getByText(/Nothing on this page answers that/)).toBeVisible();

    // Both turns are still in the DOM, in the order they were asked — a
    // question with an off-topic follow-up must not clear or replace the
    // first answer.
    // Direct children only — same reasoning as `lastTurn`: a bare listitem
    // role query would also count each turn's nested sourced answers.
    const turns = conversation(page).locator(":scope > li");
    await expect(turns).toHaveCount(2);
    await expect(turns.first()).toContainText("What does he do at DoorDash?");
    await expect(turns.first()).toContainText(/DoorDash/i);
    await expect(turns.last()).toContainText("what is the capital of France");
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
