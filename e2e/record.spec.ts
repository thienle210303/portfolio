import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { careerEntries, certifications, record } from "../src/content/portfolio";
import { diaryPages, kindCounts, recordYears } from "../src/lib/record";

// Round 23: the Diary, a book you swipe left and right. Each test pins its own
// viewport and runs once (in the chromium-1440 project), as journey.spec does.

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

/** The track's scrollLeft once it has stopped moving (a snap or a smooth turn). */
async function settledLeft(page: Page): Promise<number> {
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
    const box = document.querySelector("#record .diary-track")!.getBoundingClientRect();
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
    const win = await track(page).boundingBox();
    expect(one!.width).toBeCloseTo(win!.width, 0);
  });

  test("native scroll is the swipe: it snaps to a page, and the counter follows", async ({ page }) => {
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      await open(page);
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
    }
  });

  test("the dog-eared corners turn the page; the first has no page before it, the last none after", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const prev = page.getByRole("button", { name: "Previous page" });
    const next = page.getByRole("button", { name: "Next page" });
    await expect(prev).toHaveAttribute("aria-disabled", "true");
    expect(await next.boundingBox().then((b) => Math.min(b!.width, b!.height))).toBeGreaterThanOrEqual(44);
    await next.click();
    expect(await settledLeft(page)).toBeGreaterThan(0);
    await expect(where(page)).toHaveText(`pp. 3–4 of ${PAGES.length}`);
    await expect(prev).not.toHaveAttribute("aria-disabled", "true");
    await prev.click();
    expect(await settledLeft(page)).toBe(0);
    for (let i = 0; i < PAGES.length / 2; i += 1) {
      await next.click({ force: true });
      await settledLeft(page);
    }
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
        await track(page).evaluate((el) => el.scrollBy({ left: el.clientWidth, behavior: "instant" }));
        await settledLeft(page);
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

  test("Tab into a link on a page out of the window brings its whole spread into view", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await track(page).evaluate((el) => el.scrollIntoView({ block: "start" }));
    for (const entry of ["wordification", "code-to-give"]) {
      const link = page.locator(`#journey-entry-${entry} a[href^="http"], #journey-entry-${entry} button`).first();
      await link.focus();
      await settledLeft(page);
      expect(await inWindow(page, `#journey-entry-${entry}`), `${entry}: focus left the book on another page`).toBe(true);
      await track(page).evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));
      await settledLeft(page);
    }
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
    const stamp = stamps.first();
    await stamp.focus();
    await settledLeft(page);
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

  test("a page turn is a scroll-driven tilt only where it is allowed", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await open(page);
    const supported = await page.evaluate(() => CSS.supports("animation-timeline: view()"));
    test.skip(!supported, "no scroll-driven animations in this browser");
    const names = await page.locator("#record .diary-slot > .diary-page").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(names).toContain("diary-in");
    // Flat when it is fully in view.
    expect(await page.locator("#record #diary-summary").evaluate((el) => getComputedStyle(el).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
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
