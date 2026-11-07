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

const items = (page: Page) => page.locator("[data-hanging-tags] > ul > li");
const tagLinks = (page: Page) => page.locator("[data-hanging-tags] > ul a");
const watch = (page: Page) => page.locator("#tree").getByRole("button", { name: journey.watch });
const lantern = (page: Page) => page.locator('#tree [data-scenery="journey"] span[style*="--art-lantern"]');
const row = (page: Page, id: string) => page.locator(`#record #journey-entry-${id}`);
/** Is the whole of the entry's page (or block) inside the Diary's window, sideways? Round 23: the
 *  Record's rows are a book's pages, and a tag that lands vertically but leaves the book on another
 *  page is a miss. */
const inBook = (page: Page, id: string) =>
  page.evaluate((entry) => {
    const box = document.querySelector("#record .diary-track")!.getBoundingClientRect();
    const r = document.getElementById(`journey-entry-${entry}`)!.getBoundingClientRect();
    return r.left >= box.left - 2 && r.right <= box.right + 2;
  }, id);

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

type Point = readonly [number, number];
/** Do two convex quads meet? (Separating axes: a tag's paper is its box turned about its hole.) */
function quadsMeet(a: readonly Point[], b: readonly Point[]) {
  for (const quad of [a, b]) {
    for (let i = 0; i < quad.length; i++) {
      const [x1, y1] = quad[i];
      const [x2, y2] = quad[(i + 1) % quad.length];
      const axis = [y2 - y1, x1 - x2] as const;
      const span = (points: readonly Point[]) => points.map(([x, y]) => x * axis[0] + y * axis[1]);
      const [sa, sb] = [span(a), span(b)];
      if (Math.max(...sa) <= Math.min(...sb) || Math.max(...sb) <= Math.min(...sa)) return false;
    }
  }
  return true;
}

/**
 * The Journey's pieces where they stand, in page coordinates (round 25). The
 * tags' scroll-driven drop is switched off first, so a paper is measured where
 * it hangs, not part-way down its string. `bark` is the trunk's own width (34
 * of the 240 units its box is wide) below 1280, where the trunk is an element;
 * `quads` are the papers' corners, each box turned about its hole (50%, 18px).
 */
