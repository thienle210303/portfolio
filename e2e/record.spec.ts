import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { careerEntries, certifications, record } from "../src/content/portfolio";
import { diaryPages, kindCounts, recordYears } from "../src/lib/record";

// The Diary: a book whose pages turn (round 24; round 23 swiped them). With
// JavaScript and motion welcome the pages are leaves (`data-mode="leaf"`); with
// JavaScript off, and under reduced motion, they are the scroll-snap track they
// were. Each test pins its own viewport and runs once (in the chromium-1440
// project), as journey.spec does.

const WIDE = { width: 1440, height: 1000 };
const PHONE = { width: 390, height: 844 };
const ROW_TOP = 80;
const STAMPED = certifications.filter((c) => "stamp" in c);
const PAGES = diaryPages();
const COUNTS = kindCounts();

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-1440", "pins its own viewports; run once");
});

async function open(page: Page, theme: "day" | "night" = "day", hash = "") {
  await page.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
  await page.goto(`/${hash}`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

const track = (page: Page) => page.locator("#record .diary-track");
const where = (page: Page) => page.locator("#record [data-diary-page]");
const slot = (page: Page, key: string) => page.locator(`#record .diary-slot[data-page="${key}"]`);
const frame = (page: Page) => page.locator("#record [data-diary]");
/** The book's block: the pages' window in both modes. (With the leaves the
 *  track itself is padded with the room a turning leaf needs.) */
const book = (page: Page) => page.locator("#record .diary-book");

/** The book is live and its leaves are at rest: no turn in the air. */
async function still(page: Page) {
  await expect(frame(page)).toHaveAttribute("data-live", "");
  await expect(frame(page)).not.toHaveAttribute("data-flight");
}

/** The pages on show (not hidden until found), by key. */
function onShow(page: Page): Promise<string[]> {
  return track(page)
    .locator(":scope > .diary-slot:not([data-hidden]):not([hidden])")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-page") ?? "blank"));
}

/** The track's scrollLeft once it has stopped moving (a snap or a smooth turn). */
async function settledLeft(page: Page): Promise<number> {
  // With the leaves, a turn or a riffle in the air has not settled either.
  await expect(frame(page)).not.toHaveAttribute("data-flight");
  const read = () => track(page).evaluate((el) => Math.round(el.scrollLeft));
  let previous = await read();
  let stable = 0;
  for (let i = 0; i < 60 && stable < 3; i += 1) {
    await page.waitForTimeout(80);
    const next = await read();
    stable = next === previous ? stable + 1 : 0;
    previous = next;
  }
  return previous;
}

/** Is the whole of `selector` inside the book's window, sideways? */
async function inWindow(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)!;
    const box = document.querySelector("#record .diary-book")!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return r.left >= box.left - 2 && r.right <= box.right + 2;
  }, selector);
}

async function restingTop(page: Page, selector: string): Promise<number> {
  const read = () => page.locator(selector).evaluate((el) => Math.round(el.getBoundingClientRect().top));
  let previous = await read();
  let stable = 0;
  for (let i = 0; i < 60 && stable < 3; i += 1) {
    await page.waitForTimeout(100);
    const next = await read();
    stable = next === previous ? stable + 1 : 0;
    previous = next;
  }
  return previous;
}

async function visibleNumbers(page: Page): Promise<number> {
  return track(page).locator(":scope > .diary-slot:not([data-hidden]):not(.diary-slot-blank)").count();
}

