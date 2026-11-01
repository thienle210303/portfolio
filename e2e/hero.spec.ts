import { test, expect, type Page } from "@playwright/test";
import { careerEntries, hero, profile } from "../src/content/portfolio";
import { buildFieldTag } from "../src/lib/hero";

// Round 21 Phase 3: the clothesline hero. My words, four chapter tags that turn
// over to my line about each chapter, my field tag, the scenery behind.
// Each test pins its own viewport rather than running per project.

const WIDE = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
const PLACES = ["Kiên Giang", "Taylors", "USC", "DoorDash"];
const PRIMARY = "See what I've built";
// The test server runs without BOOKING_URL, so the quiet action names the postcard.
const QUIET = "Send me a postcard";

async function open(page: Page, theme: "day" | "night" = "day") {
  await page.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

const fronts = (page: Page) => page.locator('#about button[id$="-front"]');
const backs = (page: Page) => page.locator('#about [id$="-back"]');
const front = (page: Page, place: string) => fronts(page).filter({ hasText: place });
const back = (page: Page, i: number) => backs(page).nth(i);
const fieldTag = (page: Page) => page.locator('#about [data-hero-step="field-tag"]');
/** The field tag's paper, the box a visitor sees. */
const fieldPaper = (page: Page) => fieldTag(page).locator("..");
const sky = (page: Page) => page.locator('#about [data-scenery="hero"] > span.scene-art').first();

/** Describes the focused element: a tag front by its place, anything else by its text. */
function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return "";
    const text = el.innerText.replace(/\s+/g, " ").trim();
    return el.id.endsWith("-front") ? `front:${text}` : text;
  });
}

const eastsideHeadline = careerEntries.find((e) => e.id === "eastside-high")!.headline!;