async function stage(page: Page) {
  await page.addStyleTag({ content: "[data-hanging-tags] > ul > li > div { animation: none !important; }" });
  return page.evaluate(() => {
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height };
    };
    const one = (selector: string) => box(document.querySelector(selector)!);
    const shown = (selector: string) => {
      const el = [...document.querySelectorAll(selector)].find((node) => node.getBoundingClientRect().width > 0);
      return el ? box(el) : null;
    };
    const trunk = shown("#tree [data-trunk]");
    const lis = [...document.querySelectorAll<HTMLElement>("[data-hanging-tags] > ul > li")];
    const caption = document.querySelector<HTMLElement>("#tree [data-swing] > p[aria-hidden='true']")!;
    const captionRect = caption.getBoundingClientRect();
    return {
      tree: one("#tree"),
      head: one("[data-journey-head]"),
      lead: one("#tree h2 + p"),
      button: one("#tree [data-grow] button"),
      items: lis.map(box),
      papers: lis.map((li) => box(li.querySelector(":scope > div")!)),
      quads: lis.map((li) => {
        const paper = li.querySelector<HTMLElement>(":scope > div")!;
        const turn = (parseFloat(getComputedStyle(paper).rotate) || 0) * (Math.PI / 180);
        const r = box(li);
        const [cx, cy] = [r.x + r.width / 2, r.y + 18];
        return [
          [r.x, r.y],
          [r.x + r.width, r.y],
          [r.x + r.width, r.y + r.height],
          [r.x, r.y + r.height],
        ].map(([x, y]) => [
          cx + (x - cx) * Math.cos(turn) - (y - cy) * Math.sin(turn),
          cy + (x - cx) * Math.sin(turn) + (y - cy) * Math.cos(turn),
        ]) as unknown as readonly (readonly [number, number])[];
      }),
      bark: trunk && { ...trunk, x: trunk.x + trunk.width / 2 - (trunk.width * 34) / 480, width: (trunk.width * 34) / 240 },
      crown: shown("#tree [data-crown]"),
      oak: shown("#tree [data-oak]"),
      lantern: shown("#tree span[data-grow-late]"),
      ride: one("#tree [data-swing] [data-ride]"),
      rope: shown("#tree [data-swing] [data-rope='left']"),
      caption: box(caption),
      captionText: caption.textContent ?? "",
      captionClipped:
        captionRect.left < 0 || captionRect.right > window.innerWidth || caption.scrollWidth > caption.clientWidth + 1,
      vignette: one("[data-journey-vignette]"),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

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
    const { width, top } = await page.evaluate(() => document.getElementById("tree")!.getBoundingClientRect());
    const all = await boxes(items(page));
    all.forEach((b, i) => {
      expect(Math.abs(b.y - top - SPOTS[i].top), `tag ${i} top`).toBeLessThanOrEqual(16);
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
    const papers = await boxes(page.locator("[data-hanging-tags] > ul > li > div"));
    const button = (await boxes(watch(page)))[0];
    for (const p of papers) {
      expect(p.x + p.width, "a tilted tag stays on screen").toBeLessThanOrEqual(1280);
      expect(overlap(p, button)).toBe(false);
    }
  });

  /* Round 25: the board is laid out in board units (1/1440 of its own width),
     so it fits its window from 1280 and stops growing at 1680px. Until then it
     was fixed pixels for 1440, and at 1280 the lantern was cut in half at the
     left edge and the swing's caption read "…hi, in love". */
  for (const viewport of [BOARD_MIN, { width: 1366, height: 768 }, WIDE, { width: 1920, height: 1080 }]) {
    test(`the whole board is inside its window at ${viewport.width}: lantern, swing, caption, every tag`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      const g = await stage(page);
      const pieces: Record<string, Box> = { lantern: g.lantern!, ride: g.ride, caption: g.caption, vignette: g.vignette };
      g.papers.forEach((paper, i) => (pieces[`tag ${i}`] = paper));
      for (const [name, b] of Object.entries(pieces)) {
        expect(b.width, `${name} is drawn`).toBeGreaterThan(20);
        expect(b.x, `${name} starts on screen`).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, `${name} ends on screen`).toBeLessThanOrEqual(viewport.width);
        expect(b.y, `${name} starts inside #tree`).toBeGreaterThanOrEqual(g.tree.y);
        expect(b.y + b.height, `${name} ends inside #tree`).toBeLessThanOrEqual(g.tree.y + g.tree.height);
      }
      // The caption is whole: nothing clips it, and it is not ellipsised.
      expect(g.captionText).toMatch(new RegExp(`^${journey.swing.name}, \\S`));
      expect(g.captionClipped, "the caption's own box holds its words").toBe(false);
      // No two tags touch: as list items, and as the papers hang, each turned about its hole.
      for (let i = 0; i < g.items.length; i++)
        for (let j = i + 1; j < g.items.length; j++) {
          expect(overlap(g.items[i], g.items[j]), `${i} and ${j}`).toBe(false);
          expect(quadsMeet(g.quads[i], g.quads[j]), `papers ${i} and ${j}`).toBe(false);
        }
      // None is over the trunk: the bark runs from board x 276 to 335 under the fork.
      const unit = g.oak!.width / 1440;
      for (const paper of g.papers) expect(paper.x, "a tag on the trunk").toBeGreaterThan(g.oak!.x + 335 * unit);
      // The swing hangs between the lantern and the trunk: her left rope is past the
      // lantern's box and her seat stops short of the bark.
      expect(g.rope!.x, "the rope is right of the lantern").toBeGreaterThanOrEqual(g.lantern!.x + g.lantern!.width);
      expect(g.ride.x + g.ride.width, "the seat is left of the trunk").toBeLessThanOrEqual(g.oak!.x + 276 * unit);
      // The board is as wide as the window up to 1680px, centred past that.
      const board = Math.min(viewport.width, 1680);
      expect(Math.abs(g.oak!.width - board), "the board's width").toBeLessThanOrEqual(1);
      expect(Math.abs(g.oak!.x - (viewport.width - board) / 2), "the board is centred").toBeLessThanOrEqual(1);
      // A tag narrows with the board: its own width in units (round 27: no two alike).
      expect(Math.abs(g.items[1].width - SPOTS[1].width * unit)).toBeLessThanOrEqual(1);
      expect(g.scrollWidth).toBeLessThanOrEqual(viewport.width);
    });
  }

  test("no text is clipped inside a tag on the narrowest board, 1280", async ({ page }) => {
    await page.setViewportSize(BOARD_MIN);
    await open(page);
    const papers = page.locator("[data-hanging-tags] [data-manila]");
    expect(await papers.count()).toBe(6);
    for (const paper of await papers.all()) {
      const m = await paper.evaluate((el) => {
        const box = el.getBoundingClientRect();
        // Every run of words is inside its paper, sideways (the paper is tilted a degree or two).
        const out = [...el.querySelectorAll("span")]
          .filter((span) => span.children.length === 0 && span.textContent?.trim() && !span.closest(".sr-only, [aria-hidden='true']"))
          .map((span) => ({ text: span.textContent, r: span.getBoundingClientRect() }))
          .filter(({ r }) => r.left < box.left + 4 || r.right > box.right - 4)
          .map(({ text }) => text);
        return { sh: el.scrollHeight, ch: el.clientHeight, sw: el.scrollWidth, cw: el.clientWidth, out };
      });
      expect(m.sh).toBeLessThanOrEqual(m.ch + 1);
      expect(m.sw).toBeLessThanOrEqual(m.cw + 1);
      expect(m.out, "words outside their tag").toEqual([]);
    }
  });

  test("on a phone the tags hang in one column from a trunk that stands in from the edge", async ({ page }) => {
    for (const viewport of [SMALL, { width: 375, height: 667 }, PHONE]) {
      await page.setViewportSize(viewport);
      await open(page);
      const g = await stage(page);
      const all = g.items;
      for (const b of all) expect(Math.abs(b.x + b.width - (all[0].x + all[0].width))).toBeLessThanOrEqual(2);
      for (let i = 1; i < all.length; i++) expect(all[i].y).toBeGreaterThan(all[i - 1].y + all[i - 1].height);
      // Round 25: the bark stood hard against the screen's edge, its right-hand twigs and roots
      // cut off. Its centre line is 36px into the stage now, so the bark ends over 32px in.
      expect(g.bark!.x + g.bark!.width, `the bark's right edge at ${viewport.width}`).toBeLessThanOrEqual(viewport.width - 32);
      // ...and a tag, tilted, keeps 8px from it (it was 4 to 8px at 320).
      for (const paper of g.papers) {
        expect(g.bark!.x - (paper.x + paper.width), `a tag's gap to the trunk at ${viewport.width}`).toBeGreaterThanOrEqual(8);
      }
      expect(g.scrollWidth).toBeLessThanOrEqual(viewport.width);
    }
  });

  /* Round 25: from 640 to 1279 the boughs leave the trunk in pairs (it was the
     phone's zigzag, stretched: 236px tags, 2,100px tall at 1024). */
  for (const viewport of [{ width: 640, height: 900 }, { width: 768, height: 1024 }, TABLET, { width: 1279, height: 800 }]) {
    test(`from 640 the boughs leave the trunk in pairs, a tag each side, at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      const g = await stage(page);
      const all = g.items;
      const mid = g.bark!.x + g.bark!.width / 2;
      expect(Math.abs(mid - viewport.width / 2), "the trunk runs down the middle").toBeLessThanOrEqual(2);
      all.forEach((b, i) => {
        if (i % 2 === 0) expect(b.x + b.width, `tag ${i} hangs left`).toBeLessThanOrEqual(mid - 30);
        else expect(b.x, `tag ${i} hangs right`).toBeGreaterThanOrEqual(mid + 30);
        // A pair hangs level, and each row is under the one above it.
        if (i % 2 === 1) expect(Math.abs(b.y - all[i - 1].y), `tags ${i - 1} and ${i} hang level`).toBeLessThanOrEqual(1);
        if (i >= 2) {
          const above = [all[i - 2 - (i % 2)], all[i - 1 - (i % 2)]];
          expect(b.y, `tag ${i} below the row above it`).toBeGreaterThan(Math.max(...above.map((a) => a.y + a.height)));
        }
      });
      // DoorDash | Wordification, Schaeffler | USC research, USC teaching | Bé Nhi.
      expect(Math.abs(g.ride.y - all[4].y), "her swing hangs level with the fifth tag").toBeLessThanOrEqual(1);
      expect(g.ride.x, "on the right").toBeGreaterThanOrEqual(mid + 30);
      // Up to 340px wide (236px until round 25), and as wide as its column below that.
      for (const b of all) {
        expect(b.width).toBeLessThanOrEqual(340.5);
        expect(b.width).toBeGreaterThanOrEqual(Math.min(339.5, (viewport.width - 2 * 80) / 2 - 60));
      }
      // No two tags touch and none touches the trunk's bark, tilted as they hang
      // (the DoorDash stub overlapped it by 5 to 8px at 768).
      const papers = [...g.papers, g.ride];
      for (let i = 0; i < papers.length; i++)
        for (let j = i + 1; j < papers.length; j++) expect(overlap(papers[i], papers[j]), `${i} and ${j}`).toBe(false);
      for (const [i, paper] of g.papers.entries()) {
        const gap = i % 2 === 0 ? g.bark!.x - (paper.x + paper.width) : paper.x - (g.bark!.x + g.bark!.width);
        expect(gap, `tag ${i}'s gap to the trunk`).toBeGreaterThanOrEqual(12);
      }
      // The words stand top-left beside the crown, not above a band of bare sky:
      // the crown starts above the button, and to the words' right.
      expect(g.head.x + g.head.width, "the words keep to the left half").toBeLessThanOrEqual(mid);
      expect(g.crown!.y, "the crown comes up beside the words").toBeLessThan(g.lead.y);
      expect(g.crown!.y, "and not over the top of the section").toBeGreaterThanOrEqual(g.tree.y);
      // The lantern is whole and on screen, under the words; the caption is whole.
      expect(g.lantern!.x).toBeGreaterThanOrEqual(0);
      expect(g.lantern!.y, "the lantern hangs under the button").toBeGreaterThanOrEqual(g.button.y + g.button.height);
      expect(g.captionClipped).toBe(false);
      expect(g.caption.x + g.caption.width).toBeLessThanOrEqual(viewport.width);
      // The still life stands at the foot, on the left, inside the section.
      expect(g.vignette.y + g.vignette.height).toBeLessThanOrEqual(g.tree.y + g.tree.height);
      expect(g.vignette.x + g.vignette.width).toBeLessThan(mid - 100);
      for (const paper of g.papers) expect(overlap(g.vignette, paper), "the still life under a tag").toBe(false);
      // About 1,450px at 1024 in round 25 (two thirds of what it was); round 26
      // adds a row on top for the new growth's tag, about 2,000px.
      expect(g.tree.height, "the section's height").toBeLessThanOrEqual(2080);
      expect(g.scrollWidth).toBeLessThanOrEqual(viewport.width);
    });
  }

  for (const viewport of [SMALL, PHONE, { width: 768, height: 1024 }, TABLET, BOARD_MIN, WIDE, { width: 1920, height: 1080 }]) {
    test(`Watch it grow is under my line at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      const g = await stage(page);
      // Straight under it, on its left edge, and nothing between them.
      expect(g.button.y, "under the line").toBeGreaterThanOrEqual(g.lead.y + g.lead.height);
      expect(g.button.y - (g.lead.y + g.lead.height), "close under it").toBeLessThanOrEqual(32);
      expect(Math.abs(g.button.x - g.lead.x), "on the words' left edge").toBeLessThanOrEqual(1);
      // Above every tag: it is never on the trunk's foot again.
      for (const b of g.items) expect(g.button.y + g.button.height).toBeLessThan(b.y);
    });
  }

  test("no tag clips its text at 320", async ({ page }) => {
    await page.setViewportSize(SMALL);
    await open(page);
    const papers = page.locator("[data-hanging-tags] [data-manila]");
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

  test("a tag lands on its page of the Diary", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await page.locator('[data-hanging-tags] a[href="#journey-entry-schaeffler"]').click();
    expect(Math.abs((await restingTop(row(page, "schaeffler"))) - ROW_TOP)).toBeLessThanOrEqual(2);
    expect(await inBook(page, "schaeffler"), "the book is on another page").toBe(true);
  });

  test("the stub lands on DoorDash's page, where its case study was", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await page.locator('[data-hanging-tags] a[href="#work-dd-feasibility-agent"]').click();
    // The case study is not drawn any more (round 23); its id is a real, zero-height
    // element at the top of DoorDash's page, at the header offset.
    const study = page.locator("#work-dd-feasibility-agent");
    expect(Math.abs((await restingTop(study)) - ROW_TOP)).toBeLessThanOrEqual(2);
    await expect(page.locator("#journey-entry-doordash #work-dd-feasibility-agent")).toHaveCount(1);
    expect(await inBook(page, "doordash"), "the book is on another page").toBe(true);
  });

  for (const viewport of [WIDE, PHONE]) {
    test(`the hero's Read this part lands DoorDash's page at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      await page.locator('#about button[id$="-front"]').filter({ hasText: "DoorDash" }).click();
      const read = page.locator('#about [id$="-back"]').nth(3).getByRole("link", { name: "Read this part" });
      await expect(read).toHaveAttribute("href", "#journey-entry-doordash");
      await read.click();
      expect(Math.abs((await restingTop(row(page, "doordash"))) - ROW_TOP)).toBeLessThanOrEqual(2);
      expect(await inBook(page, "doordash"), "the book is on another page").toBe(true);
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
        // Every weather the show stamps on the section, in order.
        const seen: string[] = [];
        (window as unknown as { weathers: string[] }).weathers = seen;
        new MutationObserver(() => {
          const now = document.getElementById("tree")?.getAttribute("data-weather");
          if (now && seen.at(-1) !== now) seen.push(now);
        }).observe(document.getElementById("tree")!, { attributes: true, attributeFilter: ["data-weather"] });
      });
      await watch(page).click();
      await expect(page.locator("#tree")).toHaveAttribute("data-growing", "");
      const skip = page.locator("#tree").getByRole("button", { name: journey.skip });
      await expect(skip).toBeFocused();
      await expect(page.locator("[data-grow-caption]")).toBeVisible();
      // A tag waits for its year, hidden, so it is never a link to nowhere.
      await expect(items(page).last()).toBeHidden();
      // The weather is only ever decoration: out of the tree, and it takes no clicks.
      const layer = page.locator("#tree [data-weather-layer]");
      await expect(layer).toHaveAttribute("aria-hidden", "true");
      expect(await layer.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
      await expect(page.locator("#tree [data-lich]")).toBeVisible();
      await expect(page.locator("#tree")).not.toHaveAttribute("data-growing", { timeout: 30_000 });
      // Every weather has gone with the show, and the plane came first, the UFO last.
      await expect(page.locator("#tree")).not.toHaveAttribute("data-weather");
      await expect(page.locator("#tree [data-weather-layer]")).toBeHidden();
      await expect(page.locator("#tree [data-lich]")).toHaveCount(0);
      const weathers = await page.evaluate(() => (window as unknown as { weathers: string[] }).weathers);
      expect(weathers[0]).toBe("plane");
      expect(weathers.at(-1)).toBe("ufo");
      for (const weather of ["rain", "snow", "flood", "thunderstorm", "hurricane"]) expect(weathers).toContain(weather);
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
    // Let a weather arrive, then skip: it must go with the show.
    await expect(page.locator("#tree")).toHaveAttribute("data-weather", /.+/);
    await page.locator("#tree").getByRole("button", { name: journey.skip }).click();
    await expect(page.locator("#tree")).not.toHaveAttribute("data-growing");
    await expect(page.locator("#tree")).not.toHaveAttribute("data-weather");
    await expect(page.locator("#tree [data-weather-layer]")).toBeHidden();
    for (const li of await items(page).all()) await expect(li).toBeVisible();
  });

  test("no weather shape covers a word, and the lịch and the caption never overlap", async ({ page }) => {
    await open(page);
    await watch(page).click();
    // The rain beat: the clouds are up.
    await expect(page.locator("#tree")).toHaveAttribute("data-weather", "rain", { timeout: 6_000 });
    await expect(page.locator("[data-grow-caption]")).toContainText("rain");
    const rects = await page.evaluate(() => {
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { l: r.left, t: r.top, r: r.right, b: r.bottom };
      };
      const tree = document.getElementById("tree")!;
      const words = [
        tree.querySelector("h2"),
        tree.querySelector("h2")?.parentElement?.querySelector("p"),
        tree.querySelector("[data-grow] button"),
        tree.querySelector("[data-grow-caption]"),
        tree.querySelector("[data-lich]"),
      ].filter((el): el is Element => !!el);
      return {
        words: words.map(box),
        clouds: [...tree.querySelectorAll(".wx-cloud")].map(box),
        lich: box(tree.querySelector("[data-lich]")!),
        caption: box(tree.querySelector("[data-grow-caption]")!),
      };
    });
    const meets = (a: { l: number; t: number; r: number; b: number }, b: typeof a) =>
      a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
    expect(meets(rects.lich, rects.caption)).toBe(false);
    for (const cloud of rects.clouds) {
      for (const word of rects.words) expect(meets(cloud, word), JSON.stringify({ cloud, word })).toBe(false);
    }
  });

  test("Escape ends the show too, weather and calendar with it", async ({ page }) => {
    await open(page);
    await watch(page).click();
    await expect(page.locator("#tree")).toHaveAttribute("data-weather", /.+/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#tree")).not.toHaveAttribute("data-growing");
    await expect(page.locator("#tree")).not.toHaveAttribute("data-weather");
    await expect(page.locator("#tree [data-lich]")).toHaveCount(0);
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

  /* Bé Nhi's swing (round 22). */
  for (const viewport of [WIDE, PHONE]) {
    test(`Bé Nhi swings clear of the tags at ${viewport.width}, and a press changes her mood`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      const swing = page.locator("#tree [data-swing]");
      await swing.scrollIntoViewIfNeeded();
      const nhi = swing.getByRole("button", { name: `${journey.swing.name}, ${journey.swing.action}` });
      await expect(nhi).toBeVisible();
      const box = (await nhi.boundingBox())!;
      expect(box.width, "target width").toBeGreaterThanOrEqual(44);
      expect(box.height, "target height").toBeGreaterThanOrEqual(44);
      const ride = (await swing.boundingBox())!;
      const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      for (const li of await items(page).all()) expect(overlaps(ride, (await li.boundingBox())!)).toBe(false);
      if (viewport.width >= 1280) {
        // Between the lantern and the trunk, clear of Watch it grow (under my
        // line since round 25; it used to sit below her, on the trunk's foot).
        const lantern = (await page.locator("#tree [data-scenery] [data-grow-late]").boundingBox())!;
        expect(ride.x).toBeGreaterThanOrEqual(lantern.x + lantern.width);
        expect(overlaps(ride, (await watch(page).boundingBox())!)).toBe(false);
      }
      const caption = swing.locator("p", { hasText: `${journey.swing.name},` }).last();
      const moods = new Set([await caption.textContent()]);
      for (let i = 0; i < 4; i++) {
        const before = await caption.textContent();
        await nhi.click();
        await expect(caption).not.toHaveText(before!);
        moods.add(await caption.textContent());
      }
      expect(moods.size).toBeGreaterThanOrEqual(3);
      await expect(swing.locator("[aria-live]")).toContainText(journey.swing.name);
    });
  }

  test("reduced motion: Bé Nhi still changes her mood, and the swing stays still", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    const swing = page.locator("#tree [data-swing]");
    await swing.scrollIntoViewIfNeeded();
    const caption = swing.locator("p", { hasText: `${journey.swing.name},` }).last();
    const before = await caption.textContent();
    await swing.getByRole("button").click();
    await expect(caption).not.toHaveText(before!);
    expect(await swing.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  });

  /* Bé Nhi's act, "Hả?" (round 24). */
  const nhiFace = (page: Page) => page.locator("#tree [data-swing] svg[data-nhi]");
  const nhiCaption = (page: Page) => page.locator("#tree [data-swing] p", { hasText: `${journey.swing.name},` }).last();
  /** Her head group's rotation in degrees, from its computed transform. */
  const headTilt = (page: Page) =>
    page.locator("#tree [data-swing] [data-nhi-head]").first().evaluate((el) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return Math.round(Math.atan2(m.b, m.a) * (180 / Math.PI));
    });

  for (const viewport of [WIDE, PHONE]) {
    test(`a press that wakes Bé Nhi is her "Hả?" act at ${viewport.width}: tilted head, her line, surprised`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page, "night");
      const swing = page.locator("#tree [data-swing]");
      await swing.scrollIntoViewIfNeeded();
      // At night she is asleep.
      await expect(nhiFace(page)).toHaveAttribute("data-nhi", "sleepy");
      await swing.getByRole("button").click();
      await expect(nhiFace(page)).toHaveAttribute("data-nhi", "huh");
      await expect(nhiCaption(page)).toHaveText(`${journey.swing.name}, surprised`);
      await expect(swing.locator("[data-says]")).toHaveText("Hả?");
      await expect(swing.locator("[aria-live]")).toHaveText(`Hả? ${journey.swing.name} is surprised.`);
      // Her head ends tilted about 13 degrees, once the snap has settled.
      await expect.poll(() => headTilt(page)).toBe(-13);
      // The cupped hand and the strokes are drawn; the target is still 44px.
      await expect(swing.locator("[data-nhi-burst]")).toHaveCount(1);
      const box = (await swing.getByRole("button").boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      // Nothing about the swing spills sideways.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test("the act snaps (the swing checks, the head overshoots) and then every animation ends", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page, "night");
    const swing = page.locator("#tree [data-swing]");
    await swing.scrollIntoViewIfNeeded();
    await swing.getByRole("button").click();
    // Right away: the head's snap and the swing's check are both running.
    const names = await swing.evaluate((el) => el.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName || "waapi"));
    expect(names).toContain("nhi-snap");
    expect(names).toContain("waapi");
    // ...and well inside a second they are over (the bubble's pop and the check included).
    await expect.poll(() => swing.evaluate((el) => el.getAnimations({ subtree: true }).length), { timeout: 2_000 }).toBe(0);
  });

  test("reduced motion: the act is its end pose and her line, and nothing moves", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, "night");
    const swing = page.locator("#tree [data-swing]");
    await swing.scrollIntoViewIfNeeded();
    await swing.getByRole("button").click();
    await expect(nhiFace(page)).toHaveAttribute("data-nhi", "huh");
    await expect(swing.locator("[data-says]")).toHaveText("Hả?");
    // The end pose, at once: the tilt is there with no animation to get there.
    expect(await headTilt(page)).toBe(-13);
    expect(await swing.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  });

  test("the theme turning is a double take, and then it is evening (or morning)", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page, "day");
    const swing = page.locator("#tree [data-swing]");
    await swing.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const seen: string[] = [];
      (window as unknown as { nhiFaces: string[] }).nhiFaces = seen;
      const face = document.querySelector("#tree [data-swing] svg[data-nhi]")!;
      seen.push(face.getAttribute("data-nhi")!);
      new MutationObserver(() => {
        const now = document.querySelector("#tree [data-swing] svg[data-nhi]")!.getAttribute("data-nhi")!;
        if (seen.at(-1) !== now) seen.push(now);
      }).observe(document.querySelector("#tree [data-swing]")!, { subtree: true, attributes: true, attributeFilter: ["data-nhi"] });
    });
    await page.evaluate(() => (document.documentElement.dataset.theme = "night"));
    await expect(nhiFace(page)).toHaveAttribute("data-nhi", "huh");
    await expect(nhiFace(page)).toHaveAttribute("data-nhi", "sleepy", { timeout: 4_000 });
    const faces = await page.evaluate(() => (window as unknown as { nhiFaces: string[] }).nhiFaces);
    expect(faces.slice(-2)).toEqual(["huh", "sleepy"]);
  });

  test("at the thunderclap in Watch it grow she startles, and the clap lands on the bolt", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(WIDE);
    await open(page, "day");
    await page.evaluate(() => {
      const times: Record<string, number> = {};
      (window as unknown as { nhiTimes: Record<string, number> }).nhiTimes = times;
      document.addEventListener("origin-story-beat", (event) => {
        const weather = (event as CustomEvent<{ weather: string }>).detail.weather;
        if (weather === "thunderstorm" && times.beat === undefined) times.beat = performance.now();
      });
      new MutationObserver(() => {
        const face = document.querySelector("#tree [data-swing] svg[data-nhi]")!.getAttribute("data-nhi");
        if (face === "huh" && times.beat !== undefined && times.huh === undefined) times.huh = performance.now();
      }).observe(document.querySelector("#tree [data-swing]")!, { subtree: true, attributes: true, attributeFilter: ["data-nhi"] });
    });
    await toTree(page);
    await watch(page).click();
    await expect(page.locator("#tree")).toHaveAttribute("data-weather", "thunderstorm", { timeout: 20_000 });
    await expect(nhiFace(page)).toHaveAttribute("data-nhi", "huh", { timeout: 3_000 });
    const { beat, huh } = await page.evaluate(() => (window as unknown as { nhiTimes: Record<string, number> }).nhiTimes);
    // The bolt strikes 47% into a 1.6s beat: about 750ms.
    expect(huh - beat).toBeGreaterThan(600);
    expect(huh - beat).toBeLessThan(1000);
    await expect(nhiCaption(page)).toHaveText(`${journey.swing.name}, surprised`);
    // The show over, she hugs it, and the act never lingers past it.
    await expect(nhiFace(page)).toHaveAttribute("data-nhi", "hug", { timeout: 20_000 });
  });

  test("tags link to rows that exist", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    for (const href of await tagLinks(page).evaluateAll((els) => els.map((el) => el.getAttribute("href")!))) {
      await expect(page.locator(href), href).toHaveCount(1);
    }
  });
});
