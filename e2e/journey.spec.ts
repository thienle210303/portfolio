import { test, expect, type Locator, type Page } from "@playwright/test";
import { journey } from "../src/content/portfolio";
import { TAG_SPOTS } from "../src/sections/CareerTree/HangingTags";

// Round 21 Phase 4: the Journey opens with the oak (NatJourney). Each test pins
// its own viewport rather than running per project.

const WIDE = { width: 1440, height: 900 };
const BOARD_MIN = { width: 1280, height: 800 };
const TABLET = { width: 1024, height: 768 };
const PHONE = { width: 390, height: 844 };
const SMALL = { width: 320, height: 568 };
const SPOTS = TAG_SPOTS;
const ROW_TOP = 80;

async function open(page: Page, theme: "day" | "night" = "day") {
  await page.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

/** Scrolls so `#tree`'s top is at the viewport's top. */
async function toTree(page: Page) {
  await page.evaluate(() => {
    const tree = document.getElementById("tree")!;
    window.scrollTo({ top: tree.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
  });
  await page.waitForTimeout(200);
}

const items = (page: Page) => page.locator("[data-hanging-tags] li");
const tagLinks = (page: Page) => page.locator("[data-hanging-tags] a");
const watch = (page: Page) => page.locator("#tree").getByRole("button", { name: journey.watch });
const lantern = (page: Page) => page.locator('#tree [data-scenery="journey"] span[style*="--art-lantern"]');
const rowTrigger = (page: Page, id: string) => page.locator(`#record #record-row-${id}-trigger`);
const row = (page: Page, id: string) => page.locator(`#record #journey-entry-${id}`);

type Box = { x: number; y: number; width: number; height: number };
const boxes = (l: Locator) =>
  l.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );
const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The element's offset from the viewport's top once it has stopped moving. */
async function restingTop(element: Locator): Promise<number> {
  const read = () => element.evaluate((node) => Math.round(node.getBoundingClientRect().top));
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

/** What has focus: a link by its href, the button by its text. */
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return "";
    return el.getAttribute("href") ?? el.textContent?.trim() ?? "";
  });

/** Puts focus just before the tags: on the heading, made focusable for the test. */
const focusHeading = (page: Page) =>
  page.locator("#tree-heading").evaluate((el) => {
    (el as HTMLElement).tabIndex = -1;
    (el as HTMLElement).focus();
  });

const TAB_ORDER = [
  "#journey-entry-doordash",
  "#work-dd-feasibility-agent",
  "#journey-entry-wordification",
  "#journey-entry-schaeffler",
  "#journey-entry-usc-scraping",
  "#journey-entry-usc-ta",
];

test.describe("the Journey", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-1440", "pins its own viewports; run once");
  });

  for (const viewport of [WIDE, PHONE]) {
    test(`heading, my line and five tags at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      await expect(page.locator("#tree h2")).toHaveText(journey.heading);
      await expect(page.locator("#tree").getByText(journey.lead)).toBeVisible();
      await expect(items(page)).toHaveCount(5);
      for (const li of await items(page).all()) await expect(li).toBeVisible();
      const first = items(page).first();
      // "→" is followed by an sr-only " to ".
      await expect(first).toContainText(/2 → +to 25/);
      await expect(first).toContainText("2026");
    });
  }

  for (const viewport of [BOARD_MIN, WIDE]) {
    test(`the words clear the crown at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      await toTree(page);
      const h2 = await page.locator("#tree h2").evaluate((el) => ({
        height: el.getBoundingClientRect().height,
        size: parseFloat(getComputedStyle(el).fontSize),
      }));
      expect(h2.height, "the heading is one line").toBeLessThan(1.4 * h2.size);
      const lead = await page.locator("#tree h2 + p").evaluate((el) => el.getBoundingClientRect().bottom);
      expect(lead).toBeLessThanOrEqual(190);
    });
  }

  test("tags hang from the limb at 1440", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await toTree(page);
    const width = await page.evaluate(() => document.getElementById("tree")!.getBoundingClientRect().width);
    const all = await boxes(items(page));
    all.forEach((b, i) => {
      expect(Math.abs(b.y - SPOTS[i].top), `tag ${i} top`).toBeLessThanOrEqual(16);
      expect(Math.abs(b.x - ((width - 1440) / 2 + SPOTS[i].left)), `tag ${i} left`).toBeLessThanOrEqual(16);
    });
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) expect(overlap(all[i], all[j]), `${i} and ${j}`).toBe(false);
  });

  test("the board holds at 1280", async ({ page }) => {
    await page.setViewportSize(BOARD_MIN);
    await open(page);
    await toTree(page);
    const all = await boxes(items(page));
    for (const b of all) expect(b.x + b.width).toBeLessThanOrEqual(1264.5);
    const papers = await boxes(page.locator("[data-hanging-tags] li > div"));
    const button = (await boxes(watch(page)))[0];
    for (const p of papers) {
      expect(p.x + p.width, "a tilted tag stays on screen").toBeLessThanOrEqual(1280);
      expect(overlap(p, button)).toBe(false);
    }
  });

  test("below 1280 the tags hang from the branch", async ({ page }) => {
    // A phone: one column down the right edge.
    await page.setViewportSize(PHONE);
    await open(page);
    let all = await boxes(items(page));
    for (const b of all) expect(Math.abs(b.x + b.width - (all[0].x + all[0].width))).toBeLessThanOrEqual(2);
    for (let i = 1; i < all.length; i++) expect(all[i].y).toBeGreaterThan(all[i - 1].y + all[i - 1].height);

    // From 640: either side of a branch down the middle, taking turns.
    await page.setViewportSize(TABLET);
    await page.waitForTimeout(200);
    all = await boxes(items(page));
    const mid = await page.locator("[data-hanging-tags]").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.x + r.width / 2;
    });
    all.forEach((b, i) => {
      if (i % 2 === 0) expect(b.x + b.width, `tag ${i} hangs left`).toBeLessThanOrEqual(mid - 40);
      else expect(b.x, `tag ${i} hangs right`).toBeGreaterThanOrEqual(mid + 40);
      if (i >= 2) expect(b.y, `tag ${i} below the one above it`).toBeGreaterThan(all[i - 2].y + all[i - 2].height);
      if (i >= 1) expect(b.y, `tag ${i} after tag ${i - 1}`).toBeGreaterThan(all[i - 1].y);
    });
  });

  test("no tag clips its text at 320", async ({ page }) => {
    await page.setViewportSize(SMALL);
    await open(page);
    const papers = page.locator("[data-hanging-tags] .tag-cut, [data-hanging-tags] [data-stub]");
    expect(await papers.count()).toBe(6);
    for (const paper of await papers.all()) {
      const m = await paper.evaluate((el) => ({
        sh: el.scrollHeight,
        ch: el.clientHeight,
        sw: el.scrollWidth,
        cw: el.clientWidth,
      }));
      expect(m.sh).toBeLessThanOrEqual(m.ch + 1);
      expect(m.sw).toBeLessThanOrEqual(m.cw + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });

  for (const viewport of [WIDE, TABLET, PHONE]) {
    test(`tab order at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      await focusHeading(page);
      const order: string[] = [];
      // Watch it grow first at every width (round 22): it sits under the
      // heading below 1280 and is the board's first control from 1280.
      const expected = [journey.watch, ...TAB_ORDER];
      for (let i = 0; i < expected.length; i++) {
        await page.keyboard.press("Tab");
        order.push(await focused(page));
      }
      expect(order).toEqual(expected);
    });
  }

  for (const theme of ["day", "night"] as const) {
    test(`focus is visible on every tag and on Watch it grow, ${theme}`, async ({ page }) => {
      await page.setViewportSize(WIDE);
      await open(page, theme);
      await focusHeading(page);
      for (let i = 0; i < TAB_ORDER.length + 1; i++) {
        await page.keyboard.press("Tab");
        const ring = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const s = getComputedStyle(el);
          return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), clip: s.clipPath, what: el.textContent };
        });
        expect(ring.style, ring.what ?? "").not.toBe("none");
        expect(ring.width).toBeGreaterThanOrEqual(2);
        expect(ring.clip).toBe("none");
      }
    });
  }

  test("a tag opens its row", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await page.locator('[data-hanging-tags] a[href="#journey-entry-schaeffler"]').click();
    await expect(rowTrigger(page, "schaeffler")).toHaveAttribute("aria-expanded", "true");
    expect(Math.abs((await restingTop(row(page, "schaeffler"))) - ROW_TOP)).toBeLessThanOrEqual(2);
  });

  test("the stub opens the DoorDash row at its case study", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await page.locator('[data-hanging-tags] a[href="#work-dd-feasibility-agent"]').click();
    await expect(rowTrigger(page, "doordash")).toHaveAttribute("aria-expanded", "true");
    // A case study lands at its own scroll margin (CaseStudy.tsx), not the row's.
    const study = page.locator("#work-dd-feasibility-agent");
    const margin = await study.evaluate((el) => parseFloat(getComputedStyle(el).scrollMarginTop));
    expect(Math.abs((await restingTop(study)) - margin)).toBeLessThanOrEqual(2);
  });

  for (const viewport of [WIDE, PHONE]) {
    test(`the hero's Read this part lands the DoorDash row at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      await page.locator('#about button[id$="-front"]').filter({ hasText: "DoorDash" }).click();
      const read = page.locator('#about [id$="-back"]').nth(3).getByRole("link", { name: "Read this part" });
      await expect(read).toHaveAttribute("href", "#journey-entry-doordash");
      await read.click();
      await expect(rowTrigger(page, "doordash")).toHaveAttribute("aria-expanded", "true");
      expect(Math.abs((await restingTop(row(page, "doordash"))) - ROW_TOP)).toBeLessThanOrEqual(2);
    });
  }

  for (const viewport of [WIDE, PHONE]) {
    test(`Watch it grow grows the oak and hangs every tag back at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      await page.evaluate(() => {
        const w = window as unknown as { originEvents: string[] };
        w.originEvents = [];
        document.addEventListener("origin-story", (event) => w.originEvents.push(String((event as CustomEvent).detail)));
      });
      await watch(page).click();
      await expect(page.locator("#tree")).toHaveAttribute("data-growing", "");
      const skip = page.locator("#tree").getByRole("button", { name: journey.skip });
      await expect(skip).toBeFocused();
      await expect(page.locator("[data-grow-caption]")).toBeVisible();
      // A tag waits for its year, hidden, so it is never a link to nowhere.
      await expect(items(page).last()).toBeHidden();
      await expect(page.locator("#tree")).not.toHaveAttribute("data-growing", { timeout: 15_000 });
      for (const li of await items(page).all()) await expect(li).toBeVisible();
      await expect(watch(page)).toBeFocused();
      expect(await page.evaluate(() => (window as unknown as { originEvents: string[] }).originEvents)).toEqual([
        "start",
        "end",
      ]);
    });
  }

  test("Skip ends the show at once, and the caption never moves the page", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page);
    const crown = page.locator("[data-crown]");
    const before = await crown.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await watch(page).click();
    await expect(page.locator("[data-grow-caption]")).toBeVisible();
    expect(await crown.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)).toBe(before);
    await page.locator("#tree").getByRole("button", { name: journey.skip }).click();
    await expect(page.locator("#tree")).not.toHaveAttribute("data-growing");
    for (const li of await items(page).all()) await expect(li).toBeVisible();
  });

  for (const theme of ["day", "night"] as const) {
    test(`${theme}: the lantern and the still life`, async ({ page }) => {
      await page.setViewportSize(WIDE);
      await open(page, theme);
      const bg = await lantern(page).evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(bg).toContain(theme === "day" ? "lantern-day.svg" : "lantern-night.svg");
      const [shown, hidden] =
        theme === "day" ? [journey.vignette.morning, journey.vignette.evening] : [journey.vignette.evening, journey.vignette.morning];
      await expect(page.locator("#tree").getByText(shown)).toBeVisible();
      await expect(page.locator("#tree").getByText(hidden)).toBeHidden();
    });
  }

  test("the toggle swaps the lantern and the vignette in place", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page, "day");
    await page.evaluate(() => ((window as unknown as { stayed: boolean }).stayed = true));
    await page.getByRole("button", { name: "Switch to night theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
    expect(await lantern(page).evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("lantern-night.svg");
    await expect(page.locator("#tree").getByText(journey.vignette.evening)).toBeVisible();
    await expect(page.locator("#tree").getByText(journey.vignette.morning)).toBeHidden();
    expect(await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed)).toBe(true);
  });

  test("JS off, dark scheme: the night Journey", async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      colorScheme: "dark",
      viewport: WIDE,
      baseURL: test.info().project.use.baseURL,
    });
    const page = await context.newPage();
    await page.goto("/");
    expect(await lantern(page).evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("lantern-night.svg");
    await expect(page.locator("#tree").getByText(journey.vignette.evening)).toBeVisible();
    for (const li of await items(page).all()) await expect(li).toBeVisible();
    await context.close();
  });

  test("JS off: no Watch it grow", async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      colorScheme: "light",
      viewport: WIDE,
      baseURL: test.info().project.use.baseURL,
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("#tree button", { hasText: journey.watch })).toBeHidden();
    for (const li of await items(page).all()) await expect(li).toBeVisible();
    await context.close();
  });

  test("one tree: no tree box anywhere", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await expect(page.locator("[data-tree-box], [data-origin-host]")).toHaveCount(0);
  });

  test("reduced motion: nothing on the stage moves, and there is no Watch it grow", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await toTree(page);
    await expect(watch(page)).toBeHidden();
    const moving = await page.evaluate(() => {
      const stage = document.querySelector("[data-journey-stage]")!;
      const animations = stage.getAnimations({ subtree: true }).length;
      const transitions = [stage, ...stage.querySelectorAll("*")]
        .map((el) => getComputedStyle(el).transitionDuration.split(",").map((d) => parseFloat(d) * (d.trim().endsWith("ms") ? 1 : 1000)))
        .filter((ds) => ds.some((d) => d > 0.01)).length;
      return { animations, transitions };
    });
    expect(moving).toEqual({ animations: 0, transitions: 0 });
  });

  test("tags link to rows that exist", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    for (const href of await tagLinks(page).evaluateAll((els) => els.map((el) => el.getAttribute("href")!))) {
      await expect(page.locator(href), href).toHaveCount(1);
    }
  });
});