test.describe("the Diary", () => {
  test("sits between the Journey and Contact, and the nav says Diary", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const order = await page.evaluate(() => [...document.querySelectorAll("main > section")].map((s) => s.id));
    expect(order).toEqual(["about", "tree", "record", "contact"]);
    await expect(page.locator('header nav a[href="/#record"]').first()).toHaveText("Diary");
    await expect(page.locator("#record-heading")).toContainText(record.name);
    await expect(page.locator("#record-heading")).toContainText(record.pressed.heading);
    await expect(page.locator("#diary")).toHaveCount(1);
  });

  test("is a focusable, named region of pages, each an article with a heading", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const book = page.getByRole("region", { name: record.bookLabel });
    await expect(book).toHaveAttribute("tabindex", "0");
    await expect(book.locator("article")).toHaveCount(PAGES.length);
    for (const article of await book.locator("article").all()) {
      const name = await article.getAttribute("aria-labelledby");
      await expect(article.locator(`#${name}`)).toHaveCount(1);
    }
    await book.focus();
    await expect(book).toBeFocused();
    const outline = await book.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
  });

  test("a spread at 1440, a page at 390: the counter says which, in polite live text", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await expect(where(page)).toHaveText(`pp. 1–2 of ${PAGES.length}`);
    await expect(where(page)).toHaveAttribute("aria-live", "polite");
    expect(await where(page).evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/courier|mono/i);
    // Two pages fill the window side by side.
    const [a, b] = await Promise.all(["summary", "contents"].map((k) => slot(page, k).boundingBox()));
    expect(a!.width).toBeCloseTo(b!.width, 0);
    expect(Math.abs(a!.y - b!.y)).toBeLessThanOrEqual(1);
    expect(b!.x).toBeGreaterThan(a!.x + a!.width - 2);

    await page.setViewportSize(PHONE);
    await open(page);
    await expect(where(page)).toHaveText(`p. 1 of ${PAGES.length}`);
    const one = await slot(page, "summary").boundingBox();
    const win = await book(page).boundingBox();
    expect(one!.width).toBeCloseTo(win!.width, 0);
    expect(await onShow(page)).toEqual(["summary"]);
  });

  test("under reduced motion the book is the track: native scroll is the swipe, it snaps, and the counter follows", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      await open(page);
      await expect(frame(page)).toHaveAttribute("data-mode", "track");
      const view = await track(page).evaluate((el) => el.clientWidth);
      await track(page).evaluate((el) => el.scrollIntoView({ block: "start" }));
      const box = (await track(page).boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, Math.max(box.y, 0) + 300);
      // A trackpad's short swipe falls back to the page it left; a long one turns it.
      await page.mouse.wheel(90, 0);
      await page.waitForTimeout(600);
      expect(await settledLeft(page), `${size.width}: a short swipe goes back`).toBe(0);
      await page.mouse.wheel(view * 0.7, 0);
      await expect.poll(() => settledLeft(page), { message: `${size.width}: a long swipe turns a page` }).toBe(view);
      await expect(where(page)).toHaveText(size.width >= 1280 ? `pp. 3–4 of ${PAGES.length}` : `p. 2 of ${PAGES.length}`);
      // Every page is there to scroll to: none hidden until found.
      expect(await track(page).locator(":scope > .diary-slot[hidden]").count()).toBe(0);
      // A tab re-binds the book from its first page, at once.
      await page.getByRole("group", { name: record.tabsLabel }).getByRole("button", { name: /^Work/ }).click();
      expect(await settledLeft(page)).toBe(0);
      await expect(where(page)).toHaveText(new RegExp(`^pp?\\. 1`));
    }
  });

  test("binding the book shifts nothing: the page's load layout shift stays under 0.01", async ({ browser }) => {
    // Round 24's first leaves let the track stop being a scroll container at
    // hydration, and Chrome scored the whole book as a layout shift of 1.0,
    // far off screen. The track stays one (`overflow: hidden`), padded with
    // the room a turning leaf needs.
    for (const size of [WIDE, PHONE]) {
      for (const path of ["/", "/#journey-entry-schaeffler"]) {
        const context = await browser.newContext({ viewport: size, reducedMotion: "no-preference" });
        const page = await context.newPage();
        await page.addInitScript(() => {
          const w = window as unknown as { __shift: number };
          w.__shift = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
              if (!entry.hadRecentInput) w.__shift += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
        });
        await page.goto(path);
        await expect(frame(page)).toHaveAttribute("data-mode", "leaf");
        await page.waitForTimeout(3000);
        const shift = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
        expect(shift, `${size.width} ${path}: layout shift on load`).toBeLessThan(0.01);
        // The leaves' track is still a scroll container, held at 0.
        expect(await track(page).evaluate((el) => [getComputedStyle(el).overflow, el.scrollLeft, el.scrollTop])).toEqual(["hidden", 0, 0]);
        await context.close();
      }
    }
  });

  test("a turning leaf never shows past the boards: the window at the book's top, middle or foot, and a riffle", async ({ page }) => {
    // Round 24's first leaves turned about the track's middle, and on pages
    // this tall the perspective threw a leaf's far end 140px (226 on a phone)
    // past the cover, over Contact. The eye now stands where the reader is
    // (`camera` in diary-turn.ts): no edge on screen grows past the lip.
    const LIP = 16;
    /** How far any face, as far as the window shows it, goes past the cover's
     *  top or foot (counted only where that edge is on screen). */
    const past = () =>
      page.evaluate(() => {
        const cover = document.querySelector("#record .diary-cover")!.getBoundingClientRect();
        const track = document.querySelector<HTMLElement>("#record .diary-track")!;
        const vh = window.innerHeight;
        let worst = 0;
        let faces = 0;
        for (const el of track.querySelectorAll("[data-face]")) {
          const r = el.getBoundingClientRect();
          const top = Math.max(r.top, 0);
          const bottom = Math.min(r.bottom, vh);
          if (bottom <= top) continue;
          faces += 1;
          if (cover.top >= 0) worst = Math.max(worst, cover.top - top);
          if (cover.bottom <= vh) worst = Math.max(worst, bottom - cover.bottom);
        }
        return { worst, faces, scrolled: track.scrollLeft + track.scrollTop };
      });
    const watch = async (label: string) => {
      let seen = 0;
      for (let i = 0; i < 36; i += 1) {
        const at = await past();
        if (at.faces > 0) seen += 1;
        expect(at.worst, `${label}: a leaf showed ${Math.round(at.worst)}px past the boards`).toBeLessThanOrEqual(LIP);
        expect(at.scrolled, `${label}: the track scrolled`).toBe(0);
        await page.waitForTimeout(25);
      }
      expect(seen, `${label}: no leaf was sampled in the air`).toBeGreaterThan(3);
      await still(page);
    };
    for (const size of [WIDE, { width: 1024, height: 768 }, PHONE]) {
      await page.setViewportSize(size);
      for (const where of ["top", "middle", "foot"] as const) {
        await open(page);
        await book(page).evaluate((el, w) => {
          const r = el.getBoundingClientRect();
          const vh = window.innerHeight;
          const by = w === "top" ? r.top - vh * 0.25 : w === "foot" ? r.bottom - vh * 0.7 : (r.top + r.bottom) / 2 - vh / 2;
          window.scrollBy({ top: by, behavior: "instant" });
        }, where);
        if (where === "foot") {
          await page.locator("#record .diary-corner-next").evaluate((el) => (el as HTMLButtonElement).click());
        } else {
          await track(page).evaluate((el) => el.focus({ preventScroll: true }));
          await page.keyboard.press("ArrowRight");
        }
        await watch(`${size.width} ${where}`);
      }
      // A riffle from the contents, the window gliding to the page meanwhile.
      await open(page);
      if (size.width < 1280) {
        await page.getByRole("button", { name: "Next page" }).click();
        await still(page);
      }
      const line = page.locator('#diary-contents a[href="#journey-entry-eastside-high"]');
      await line.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await line.evaluate((el) => (el as HTMLAnchorElement).click());
      await watch(`${size.width} riffle`);
      // The room is round the pages, not in them: the book is as tall as a page.
      const pageBox = (await track(page).locator(":scope > .diary-slot:not([hidden])").first().boundingBox())!;
      expect(Math.abs(pageBox.height - (await book(page).boundingBox())!.height)).toBeLessThanOrEqual(1);
    }
  });

  test("with JavaScript the pages turn: the right page lifts over the spine in 3D, its back the next left page", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await expect(frame(page)).toHaveAttribute("data-mode", "leaf");
    expect(await onShow(page)).toEqual(["summary", "contents"]);
    // The others are hidden until found: out of the tab order and the
    // accessibility tree, but there for the browser's find.
    const hidden = await track(page).locator(":scope > .diary-slot[hidden]").evaluateAll((els) => els.map((el) => el.getAttribute("hidden")));
    expect(hidden.length).toBe(PAGES.length - 2);
    expect(new Set(hidden)).toEqual(new Set(["until-found"]));
    // A spread: the two pages side by side, not scrolled.
    expect(await track(page).evaluate((el) => getComputedStyle(el).display)).toBe("grid");

    await track(page).evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.getByRole("button", { name: "Next page" }).click();
    // In the air: the contents (the right page) turns about its left edge,
    // the spine, and the page after it comes with it as its back.
    await expect(frame(page)).toHaveAttribute("data-flight", "");
    const leaf = await page.evaluate(() => {
      const face = (key: string) => document.querySelector<HTMLElement>(`#record .diary-slot[data-page="${key}"]`)!;
      const pose = (el: HTMLElement) => ({
        face: el.hasAttribute("data-face"),
        transform: el.style.transform,
        origin: getComputedStyle(el).transformOrigin.split(" ")[0],
        back: getComputedStyle(el).backfaceVisibility,
        inert: el.inert,
      });
      const shades = [...document.querySelectorAll<HTMLElement>("#record .diary-shade[data-on]")].map((el) => el.dataset.on);
      return { start: pose(face("contents")), arrive: pose(face(document.querySelector("#record .diary-slot[data-page^='entry-']")!.getAttribute("data-page")!)), shades };
    });
    expect(leaf.start.face).toBe(true);
    expect(leaf.start.transform).toMatch(/^rotateY\(-?[\d.]+deg\)$/);
    expect(leaf.start.origin).toBe("0px");
    expect(leaf.start.back).toBe("hidden");
    expect(leaf.arrive.face).toBe(true);
    expect(leaf.arrive.back).toBe("hidden");
    expect(parseFloat(leaf.arrive.origin)).toBeGreaterThan(100);
    // The pages under a turn cannot be pressed mid-air.
    expect(leaf.start.inert).toBe(true);
    // The shadow falls on the page under each side.
    expect(leaf.shades.toSorted()).toEqual(["left", "right"]);

    await still(page);
    await expect(where(page)).toHaveText(`pp. 3–4 of ${PAGES.length}`);
    expect(await onShow(page)).toEqual([PAGES[2].key, PAGES[3].key]);
    // Landed: every pose put back.
    expect(await page.locator("#record [data-face], #record [data-under]").count()).toBe(0);
    expect(await slot(page, "contents").evaluate((el) => [el.style.transform, el.getAttribute("hidden")])).toEqual(["", "until-found"]);
  });

  test("a corner is a handle: a short drag falls back, past halfway it turns", async ({ page }) => {
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      await open(page);
      await track(page).evaluate((el) => el.scrollIntoView({ block: "end" }));
      const next = page.getByRole("button", { name: "Next page" });
      const box = (await next.boundingBox())!;
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const drag = async (distance: number) => {
        await page.mouse.move(x, y);
        await page.mouse.down();
        for (let i = 1; i <= 10; i += 1) {
          await page.mouse.move(x - (distance * i) / 10, y - 4 * i);
          await page.waitForTimeout(30);
        }
        // Held still before letting go, so it is a drag, not a flick.
        await page.waitForTimeout(150);
      };
      const page1 = size === WIDE ? `pp. 1–2 of ${PAGES.length}` : `p. 1 of ${PAGES.length}`;
      const page2 = size === WIDE ? `pp. 3–4 of ${PAGES.length}` : `p. 2 of ${PAGES.length}`;
      const width = (await book(page).boundingBox())!.width / (size === WIDE ? 2 : 1);

      await drag(width * 0.25);
      // The leaf follows the hand.
      await expect(frame(page)).toHaveAttribute("data-flight", "");
      const angle = await slot(page, size === WIDE ? "contents" : "summary").evaluate((el) => parseFloat(el.style.transform.replace(/[^\d.-]/g, "")));
      expect(angle, `${size.width}: the leaf lifted`).toBeLessThan(-20);
      await page.mouse.up();
      await still(page);
      await expect(where(page), `${size.width}: a short drag falls back`).toHaveText(page1);

      await drag(size === WIDE ? width * 1.3 : width * 0.7);
      await page.mouse.up();
      await still(page);
      await expect(where(page), `${size.width}: past halfway it turns`).toHaveText(page2);
    }
  });

  test("a trackpad's sideways swipe turns the leaf: a short one falls back, a long one turns", async ({ page }) => {
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      await open(page);
      const view = await book(page).evaluate((el) => el.clientWidth);
      await book(page).evaluate((el) => el.scrollIntoView({ block: "start" }));
      const box = (await book(page).boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, Math.max(box.y, 0) + 300);
      const before = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(90, 0);
      await page.waitForTimeout(700);
      await still(page);
      await expect(where(page), `${size.width}: a short swipe goes back`).toHaveText(size.width >= 1280 ? `pp. 1–2 of ${PAGES.length}` : `p. 1 of ${PAGES.length}`);
      await page.mouse.wheel(view * 0.7, 0);
      await page.waitForTimeout(400);
      await still(page);
      await expect(where(page), `${size.width}: a long swipe turns a page`).toHaveText(size.width >= 1280 ? `pp. 3–4 of ${PAGES.length}` : `p. 2 of ${PAGES.length}`);
      expect(await page.evaluate(() => window.scrollY), "a sideways swipe does not scroll the page").toBe(before);
    }
  });

  test("a finger swipes the page over; a finger going down the page scrolls it", async ({ browser }) => {
    const context = await browser.newContext({ viewport: PHONE, hasTouch: true });
    const page = await context.newPage();
    await open(page);
    await book(page).evaluate((el) => el.scrollIntoView({ block: "center" }));
    const box = (await book(page).boundingBox())!;
    const cdp = await context.newCDPSession(page);
    const swipe = async (dx: number, dy: number) => {
      const x0 = box.x + box.width * 0.75;
      const y0 = Math.min(Math.max(box.y, 0) + 400, PHONE.height - 200);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
      for (let i = 1; i <= 12; i += 1) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + (dx * i) / 12, y: y0 + (dy * i) / 12 }] });
        await page.waitForTimeout(16);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    await swipe(-box.width * 0.6, 0);
    await still(page);
    await expect(where(page)).toHaveText(`p. 2 of ${PAGES.length}`);
    // Down the page: no turn.
    await swipe(0, -240);
    await page.waitForTimeout(400);
    await still(page);
    await expect(where(page)).toHaveText(`p. 2 of ${PAGES.length}`);
    await context.close();
  });

  test("the dog-eared corners turn the page; the first has no page before it, the last none after", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const prev = page.getByRole("button", { name: "Previous page" });
    const next = page.getByRole("button", { name: "Next page" });
    await expect(prev).toHaveAttribute("aria-disabled", "true");
    expect(await next.boundingBox().then((b) => Math.min(b!.width, b!.height))).toBeGreaterThanOrEqual(44);
    await next.click();
    await still(page);
    await expect(where(page)).toHaveText(`pp. 3–4 of ${PAGES.length}`);
    await expect(prev).not.toHaveAttribute("aria-disabled", "true");
    await prev.click();
    await still(page);
    await expect(where(page)).toHaveText(`pp. 1–2 of ${PAGES.length}`);
    // Pressed again before a leaf lands, it follows; never past the end.
    for (let i = 0; i < PAGES.length / 2 + 2; i += 1) await next.click({ force: true });
    await still(page);
    await expect(next).toHaveAttribute("aria-disabled", "true");
    await expect(where(page)).toHaveText(`pp. ${PAGES.length - 1}–${PAGES.length} of ${PAGES.length}`);
  });

  test("← and → turn the page when the book has focus", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page);
    await track(page).focus();
    await page.keyboard.press("ArrowRight");
    await settledLeft(page);
    await expect(where(page)).toHaveText(`p. 2 of ${PAGES.length}`);
    await page.keyboard.press("ArrowRight");
    await settledLeft(page);
    await expect(where(page)).toHaveText(`p. 3 of ${PAGES.length}`);
    await page.keyboard.press("ArrowLeft");
    await settledLeft(page);
    await expect(where(page)).toHaveText(`p. 2 of ${PAGES.length}`);
    await page.keyboard.press("End");
    await settledLeft(page);
    await expect(where(page)).toHaveText(`p. ${PAGES.length} of ${PAGES.length}`);
    await page.keyboard.press("Home");
    await settledLeft(page);
    await expect(where(page)).toHaveText(`p. 1 of ${PAGES.length}`);
  });

  test("a contents line goes to its page, at the header offset", async ({ page }) => {
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      await open(page);
      if (size === PHONE) {
        await page.getByRole("button", { name: "Next page" }).click();
        await still(page);
      }
      const line = page.locator('#diary-contents a[href="#journey-entry-schaeffler"]');
      await line.scrollIntoViewIfNeeded();
      const number = PAGES.findIndex((p) => p.entryIds.includes("schaeffler")) + 1;
      await expect(line).toContainText(`page ${number}`);
      await line.click();
      await settledLeft(page);
      expect(await inWindow(page, "#journey-entry-schaeffler"), `${size.width}: the page is in the window`).toBe(true);
      expect(Math.abs((await restingTop(page, "#journey-entry-schaeffler")) - ROW_TOP)).toBeLessThanOrEqual(2);
      await expect(where(page)).toContainText(String(number));
    }
  });

  test("Tab stays on the pages on show; a page out of the window is not in the tab order", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await track(page).evaluate((el) => el.scrollIntoView({ block: "start" }));
    for (const entry of ["wordification", "code-to-give"]) {
      const link = page.locator(`#journey-entry-${entry} a[href^="http"], #journey-entry-${entry} button`).first();
      await link.focus();
      await expect(link, `${entry}: a page not on show took focus`).not.toBeFocused();
    }
    // Tab from the book goes through the spread's links, then the corners.
    await track(page).focus();
    const visited: string[] = [];
    for (let i = 0; i < 60; i += 1) {
      await page.keyboard.press("Tab");
      const at = await page.evaluate(() => {
        const el = document.activeElement!;
        return { page: el.closest(".diary-slot")?.getAttribute("data-page") ?? null, corner: el.classList.contains("diary-corner") };
      });
      if (at.corner) break;
      if (at.page) visited.push(at.page);
    }
    expect(visited.length).toBeGreaterThan(0);
    expect(new Set(visited)).toEqual(new Set(["summary", "contents"]));
  });

  test("the browser's find and a fragment open the book where they land", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    // A fragment to a page not on show: the browser reveals it (beforematch),
    // the book opens there, and the page comes to rest at the header offset.
    await page.evaluate(() => {
      window.location.hash = "journey-entry-usc-ta";
    });
    await still(page);
    expect(await inWindow(page, "#journey-entry-usc-ta")).toBe(true);
    expect(Math.abs((await restingTop(page, "#journey-entry-usc-ta")) - ROW_TOP)).toBeLessThanOrEqual(2);
    const number = PAGES.findIndex((p) => p.entryIds.includes("usc-ta")) + 1;
    await expect(where(page)).toContainText(String(number));
    // Find in page fires `beforematch` on the hidden page that matched.
    await page.locator('#record .diary-slot[data-page="certificates"]').evaluate((el) => el.dispatchEvent(new Event("beforematch", { bubbles: true })));
    await expect(where(page)).toHaveText(`pp. ${PAGES.length - 1}–${PAGES.length} of ${PAGES.length}`);
    expect(await onShow(page)).toContain("certificates");
    // Back goes back to the page before.
    await page.goBack();
    await still(page);
    expect(await inWindow(page, "#journey-entry-usc-ta")).toBe(true);
  });

  test("the contents list the certificates last, and the link goes to them", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const link = page.locator('#diary-contents a[href="#diary-certificates"]');
    await expect(link).toContainText(`page ${PAGES.length}`);
    await link.click();
    await settledLeft(page);
    expect(await inWindow(page, "#diary-certificates")).toBe(true);
  });

  test("a ring jumps to its chapter; 2018, 2019 and 2020 are one", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await expect(page.locator("#record a.record-ring")).toHaveCount(recordYears().length);
    const ring = page.locator('#record a.record-ring[href="#record-2019"]');
    await ring.scrollIntoViewIfNeeded();
    await ring.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#record-2019$/);
    await settledLeft(page);
    // 2018, 2019 and 2020 are the same page: school and the kitchen.
    const chapterPage = await page.locator("#record-2019").evaluate((el) => el.closest("article")!.id);
    expect(chapterPage).toBe(await page.locator("#record-2018").evaluate((el) => el.closest("article")!.id));
    expect(chapterPage).toBe(await page.locator("#record-2020").evaluate((el) => el.closest("article")!.id));
    expect(await inWindow(page, `#${chapterPage}`)).toBe(true);
    await expect(page.locator(`#${chapterPage}`)).toContainText("High school");
    await expect(page.locator(`#${chapterPage}`)).toContainText("Chef and server");
    expect(Math.abs((await restingTop(page, "#record-2019")) - ROW_TOP)).toBeLessThanOrEqual(2);
  });

  test("every ring is a named link, reachable by keyboard, with a visible focus", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const first = page.locator("#record a.record-ring").first();
    await first.focus();
    const stroke = await first.locator("path").evaluate((el) => getComputedStyle(el).strokeWidth);
    expect(parseFloat(stroke)).toBeGreaterThanOrEqual(3);
  });

  test("a pressed card goes to its page", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await page.getByRole("list", { name: "Pressed: my best ones" }).getByRole("link").nth(4).click();
    await settledLeft(page);
    expect(await inWindow(page, "#journey-entry-usc-scraping")).toBe(true);
    expect(Math.abs((await restingTop(page, "#journey-entry-usc-scraping")) - ROW_TOP)).toBeLessThanOrEqual(2);
  });

  test("the Journey's tags land on their pages", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await page.locator('[data-hanging-tags] a[href="#journey-entry-schaeffler"]').click();
    await settledLeft(page);
    expect(await inWindow(page, "#journey-entry-schaeffler")).toBe(true);
    expect(Math.abs((await restingTop(page, "#journey-entry-schaeffler")) - ROW_TOP)).toBeLessThanOrEqual(2);
    // Nothing on the Journey links to an id it no longer holds.
    const hrefs = await page.locator("#tree a[href^='#']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    for (const href of hrefs) {
      const inRecord = await page.locator(`#record ${href}`).count();
      const inTree = await page.locator(`#tree ${href}`).count();
      expect(inRecord + inTree, href).toBe(1);
    }
  });

  test("an entry's page: highlight, bullets, a chart, a fun fact, and no case study", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page, "day", "#journey-entry-doordash");
    await settledLeft(page);
    const dd = page.locator("#journey-entry-doordash");
    await expect(dd).toBeInViewport();
    await expect(dd.getByRole("heading", { level: 3 })).toHaveText("Software Engineer");
    await expect(dd.locator(".text-accent").first()).toHaveText("17h → 3m");
    expect(await dd.locator("ul li").count()).toBeGreaterThanOrEqual(2);
    await expect(dd.locator("figure")).toHaveCount(1);
    await expect(dd.locator("aside")).toContainText(record.funFactLabel);
    expect(await dd.locator("aside p").last().evaluate((el) => getComputedStyle(el).fontStyle)).toBe("italic");
    await expect(page.locator("#record article[id^='work-']")).toHaveCount(0);
    await expect(page.locator("#record").getByRole("button", { name: /case study|Show what/i })).toHaveCount(0);
  });

  test("tabs show one kind's pages, with counts from content, and recount the pages", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const group = page.getByRole("group", { name: record.tabsLabel });
    await expect(group.getByRole("button")).toHaveText([
      `All${COUNTS.all}`,
      `Work${COUNTS.work}`,
      `Study${COUNTS.learning}`,
      `Milestones${COUNTS.milestone}`,
    ]);
    // Index tabs stick out of the fore-edge, on the right, from 1280.
    const book = await page.locator("#record .diary-book").boundingBox();
    const tab = await group.getByRole("button").nth(1).boundingBox();
    expect(tab!.x).toBeGreaterThan(book!.x + book!.width - 12);
    expect(Math.min(tab!.width, tab!.height)).toBeGreaterThanOrEqual(44);
    const keep = (kind: string) =>
      PAGES.filter((p) => p.entryIds.length === 0 || p.entryIds.some((id) => careerEntries.find((e) => e.id === id)?.type === kind));
    for (const [name, kind, n] of [
      ["Work", "work", COUNTS.work],
      ["Study", "learning", COUNTS.learning],
      ["Milestones", "milestone", COUNTS.milestone],
    ] as const) {
      const button = group.getByRole("button", { name: new RegExp(`^${name}`) });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      const pages = keep(kind);
      await expect.poll(() => visibleNumbers(page)).toBe(pages.length);
      await expect(where(page)).toHaveText(new RegExp(`of ${pages.length}$`));
      expect(await settledLeft(page)).toBe(0);
      await expect(page.locator("#diary-contents a[href^='#journey-entry-']")).toHaveCount(n);
      const folios = await track(page).locator(":scope > .diary-slot:not([data-hidden]) .diary-folio").allTextContents();
      expect(folios).toEqual(pages.map((_, i) => String(i + 1)));
      await expect(page.getByText(`${name}: ${n} ${n === 1 ? "entry" : "entries"}`)).toBeAttached();
    }
    await group.getByRole("button", { name: /^All/ }).click();
    await expect.poll(() => visibleNumbers(page)).toBe(PAGES.length);
  });

  test("a link to a page a tab has hidden clears the tab and lands on it", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const group = page.getByRole("group", { name: record.tabsLabel });
    await group.getByRole("button", { name: /^Work/ }).click();
    await expect(page.locator("#journey-entry-deans-list")).toBeHidden();
    // A pressed card for a milestone, while the Work tab is on.
    await page.getByRole("list", { name: "Pressed: my best ones" }).getByRole("link", { name: /Best Design/ }).click();
    await expect(group.getByRole("button", { name: /^All/ })).toHaveAttribute("aria-pressed", "true");
    await settledLeft(page);
    expect(await inWindow(page, "#journey-entry-cockyhacks")).toBe(true);
  });

  test("with JavaScript off the tabs and the corners are not shown, and every page is reachable by scrolling", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: PHONE });
    const page = await context.newPage();
    await page.goto("/#record");
    await expect(page.getByRole("group", { name: record.tabsLabel })).toBeHidden();
    await expect(page.getByRole("button", { name: "Next page" })).toBeHidden();
    const view = await track(page).evaluate((el) => el.clientWidth);
    const width = await track(page).evaluate((el) => el.scrollWidth);
    expect(Math.round(width / view)).toBe(PAGES.length);
    // Scroll through the whole book; each stop is a page, and it holds an article.
    for (let i = 0; i < PAGES.length; i += 1) {
      await track(page).evaluate((el, x) => el.scrollTo({ left: x, behavior: "instant" }), i * view);
      await page.waitForTimeout(60);
      expect(await track(page).evaluate((el) => Math.round(el.scrollLeft / el.clientWidth))).toBe(i);
      expect(await page.locator("#record .diary-slot").nth(i).locator("article").count()).toBe(1);
    }
    await context.close();
  });

  test("with JavaScript off, a fragment lands on its page, and the contents links work", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: WIDE });
    const page = await context.newPage();
    await page.goto("/#journey-entry-graduation");
    await page.waitForTimeout(400);
    expect(await inWindow(page, "#journey-entry-graduation")).toBe(true);
    await expect(page.locator("#journey-entry-graduation")).toBeInViewport();
    await page.goto("/#record-2019");
    await page.waitForTimeout(400);
    expect(await inWindow(page, "#record-2019")).toBe(true);
    await page.goto("/#record");
    await page.locator('#diary-contents a[href="#journey-entry-wordification"]').click();
    await page.waitForTimeout(400);
    expect(await inWindow(page, "#journey-entry-wordification")).toBe(true);
    await context.close();
  });

  test("a stamp opens its certificate in a dialog; Escape closes it and focus returns", async ({ page }) => {
    await page.setViewportSize(WIDE);
    const images: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("certificates")) images.push(r.url());
    });
    await open(page);
    // Scroll the whole page: nothing is fetched before a press.
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.locator("#record").scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    expect(images).toEqual([]);

    const stamps = page.locator("#record button[commandfor^='certificate-'][command='show-modal']");
    await expect(stamps).toHaveCount(STAMPED.length);
    await page.locator('#diary-contents a[href="#diary-certificates"]').click();
    await still(page);
    const stamp = stamps.first();
    await stamp.focus();
    await expect(stamp).toBeFocused();
    await page.keyboard.press("Enter");
    const dialog = page.locator(`dialog#certificate-${STAMPED[0].id}`);
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("open", "");
    await expect(dialog.getByRole("heading")).toHaveText(STAMPED[0].name);
    const img = dialog.locator("img");
    await expect(img).toHaveJSProperty("complete", true);
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    expect(images.length).toBeGreaterThan(0);
    expect(images.every((u) => u.includes(encodeURIComponent(`certificates/${STAMPED[0].id}`)) || u.includes(`certificates/${STAMPED[0].id}`))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(stamp).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect(stamp).toBeFocused();
  });

  test("each stamp is drawn for what its certificate was about", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    expect(STAMPED.map((c) => c.stamp!.drawing)).toEqual(["bank", "card", "code", "cart"]);
    for (const c of STAMPED) {
      await expect(page.locator(`button[commandfor="certificate-${c.id}"] [data-scenery="stamp-${c.stamp!.drawing}"]`)).toHaveCount(1);
    }
  });

  test("an award opens from its page", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page, "day", "#journey-entry-code-to-give");
    await settledLeft(page);
    const button = page.locator("#journey-entry-code-to-give").getByRole("button", { name: "See the award" });
    await button.click();
    await expect(page.locator("dialog#award-code-to-give")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(button).toBeFocused();
  });

  test("AT&T has no stamp", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await expect(page.locator("#record")).not.toContainText("AT&T");
  });

  test("no horizontal overflow of the document from 320 to 1920, and nothing clips its text sideways", async ({ page }) => {
    for (const width of [320, 360, 390, 414, 768, 844, 1024, 1280, 1366, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `${width}px`).toBeLessThanOrEqual(0);
      const clipped = await page.locator("#record .record-card a, #record .record-stamp").evaluateAll((els) =>
        els.filter((el) => el.scrollWidth > el.clientWidth + 1).length,
      );
      expect(clipped, `${width}px: a card or stamp clips its text sideways`).toBe(0);
    }
  });

  test("reduced motion: nothing in the Diary animates", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    expect(await page.evaluate(() => document.getElementById("record")!.getAnimations({ subtree: true }).length)).toBe(0);
    // Turning a page ends at once.
    await page.getByRole("button", { name: "Next page" }).click();
    expect(await track(page).evaluate((el) => Math.round(el.scrollLeft))).toBeGreaterThan(0);
  });

  test("with JavaScript off the track tilts its pages as they scroll; with JavaScript the leaves turn instead", async ({ browser, page }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: WIDE, reducedMotion: "no-preference" });
    const plain = await context.newPage();
    await plain.goto("/#record");
    const supported = await plain.evaluate(() => CSS.supports("animation-timeline: view()"));
    test.skip(!supported, "no scroll-driven animations in this browser");
    const names = await plain.locator("#record .diary-slot > .diary-page").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(names).toContain("diary-in");
    // Flat when it is fully in view.
    expect(await plain.locator("#record #diary-summary").evaluate((el) => getComputedStyle(el).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    await context.close();

    await page.setViewportSize(WIDE);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await open(page);
    await expect(frame(page)).toHaveAttribute("data-mode", "leaf");
    expect(await page.locator("#record .diary-slot > .diary-page").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });

  test("the book is an object: boards, page stacks that move as I read, running heads and folios in the outer corners", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await track(page).evaluate((el) => el.scrollIntoView({ block: "start" }));
    const box = () => page.locator("#record .diary-book").boundingBox().then((b) => b!);
    let book = await box();
    const cover = (await page.locator("#record .diary-cover").boundingBox())!;
    expect(cover.x).toBeLessThan(book.x);
    expect(cover.x + cover.width).toBeGreaterThan(book.x + book.width);
    expect(cover.y).toBeLessThan(book.y);
    const stacks = async () => ({
      read: (await page.locator("#record .diary-stack-read").boundingBox())!.width,
      left: (await page.locator("#record .diary-stack-left").boundingBox())!.width,
    });
    const first = await stacks();
    await page.getByRole("button", { name: "Next page" }).click();
    await still(page);
    await page.getByRole("button", { name: "Next page" }).click();
    await still(page);
    await page.waitForTimeout(500);
    const later = await stacks();
    expect(later.read, "the read side thickens").toBeGreaterThan(first.read);
    expect(later.left, "the side to come thins").toBeLessThan(first.left);
    // The ribbon hangs out of the foot, from the spine.
    book = await box();
    const ribbon = (await page.locator("#record .diary-ribbon").boundingBox())!;
    expect(ribbon.y + ribbon.height).toBeGreaterThan(book.y + book.height + 20);
    expect(Math.abs(ribbon.x - (book.x + book.width / 2))).toBeLessThan(24);
    // Running heads: the chapter's years, in the outer top corner.
    const [left, right] = await onShow(page);
    for (const [key, side] of [[left, "left"], [right, "right"]] as const) {
      const s = (await slot(page, key).boundingBox())!;
      const head = slot(page, key).locator(".diary-head");
      await expect(head).toHaveText(/^(\d{4}( – \d{4})?|Certificates.*)$/);
      const h = (await head.boundingBox())!;
      const folio = (await slot(page, key).locator(".diary-folio").boundingBox())!;
      expect(h.y - s.y).toBeLessThan(30);
      expect(folio.y + folio.height).toBeGreaterThan(s.y + s.height - 40);
      if (side === "left") {
        expect(h.x - s.x, `${key}: head in the outer corner`).toBeLessThan(s.width / 3);
        expect(folio.x - s.x).toBeLessThan(s.width / 3);
      } else {
        expect(s.x + s.width - (h.x + h.width), `${key}: head in the outer corner`).toBeLessThan(s.width / 3);
        expect(s.x + s.width - (folio.x + folio.width)).toBeLessThan(s.width / 3);
      }
    }
    await expect(slot(page, "summary").locator(".diary-head")).toHaveCount(0);
  });

  test("a far jump riffles: several leaves flick over, then the book lies open at the page", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await track(page).evaluate((el) => el.scrollIntoView({ block: "start" }));
    const target = PAGES.findIndex((p) => p.entryIds.includes("eastside-high"));
    await page.locator('#diary-contents a[href="#journey-entry-eastside-high"]').click();
    // Mid-riffle: blank leaves in the air between the real pages.
    await expect.poll(() => page.locator("#record .diary-sheet[data-face]").count()).toBeGreaterThan(1);
    await still(page);
    await expect(page).toHaveURL(/#journey-entry-eastside-high$/);
    expect(await onShow(page)).toContain(PAGES[target].key);
    expect(await page.locator("#record .diary-sheet[data-at]").count(), "every blank leaf put away").toBe(0);
  });

  for (const theme of ["day", "night"] as const) {
    for (const size of [WIDE, PHONE]) {
      test(`zero WCAG violations in the Diary, ${theme}, ${size.width}`, async ({ page }) => {
        await page.setViewportSize(size);
        await open(page, theme);
        await page.locator("#record").scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        for (const hash of ["", "#journey-entry-doordash", "#journey-entry-code-to-give"]) {
          if (hash) {
            await page.goto(`/${hash}`);
            await page.waitForLoadState("networkidle");
            await settledLeft(page);
          }
          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
            .include("#record")
            .analyze();
          expect(results.violations.map((v) => `${hash || "start"} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`)).toEqual([]);
        }
      });
    }
    test(`zero WCAG violations with a certificate open, ${theme}`, async ({ page }) => {
      await page.setViewportSize(WIDE);
      await open(page, theme);
      await page.locator("#record").scrollIntoViewIfNeeded();
      await page.locator('#diary-contents a[href="#diary-certificates"]').click();
      await settledLeft(page);
      await page.locator("#record button[commandfor^='certificate-'][command='show-modal']").first().click();
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .include("dialog[open]")
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });
  }
});