test.describe("hero", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-1440", "pins its own viewports; run once");
  });

  for (const viewport of [WIDE, PHONE]) {
    test(`headline, my paragraph and two actions at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      await expect(page.locator("#about h1")).toHaveText(profile.headline);
      // The owner's ruling (2026-10-19) adds `hero.invitation` after the positioning.
      await expect(page.locator('#about [data-hero-step="intro"]')).toHaveText(
        `${profile.positioning} ${hero.invitation}`,
      );
      await expect(page.getByRole("link", { name: PRIMARY })).toHaveAttribute("href", "#tree");
      await expect(page.getByRole("link", { name: QUIET })).toHaveAttribute("href", "#contact");
    });
  }

  test("hero has no margin rail", async ({ page }) => {
    await open(page);
    await expect(page.locator("#about .rail, #about .rail-layout")).toHaveCount(0);
  });

  test("the tags turn over, one at a time", async ({ page }) => {
    await open(page);
    const kien = front(page, "Kiên Giang");
    await kien.click();
    await expect(kien).toHaveAttribute("aria-expanded", "true");
    await expect(back(page, 0).getByText("Where I start")).toBeVisible();
    const read = back(page, 0).getByRole("link", { name: "Read this part" });
    await expect(read).toBeVisible();
    await expect(read).toHaveAttribute("href", "#tree");

    // Kiên Giang's front is inert while it is open; DoorDash's is not.
    await front(page, "DoorDash").click();
    await expect(kien).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#about").getByRole("button", { expanded: true })).toHaveCount(1);
  });

  test("focus follows the turn, by keyboard", async ({ page }) => {
    await open(page);
    const taylors = front(page, "Taylors");
    await taylors.focus();
    await page.keyboard.press("Enter");
    await expect(taylors).toHaveAttribute("aria-expanded", "true");
    await expect.poll(() => focused(page)).toContain(eastsideHeadline);
    await page.keyboard.press("Tab");
    expect(await focused(page)).toBe("Read this part");
    await page.keyboard.press("Escape");
    await expect(taylors).toHaveAttribute("aria-expanded", "false");
    await expect(taylors).toBeFocused();
  });

  test("with a tag open, Tab runs line → Read this part → the next front, and never lands on the open front", async ({
    page,
  }) => {
    await open(page);
    await front(page, "Kiên Giang").click();
    await expect.poll(() => focused(page)).toContain(hero.chapterLines.origin);
    await page.keyboard.press("Tab");
    expect(await focused(page)).toBe("Read this part");
    await page.keyboard.press("Tab");
    expect(await focused(page)).toMatch(/^front:.*Taylors$/);

    await back(page, 0).getByRole("button").focus();
    await page.keyboard.press("Shift+Tab");
    expect(await focused(page)).toBe(QUIET);
  });

  test("after a turn, the focused element has a box and is visible", async ({ page }) => {
    await open(page);
    const kien = front(page, "Kiên Giang");
    await kien.click();
    await page.waitForTimeout(1000); // the turn (--dur-settle) finishes
    const opened = await page.evaluate(() => {
      const el = document.activeElement!;
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, visible: el.checkVisibility(), inBack: !!el.closest('[id$="-back"]') };
    });
    expect(opened).toEqual({ w: expect.any(Number), h: expect.any(Number), visible: true, inBack: true });
    expect(opened.w * opened.h).toBeGreaterThan(0);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);
    const closed = await page.evaluate(() => {
      const el = document.activeElement!;
      const r = el.getBoundingClientRect();
      return { area: r.width * r.height, visible: el.checkVisibility(), front: el.id.endsWith("-front") };
    });
    expect(closed.area).toBeGreaterThan(0);
    expect(closed.visible).toBe(true);
    expect(closed.front).toBe(true);
  });

  test("the switch path: Enter on another front opens it and closes the first", async ({ page }) => {
    await open(page);
    const kien = front(page, "Kiên Giang");
    await kien.click();
    await expect.poll(() => focused(page)).toContain(hero.chapterLines.origin);
    for (let i = 0; i < 4; i++) await page.keyboard.press("Tab"); // Read this part, Taylors, USC, DoorDash
    expect(await focused(page)).toMatch(/^front:.*DoorDash$/);
    await page.keyboard.press("Enter");
    await expect.poll(() => focused(page)).toContain(hero.chapterLines.doordash);
    await expect(kien).toHaveAttribute("aria-expanded", "false");
  });

  test("Escape outside the open tag does nothing", async ({ page }) => {
    await open(page);
    const kien = front(page, "Kiên Giang");
    await kien.click();
    await page.getByRole("link", { name: PRIMARY }).focus();
    await page.keyboard.press("Escape");
    await expect(kien).toHaveAttribute("aria-expanded", "true");
  });

  for (const viewport of [PHONE, WIDE]) {
  test(`on the back, the line and the link keep their whole focus ring inside the paper at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    for (let i = 0; i < PLACES.length; i++) {
      await front(page, PLACES[i]).click();
      // Offsets are layout boxes, so the tilt and the turn do not skew them.
      const boxes = await back(page, i).evaluate((face) => {
        const paper = face.querySelector<HTMLElement>(".tag-cut")!;
        return [...face.querySelectorAll<HTMLElement>("button, a")].map((el) => ({
          name: el.innerText.trim().slice(0, 20),
          parent: el.offsetParent === paper,
          left: el.offsetLeft - 5,
          top: el.offsetTop - 5,
          right: el.offsetLeft + el.offsetWidth + 5,
          bottom: el.offsetTop + el.offsetHeight + 5,
          width: paper.offsetWidth,
          height: paper.offsetHeight,
          tall: el.offsetHeight,
          link: el.tagName === "A",
        }));
      });
      expect(boxes).toHaveLength(2);
      for (const b of boxes) {
        if (b.link) expect(b.tall, `${b.name}: a 44px target`).toBeGreaterThanOrEqual(44);
        expect(b.parent, b.name).toBe(true);
        expect(b.left, b.name).toBeGreaterThanOrEqual(0);
        // Clear of the 30px corner cut at its own left edge (`.tag-cut`).
        expect(b.top, `${b.name}: clear of the corner cut`).toBeGreaterThanOrEqual(30 - b.left);
        expect(b.right, b.name).toBeLessThanOrEqual(b.width);
        expect(b.bottom, b.name).toBeLessThanOrEqual(b.height);
      }
    }
  });
  }

  test("reduced motion: the tag turns without a transition", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await front(page, "USC").click();
    const duration = await page
      .locator("#about [data-flip]")
      .nth(2)
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    const ms = Math.max(
      ...duration.split(",").map((d) => (d.trim().endsWith("ms") ? parseFloat(d) : parseFloat(d) * 1000)),
    );
    expect(ms).toBeLessThanOrEqual(0.01);
    expect(await back(page, 2).evaluate((el) => el.checkVisibility())).toBe(true);
    await expect(back(page, 2).getByRole("link", { name: "Read this part" })).toBeVisible();
  });

  for (const theme of ["day", "night"] as const) {
    test(`focus is visible on every tag, the QR link and both actions, by ${theme}`, async ({ page }) => {
      await open(page, theme);
      await page.getByRole("link", { name: PRIMARY }).focus();
      await page.keyboard.press("Shift+Tab");
      const seen: string[] = [];
      for (let i = 0; i < 7; i++) {
        await page.keyboard.press("Tab");
        const state = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const s = getComputedStyle(el);
          return {
            inAbout: !!el.closest("#about"),
            outline: s.outlineStyle,
            width: parseFloat(s.outlineWidth),
            clip: s.clipPath,
          };
        });
        const name = await focused(page);
        seen.push(name);
        expect(state.inAbout, name).toBe(true);
        expect(state.outline, name).not.toBe("none");
        expect(state.width, name).toBeGreaterThanOrEqual(2);
        expect(state.clip, name).toBe("none");
      }
      expect(seen.map((s) => s.replace(/^front:\S+( \d{4})? /, "front:"))).toEqual([
        PRIMARY,
        QUIET,
        ...PLACES.map((p) => `front:${p}`),
        "My LinkedIn (opens in a new tab)",
      ]);
    });
  }

  for (const width of [390, 768, 1024, 1280, 1440]) {
    test(`nothing sits on top of a control at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page);
      const hidden = () =>
        page.evaluate(() => {
          const misses: string[] = [];
          for (const el of document.querySelectorAll<HTMLElement>("#about a, #about button")) {
            if (!el.checkVisibility() || el.closest("[inert]")) continue;
            el.scrollIntoView({ block: "center" });
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            if (!hit || !el.contains(hit)) {
              misses.push(`${el.innerText.trim().slice(0, 24)} ← ${hit?.tagName}.${String(hit?.className).slice(0, 40)}`);
            }
          }
          return misses;
        });
      expect(await hidden()).toEqual([]);
      for (const place of PLACES) {
        await front(page, place).click();
        expect(await hidden(), `with ${place} open`).toEqual([]);
      }
    });
  }

  test("layout at 1440: the line above the text, my field tag to the right", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    const h1 = (await page.locator("#about h1").boundingBox())!;
    const tags = await page.locator('#about [data-hero-step="line"] > li').evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect),
    );
    expect(tags).toHaveLength(4);
    for (const t of tags) expect(t.bottom).toBeLessThan(h1.y);
    const field = (await fieldPaper(page).boundingBox())!;
    expect(field.x).toBeGreaterThanOrEqual(tags[3].right);
    expect(Math.abs(field.y - tags[0].top)).toBeLessThanOrEqual(40);
  });

  for (const viewport of [{ width: 320, height: 568 }, PHONE, { width: 600, height: 960 }, { width: 768, height: 1024 }, { width: 1023, height: 768 }]) {
    test(`layout at ${viewport.width}: text, then the tags down the line, then my field tag`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page);
      const m = await page.evaluate(() => {
        const rect = (el: Element) => el.getBoundingClientRect().toJSON() as DOMRect;
        const line = document.querySelector('#about [data-scenery="phone-line"] [data-line]')!;
        const lis = [...document.querySelectorAll<HTMLElement>('#about [data-hero-step="line"] > li')];
        const tags = lis.map((li) => {
          // The tilt turns each tag about its string's end; measure with it lifted.
          const rotate = li.style.rotate;
          li.style.rotate = "none";
          const r = rect(li);
          li.style.rotate = rotate;
          const s = getComputedStyle(li, "::before");
          return {
            box: r,
            // Left-hand tags tie on at their right; right-hand ones at their left.
            ends: { right: r.right - parseFloat(s.right), left: r.left + parseFloat(s.left) },
            y: r.top + parseFloat(s.top),
            peg: getComputedStyle(li, "::after").backgroundImage,
          };
        });
        const field = document.querySelector('#about [data-hero-step="field-tag"]')!.parentElement!.parentElement!;
        return {
          shown: line.checkVisibility(),
          line: rect(line),
          tags,
          fronts: [...document.querySelectorAll('#about button[id$="-front"]')].map(rect),
          h1: rect(document.querySelector("#about h1")!),
          actions: rect(document.querySelector('#about [data-hero-step="meta-actions"]')!),
          hint: rect(document.querySelector('#about [data-hero-step="line"] + p')!),
          field: rect(field),
          fieldPaper: rect(field.firstElementChild!),
        };
      });
      expect(m.shown).toBe(true);
      const x = m.line.left + m.line.width / 2;
      expect(m.h1.bottom).toBeLessThan(m.actions.top);
      expect(m.actions.bottom).toBeLessThan(m.line.top);
      expect(m.tags).toHaveLength(4);
      m.tags.forEach((t, i) => {
        const left = i % 2 === 0;
        // Alternating sides, each clear of the line.
        if (left) expect(t.box.right, `tag ${i}`).toBeLessThan(x);
        else expect(t.box.left, `tag ${i}`).toBeGreaterThan(x);
        const end = left ? t.ends.right : t.ends.left;
        expect(Math.abs(end - x), `tag ${i}'s string`).toBeLessThanOrEqual(3);
        expect(t.y, `tag ${i}'s string`).toBeGreaterThanOrEqual(m.line.top);
        expect(t.y, `tag ${i}'s string`).toBeLessThanOrEqual(m.line.bottom);
        expect(t.peg, `tag ${i}'s clothespin`).toContain("clothespin.svg");
        if (i > 0) expect(t.box.top, `tag ${i} hangs below tag ${i - 1}`).toBeGreaterThan(m.tags[i - 1].box.top);
        if (i > 1) expect(t.box.top, `tag ${i} clears tag ${i - 2}`).toBeGreaterThan(m.tags[i - 2].box.bottom);
      });
      for (const f of m.fronts) {
        expect(f.width).toBeGreaterThanOrEqual(44);
        expect(f.height).toBeGreaterThanOrEqual(44);
      }
      // The hint sits beside the last tag, left of the line, under the third.
      const [, , third, last] = m.tags.map((t) => t.box);
      expect(m.hint.right).toBeLessThan(x);
      expect(m.hint.top).toBeGreaterThan(third.bottom);
      expect(m.hint.bottom).toBeLessThanOrEqual(last.bottom + 1);
      // My field tag hangs from the line's foot, centred under it, below the last tag.
      expect(m.fieldPaper.top).toBeGreaterThan(last.bottom);
      expect(Math.abs(m.field.top - m.line.bottom)).toBeLessThanOrEqual(3);
      expect(Math.abs(m.field.left + m.field.width / 2 - x)).toBeLessThanOrEqual(3);
    });
  }

  for (const viewport of [{ width: 360, height: 740 }, PHONE, { width: 460, height: 900 }, { width: 768, height: 1024 }]) {
    test(`below 1024 the line's scenery clears the words and the actions at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page);
      const hits = await page.evaluate(() => {
        const words = [
          ...document.querySelectorAll<HTMLElement>("#about [data-hero-identity] :is(h1, p, a, button)"),
          document.querySelector<HTMLElement>('#about [data-hero-step="line"] + p')!,
        ];
        const pieces = [...document.querySelectorAll<HTMLElement>('#about [data-scenery="phone-line"] > :not([data-line])')];
        const out: string[] = [];
        for (const w of words) {
          // The ink, not the block: the h1 and the intro are full-width boxes.
          const range = document.createRange();
          range.selectNodeContents(w);
          const a = range.getBoundingClientRect();
          for (const p of pieces) {
            const b = p.getBoundingClientRect();
            if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
              out.push(`${w.tagName}:${w.innerText.slice(0, 20)} × ${p.getAttribute("data-scenery") ?? p.tagName}`);
            }
          }
        }
        return { out, pieces: pieces.length };
      });
      expect(hits.pieces).toBe(3);
      expect(hits.out).toEqual([]);
    });
  }

  test("no tag clips its text at 320", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await open(page);
    const clipped = (face: ReturnType<typeof back>) =>
      face.locator(".tag-cut").evaluate((paper) => paper.scrollHeight - paper.clientHeight);
    for (let i = 0; i < PLACES.length; i++) {
      expect(await clipped(fronts(page).nth(i)), `${PLACES[i]} front`).toBeLessThanOrEqual(1);
      await front(page, PLACES[i]).click();
      expect(await clipped(back(page, i)), `${PLACES[i]} back`).toBeLessThanOrEqual(1);
    }
  });

  test("a tag open at 320 does not widen the page", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await open(page);
    for (const place of PLACES) {
      await front(page, place).click();
      await page.waitForTimeout(600);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `with ${place} open`).toBeLessThanOrEqual(1);
    }
  });

  test("print with a tag open shows only the fronts", async ({ page }) => {
    await open(page);
    await front(page, "Kiên Giang").click();
    await page.emulateMedia({ media: "print" });
    for (let i = 0; i < PLACES.length; i++) {
      await expect(back(page, i)).toBeHidden();
      await expect(fronts(page).nth(i)).toBeVisible();
    }
    expect(await page.locator("#about [data-flip]").first().evaluate((el) => getComputedStyle(el).transform)).toBe(
      "none",
    );
  });

  for (const width of [1024, 1279, 1280, 1440, 1920]) {
    test(`every string meets the clothesline within 3px at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page);
      const gaps = await page.evaluate(() => {
        const path = document.querySelector<SVGPathElement>('#about [data-scenery="hero"] svg path')!;
        const ctm = path.getScreenCTM()!;
        const total = path.getTotalLength();
        // x is monotonic along the curve, so bisect on length for the screen x.
        function lineY(x: number): number {
          let lo = 0;
          let hi = total;
          for (let i = 0; i < 40; i++) {
            const mid = (lo + hi) / 2;
            const p = path.getPointAtLength(mid).matrixTransform(ctm);
            if (p.x < x) lo = mid;
            else hi = mid;
          }
          return path.getPointAtLength(lo).matrixTransform(ctm).y;
        }
        // Each string hangs from its box's top centre, which the tilt (about
        // that same point) does not move; so measure with the tilt lifted.
        const tops = [...document.querySelectorAll<HTMLElement>('#about [data-hero-step="line"] > li')].map((li) => {
          const rotate = li.style.rotate;
          li.style.rotate = "none";
          const r = li.getBoundingClientRect();
          li.style.rotate = rotate;
          return { x: r.left + r.width / 2, y: r.top };
        });
        const holder = document.querySelector('#about [data-hero-step="field-tag"]')!.parentElement!.parentElement!;
        const f = holder.getBoundingClientRect();
        tops.push({ x: f.left + f.width / 2, y: f.top });
        return tops.map((t) => Math.round((t.y - lineY(t.x)) * 10) / 10);
      });
      expect(gaps).toHaveLength(5);
      for (const gap of gaps) expect(Math.abs(gap), `gaps ${gaps.join(", ")}`).toBeLessThanOrEqual(3);
    });
  }

  for (const width of [1440, 1920]) {
    test(`no scenery piece covers the words or the actions at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page);
      const hits = await page.evaluate(() => {
        const words = [...document.querySelectorAll<HTMLElement>("#about [data-hero-identity] :is(h1, p, a, button)")];
        const pieces = [...document.querySelectorAll<HTMLElement>('#about [data-scenery="hero"] > *')].filter(
          // The sky is the backdrop of the whole hero, not a piece on it.
          (el, i) => i > 0 && el.checkVisibility(),
        );
        const out: string[] = [];
        for (const w of words) {
          const a = w.getBoundingClientRect();
          for (const p of pieces) {
            const b = p.getBoundingClientRect();
            if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
              out.push(`${w.tagName} × ${p.tagName}.${String(p.getAttribute("class")).slice(0, 40)}`);
            }
          }
        }
        return { out, words: words.length };
      });
      expect(hits.words).toBeGreaterThanOrEqual(4);
      expect(hits.out).toEqual([]);
    });
  }

  for (const width of [1024, 1180, 1280, 1366, 1439]) {
    test(`the line hangs from the bamboo and the pine at ${width}, and the bamboo clears the words`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      const m = await page.evaluate(() => {
        const box = (sel: string) => document.querySelector<HTMLElement>(sel)!.getBoundingClientRect();
        const shown = (sel: string) => document.querySelector<HTMLElement>(sel)!.checkVisibility();
        const words = [...document.querySelectorAll<HTMLElement>("#about [data-hero-identity] :is(h1, p, a, button)")];
        const hint = document.querySelector<HTMLElement>('#about [data-hero-step="line"] + p')!;
        const svg = document.querySelector('#about [data-scenery="hero"] svg')!.getBoundingClientRect();
        return {
          bamboo: shown('#about [data-scenery="bamboo"]'),
          pine: shown('#about [data-scenery="pine"]'),
          // The stem is x 64–80 of the bamboo's 140px box.
          stemRight: box('#about [data-scenery="bamboo"]').left + 80,
          stemTop: box('#about [data-scenery="bamboo"]').top,
          pineTop: box('#about [data-scenery="pine"]').top,
          lineTop: svg.top,
          wordsLeft: Math.min(hint.getBoundingClientRect().left, ...words.map((w) => w.getBoundingClientRect().left)),
        };
      });
      expect(m.bamboo && m.pine).toBe(true);
      expect(m.stemRight).toBeLessThanOrEqual(m.wordsLeft - 8);
      // Both poles rise above the line, so it is tied to something at each end.
      expect(m.stemTop).toBeLessThan(m.lineTop);
      expect(m.pineTop).toBeLessThan(m.lineTop);
    });
  }

  for (const width of [1024, 1100, 1180, 1279]) {
    test(`no chapter place wraps, and the pine stands clear of my field tag, at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      const m = await page.evaluate(() => {
        const places = [...document.querySelectorAll<HTMLElement>('#about button[id$="-front"] span.font-semibold')];
        const lines = places.map((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          return range.getClientRects().length;
        });
        const tag = document.querySelector('#about [data-hero-step="field-tag"]')!.parentElement!.getBoundingClientRect();
        const pine = document.querySelector<HTMLElement>('#about [data-scenery="pine"]')!.getBoundingClientRect();
        // The pine's trunk is 96px into its 180px box (Scenery.tsx).
        return { lines, tagRight: tag.right, trunk: pine.left + 96 };
      });
      expect(m.lines.length).toBeGreaterThanOrEqual(4);
      for (const n of m.lines) expect(n, "each place is one line").toBe(1);
      expect(m.trunk).toBeGreaterThanOrEqual(m.tagRight);
    });
  }

  for (const width of [320, 360, 390, 414, 600, 768, 844, 1023, 1024, 1366, 1439, 1440, 1920]) {
    test(`the nón lá hangs wherever the bamboo shows, at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      const m = await page.evaluate(() => {
        const shown = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].some((el) => el.checkVisibility());
        return {
          bamboo: shown('#about [data-scenery="bamboo"], #about [data-scenery="bamboo-phone"]'),
          hat: shown('#about [data-scenery="non-la"]'),
        };
      });
      expect(m.bamboo).toBe(true);
      expect(m.hat).toBe(true);
    });
  }

  for (const size of [
    { width: 1024, height: 768 },
    { width: 1366, height: 768 },
    { width: 844, height: 390 },
  ]) {
    test(`the headline and the primary action make the first screen at ${size.width}×${size.height}`, async ({ page }) => {
      await page.setViewportSize(size);
      await open(page);
      const h1 = (await page.locator("#about h1").boundingBox())!;
      const primary = (await page.getByRole("link", { name: PRIMARY }).boundingBox())!;
      expect(h1.y + h1.height).toBeLessThanOrEqual(size.height);
      expect(primary.y + primary.height).toBeLessThanOrEqual(size.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    });
  }

  for (const size of [{ width: 320, height: 568 }, { width: 340, height: 700 }, { width: 360, height: 740 }, PHONE, { width: 414, height: 896 }, { width: 600, height: 960 }, { width: 768, height: 1024 }, { width: 844, height: 390 }]) {
    for (const theme of ["day", "night"] as const) {
      test(`the ${theme === "day" ? "sun" : "moon"} stays off the headline at ${size.width}×${size.height}`, async ({ page }) => {
        await page.setViewportSize(size);
        await open(page, theme);
        // The sky is one background image; its disc is drawn at (880, 120),
        // radius 32 (the sun; the moon is 30), on a 1440px-wide sky. Map that
        // through the span's computed background-position to the page.
        const disc = await sky(page).evaluate((el) => {
          const box = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const width = 1440;
          const height = (1440 * 900) / 1440;
          const axis = (value: string, room: number) => {
            // Below 1024 the computed value is `calc(100% + 520px)` (a `right`
            // offset), which has to be read, not split.
            const calc = /^calc\((-?[\d.]+)%\s*([+-])\s*([\d.]+)px\)$/.exec(value.trim());
            if (calc) return (room * parseFloat(calc[1])) / 100 + (calc[2] === "-" ? -1 : 1) * parseFloat(calc[3]);
            const parts = value.trim().split(/\s+/);
            const len = (v: string) => (v.endsWith("%") ? (room * parseFloat(v)) / 100 : parseFloat(v));
            if (parts.length === 2) return parts[0] === "right" || parts[0] === "bottom" ? room - len(parts[1]) : len(parts[1]);
            if (parts[0] === "center") return room / 2;
            if (parts[0] === "right" || parts[0] === "bottom") return room;
            if (parts[0] === "left" || parts[0] === "top") return 0;
            return len(parts[0]);
          };
          const x = box.left + axis(cs.backgroundPositionX, box.width - width) + 880;
          const y = box.top + axis(cs.backgroundPositionY, box.height - height) + 120;
          return { left: x - 32, right: x + 32, top: y - 32, bottom: y + 32 };
        });
        for (const sel of ["#about h1", '#about [data-hero-step="intro"]', '#about [data-hero-step="meta-actions"]']) {
          // The ink, line by line: the h1 and the intro are full-width boxes,
          // and the union of their lines covers the corner a short line leaves.
          const lines = await page.locator(sel).evaluate((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            return [...range.getClientRects()].map((r) => ({ x: r.left, y: r.top, width: r.width, height: r.height }));
          });
          const overlaps = lines.some(
            (b) => disc.left < b.x + b.width && b.x < disc.right && disc.top < b.y + b.height && b.y < disc.bottom,
          );
          expect(overlaps, `${sel} vs disc ${JSON.stringify(disc)}`).toBe(false);
        }
      });
    }
  }

  /** The hero's live controls in DOM (= tab) order, with their boxes. */
  const controls = (page: Page) =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("#about a, #about button")]
        .filter((el) => !el.closest("[inert]"))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            name: el.id.endsWith("-front") ? "tag" : el.innerText.replace(/\s+/g, " ").trim(),
            top: r.top + window.scrollY,
            left: r.left,
          };
        }),
    );
  const TAB_ORDER = [PRIMARY, QUIET, "tag", "tag", "tag", "tag", "My LinkedIn (opens in a new tab)"];

  test("the actions come first in the tab order, then the tags, then the QR", async ({ page }) => {
    await open(page);
    expect((await controls(page)).map((c) => c.name)).toEqual(TAB_ORDER);
  });

  test("at 390 the tab order is the order on screen, top to bottom", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page);
    const seen = [...(await controls(page))].sort((a, b) => a.top - b.top || a.left - b.left);
    expect(seen.map((c) => c.name)).toEqual(TAB_ORDER);
  });

  test("at 1440 each group reads left to right in tab order, the QR last", async ({ page }) => {
    // From 1024 the grid lifts the line above the words, so top-to-bottom is
    // tags, then words; within each row the tab order runs left to right.
    await open(page);
    const c = await controls(page);
    expect(c[0].left).toBeLessThan(c[1].left);
    for (let i = 3; i < 6; i++) expect(c[i].left).toBeGreaterThan(c[i - 1].left);
    expect(c[6].left).toBeGreaterThan(Math.max(...c.slice(0, 6).map((x) => x.left)));
  });

  for (const theme of ["day", "night"] as const) {
    test(`${theme} shows the ${theme === "day" ? "sun and the phin" : "moon and the lẩu"}`, async ({ page }) => {
      await open(page, theme);
      const art = await sky(page).evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(art).toContain(theme === "day" ? "sky-day.svg" : "sky-night.svg");
      const [shown, gone] =
        theme === "day" ? [hero.vignette.morning, hero.vignette.evening] : [hero.vignette.evening, hero.vignette.morning];
      await expect(page.locator("#about").getByText(shown)).toBeVisible();
      await expect(page.locator("#about").getByText(gone)).toBeHidden();
    });
  }

  test("the toggle swaps the scene in place", async ({ page }) => {
    await open(page);
    const moon = page.locator("#about [data-moon-off-duty]");
    await expect(moon).toHaveCount(1);
    const before = await moon.boundingBox();
    await page.evaluate(() => ((window as unknown as { __stay: number }).__stay = 1));
    await page.getByRole("button", { name: "Switch to night theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
    expect(await sky(page).evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("sky-night.svg");
    await expect(page.locator("#about").getByText(hero.vignette.evening)).toBeVisible();
    await expect(page.locator("#about").getByText(hero.vignette.morning)).toBeHidden();
    expect(await page.evaluate(() => (window as unknown as { __stay?: number }).__stay)).toBe(1);
    await expect(moon).toHaveCount(1);
    expect(await moon.boundingBox()).toEqual(before);
  });

  test("the field tag reads from content", async ({ page }) => {
    await open(page);
    const t = buildFieldTag();
    const rows = await fieldTag(page)
      .locator("dl")
      .first()
      .evaluate((dl) =>
        [...dl.querySelectorAll("dt")].map((dt) => ({
          label: dt.textContent!.trim(),
          // The last two words are bound with a no-break space.
          value: dt.nextElementSibling!.textContent!.replace(/\u00a0/g, " ").trim(),
        })),
      );
    expect(rows).toEqual(t.rows.map((r) => ({ label: r.label, value: r.value })));
    const stamp = fieldTag(page).getByText(profile.motto);
    await expect(stamp).toHaveCSS("text-transform", "uppercase");
    await expect(stamp).toHaveCSS("opacity", "1");
    await expect(page.getByRole("link", { name: "My LinkedIn" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/thienle210303",
    );
  });

  test("the header sits on the sky", async ({ page }) => {
    await open(page);
    // The sky is a fixed layer under body (round 21 phase 8: iOS ignores
    // `background-attachment: fixed`); the header paints the same gradient.
    const [header, sky] = await page.evaluate(() =>
      [
        getComputedStyle(document.querySelector("header[data-site-header]")!),
        getComputedStyle(document.body, "::before"),
      ].map((s) => ({ image: s.backgroundImage, size: s.backgroundSize, position: s.position })),
    );
    expect(header.image).toBe(sky.image);
    expect(header.image).not.toBe("none");
    expect(header.size).toBe(sky.size);
    expect(sky.position).toBe("fixed");
  });
});

test.describe("hero without JavaScript", () => {
  test.use({ javaScriptEnabled: false, colorScheme: "dark" });

  test("JS off, dark scheme: the night scene", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-1440", "run once");
    await page.goto("/");
    expect(await sky(page).evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("sky-night.svg");
    await expect(page.locator("#about").getByText(hero.vignette.evening)).toBeVisible();
    await expect(page.locator("#about").getByText(hero.vignette.morning)).toBeHidden();
    await expect(fronts(page)).toHaveCount(4);
    for (const f of await fronts(page).all()) await expect(f).toBeVisible();
  });
});
