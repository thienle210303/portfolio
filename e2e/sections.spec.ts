import { test, expect, type Locator, type Page } from "@playwright/test";
import { careerEntries } from "../src/content/portfolio";
import { buildDrawnTree } from "../src/lib/knowledge-tree";

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

  test("holds no chat: the Ask field lives in #contact", async ({ page }) => {
    const field = { name: "Your question" };
    await expect(page.getByRole("tab", { name: "Ask Thien" })).toHaveCount(0);
    await expect(page.locator("#about").getByRole("textbox", field)).toHaveCount(0);
    // AskLoader mounts the chat only as #ask nears the viewport.
    await page.locator("#ask").scrollIntoViewIfNeeded();
    await expect(page.locator("#contact").getByRole("textbox", field)).toHaveCount(1, { timeout: 15_000 });
  });
});

// Selected Work was deleted in round 18, and the case studies that moved to the Record's
// rows went with them in round 23 (the Diary has no case study).

test.describe("screen recordings", () => {
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

    expect(await page.locator("#record video").count(), "no <video> before a press").toBe(0);
    expect(media, "nothing under /media/ may load until a visitor asks").toEqual([]);
  });

  // Food Route and MentorHub each have a recording on their page of the Diary.
  // Any recording added later is picked up from content.
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

      // Turn to the page from the contents, as a reader would.
      await page.locator(`#diary-contents a[href="#journey-entry-${entry.id}"]`).click();
      const button = page.getByRole("button", { name: `Play the screen recording of ${entry.role}` });
      // Not `li:has(button)`: the press replaces the button with the video.
      const line = page.locator(`#journey-entry-${entry.id}`);
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
 * The Journey (`#tree`) and the Diary's pages. Round 21 opens the Journey with
 * the oak: the hanging tags and the drawing (>=1024px only). The Record's
 * one-open rows (phase 5) became the Diary's pages in round 23: one page, or a
 * block on a shared page, per career entry, at every width, owning the
 * `journey-entry-<id>` and `work-<projectId>` ids, so every deep link (a tag, a
 * branch label) lands on a page of the book.
 */
test.describe("career tree", () => {
  /** The entry the tag tests use. */
  const PANEL_ENTRY = "doordash";
  /** The entries the Journey once drew, oldest first: each has a page. */
  const DRAWN = buildDrawnTree();
  const panelEntry = careerEntries.find((entry) => entry.id === PANEL_ENTRY);
  if (!panelEntry) throw new Error(`"${PANEL_ENTRY}" is no longer a career entry`);

  const row = (page: Page, entryId: string) => page.locator(`#record #journey-entry-${entryId}`);

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
    // A margin rail (`Section`'s `.rail`) is sticky at lg wherever a section
    // has one (the Journey has none since round 21); everything else inside
    // #tree must scroll.
    const sticky = await page.locator("#tree").evaluate((tree) =>
      Array.from(tree.querySelectorAll("*"))
        .filter((element) => !element.closest(".rail"))
        .filter((element) => getComputedStyle(element).position === "sticky")
        .map((element) => element.outerHTML.slice(0, 80)),
    );
    expect(sticky, "something inside #tree is position: sticky").toEqual([]);
  });

  test("one tree, and the Diary's pages at every width", async ({ page }) => {
    // Round 22 retired the drawn tree and its box: the oak is the only tree.
    await expect(page.locator("#tree [data-tree-box], #tree [data-origin-host]")).toHaveCount(0);
    await expect(page.locator("#record [data-tree-branch]")).toHaveCount(careerEntries.length);
    await expect(row(page, DRAWN[0].id)).toBeAttached();
  });

  test("a hanging tag lands on its page, and again after the book has turned away", async ({ page }) => {
    const card = page.locator(`#tree a[href="#journey-entry-${PANEL_ENTRY}"]`).first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    expectSettledAtScrollMargin(
      await restingTop(row(page, PANEL_ENTRY)),
      "the hanging tag must land its page at the 80px scroll margin",
    );

    // Turn the book to another page, go back up to the tag, and follow it again:
    // the URL already holds the fragment, so no hashchange fires, and the book
    // must still come back to the page.
    await page.getByRole("button", { name: "Next page" }).click();
    await page.waitForTimeout(800);
    await card.scrollIntoViewIfNeeded();
    await card.click();
    expectSettledAtScrollMargin(
      await restingTop(row(page, PANEL_ENTRY)),
      "following the same card again must land its page at the 80px scroll margin",
    );
    const inBook = await page.evaluate((id) => {
      const box = document.querySelector("#record .diary-track")!.getBoundingClientRect();
      const r = document.getElementById(`journey-entry-${id}`)!.getBoundingClientRect();
      return r.left >= box.left - 2 && r.right <= box.right + 2;
    }, PANEL_ENTRY);
    expect(inBook, "the book is on another page").toBe(true);
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
    const top = await restingTop(page.locator("#ask"));
    // Since round 21 the chat is a short strip near the page's end, so the
    // browser may run out of page before #ask reaches its margin; then it
    // must have scrolled all the way and show the whole strip.
    const atEnd = await page.evaluate(
      () => Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) <= 2,
    );
    if (atEnd && top > 80) {
      const box = await page.locator("#ask").boundingBox();
      expect(box!.y + box!.height, "#ask is fully on screen").toBeLessThanOrEqual(page.viewportSize()!.height);
    } else {
      expectSettledAtScrollMargin(top, "a cold load must settle #ask at its 80px scroll margin");
    }
  });

  test("a reload after scrolling away from the fragment does not jump back to it", async ({ page }) => {
    await page.goto("about:blank");
    await page.goto("/#contact");
    await page.waitForLoadState("networkidle");

    // Read somewhere else: the Journey, far above Contact.
    await page.locator("#tree").evaluate((el) => el.scrollIntoView({ block: "start" }));
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
