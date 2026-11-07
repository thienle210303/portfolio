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
      for (let i = 0; i < 8; i++) {
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
        "4 seedlings",
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

  // Round 25, below 1024: a line is strung between two things that stand in
  // the ground. `yard` measures what that means: the passes as drawn, where
  // each hung thing's string starts and ends, the poles, the ground band.
  const yard = (page: Page) =>
    page.evaluate(() => {
      const rect = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top + scrollY, bottom: r.bottom + scrollY, width: r.width, height: r.height };
      };
      const shown = (sel: string) => [...document.querySelectorAll<HTMLElement>(`#about ${sel}`)].filter((el) => el.checkVisibility());
      // The passes, top to bottom: each as its ends and a way to ask the
      // drawn curve for its height at a page x.
      const passes = shown("[data-yard-pass]")
        .map((svg) => {
          const path = svg.querySelector<SVGPathElement>("path")!;
          const ctm = path.getScreenCTM()!;
          const total = path.getTotalLength();
          const at = (length: number) => path.getPointAtLength(length).matrixTransform(ctm);
          // x is monotonic along the curve, so bisect on length for a page x.
          const yAt = (x: number) => {
            let lo = 0;
            let hi = total;
            for (let i = 0; i < 40; i++) {
              const mid = (lo + hi) / 2;
              if (at(mid).x < x) lo = mid;
              else hi = mid;
            }
            return at(lo).y + scrollY;
          };
          const [a, b] = [at(0), at(total)];
          return { yAt, left: { x: a.x, y: a.y + scrollY }, right: { x: b.x, y: b.y + scrollY } };
        })
        .sort((p, q) => p.left.y - q.left.y);
      // A hung thing, with its tilt lifted: the tilt turns it about the top of
      // its string, so that point does not move.
      const hung = (el: HTMLElement) => {
        const rotate = el.style.rotate;
        el.style.rotate = "none";
        const box = rect(el);
        const paper = rect(el.querySelector(".tag-cut")!);
        el.style.rotate = rotate;
        const x = box.left + box.width / 2;
        const string = parseFloat(getComputedStyle(el, "::after").height);
        return {
          box,
          paper,
          x,
          // How far the top of the string is from each pass's line at its x.
          gaps: passes.map((p) => Math.round((box.top - p.yAt(x)) * 10) / 10),
          // The string runs from the line into the hole in the paper (its
          // ring is 26px across, 5px down the paper).
          reach: box.top + string - paper.top,
          length: paper.top - box.top,
        };
      };
      const tags = shown('[data-hero-step="line"] > li').map(hung);
      const fieldHolder = document.querySelector<HTMLElement>('#about [data-yard="field"]')!;
      const about = rect(document.querySelector("#about")!);
      const ground = parseFloat(getComputedStyle(document.querySelector("#about")!).paddingBottom);
      const ink = (el: Element) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top + scrollY, bottom: r.bottom + scrollY, width: r.width, height: r.height };
      };
      return {
        width: innerWidth,
        about,
        // The ground band: the section's bottom padding, where the paddy is.
        ground: { top: about.bottom - ground, bottom: about.bottom },
        paddy: shown('[data-scenery="paddy-phone"]').map(rect)[0],
        passes: passes.map((p) => ({ left: p.left, right: p.right })),
        tags,
        field: hung(fieldHolder),
        poles: shown("[data-yard-pole]").map((el) => ({ kind: el.dataset.yardPole!, ...rect(el) })),
        tufts: shown("[data-yard-tuft]").map(rect),
        hat: shown('[data-scenery="yard"] [data-scenery="non-la"]').map(rect),
        fronts: shown('button[id$="-front"]').map(rect),
        h1: ink(document.querySelector("#about h1")!),
        intro: ink(document.querySelector('#about [data-hero-step="intro"]')!),
        actions: rect(document.querySelector('#about [data-hero-step="meta-actions"]')!),
        hint: ink(document.querySelector('#about [data-yard="hint"]')!),
        // The order things come in the DOM, which is the order they are read in.
        order: [...document.querySelectorAll<HTMLElement>("#about :is(h1, [data-hero-step='intro'], [data-hero-step='meta-actions'], [data-yard='hint'], button[id$='-front'], [data-hero-step='field-tag'])")].map(
          (el) => el.getAttribute("data-yard") ?? el.getAttribute("data-hero-step") ?? (el.tagName === "H1" ? "h1" : el.innerText.replace(/\s+/g, " ").trim()),
        ),
      };
    });
  type YardShape = Awaited<ReturnType<typeof yard>>;

  /** What holds at every width below 1024, whatever the band's arrangement. */
  function expectYard(m: YardShape, passOf: readonly number[]) {
    // DOM order is reading order: my words, the hint, 2003 → 2025, my field tag.
    expect(m.order.map((o) => o.replace(/^.*?(Kiên Giang|Taylors|USC|DoorDash)$/, "$1"))).toEqual([
      "h1",
      "intro",
      "meta-actions",
      "hint",
      ...PLACES,
      "field-tag",
    ]);
    expect(m.tags).toHaveLength(4);
    // Every string starts on its pass's line (within 2px) and ends in the
    // hole of its paper; no two strings on a pass are the same length.
    [...m.tags, m.field].forEach((t, i) => {
      expect(Math.abs(t.gaps[passOf[i]]), `string ${i} meets pass ${passOf[i] + 1} (gaps ${t.gaps.join(", ")})`).toBeLessThanOrEqual(2);
      expect(t.reach, `string ${i} reaches the hole`).toBeGreaterThanOrEqual(5);
      expect(t.reach, `string ${i} stops in the hole`).toBeLessThanOrEqual(31);
      expect(t.length, `string ${i} is a string`).toBeGreaterThanOrEqual(10);
    });
    for (const pass of new Set(passOf.slice(0, 4))) {
      const lengths = m.tags.filter((_, i) => passOf[i] === pass).map((t) => t.length);
      expect(new Set(lengths).size, `strings on pass ${pass + 1}: ${lengths.join(", ")}`).toBe(lengths.length);
    }
    // Each pass is tied to a pole at both ends and sags between them: its
    // middle hangs below the straight line from knot to knot.
    expect(m.poles).toHaveLength(2);
    const [leftPole, rightPole] = [...m.poles].sort((a, b) => a.left - b.left);
    for (const [i, pass] of m.passes.entries()) {
      expect(pass.left.x, `pass ${i + 1} starts on the left pole`).toBeGreaterThanOrEqual(leftPole.left);
      expect(pass.left.x, `pass ${i + 1} starts on the left pole`).toBeLessThanOrEqual(leftPole.right);
      expect(pass.right.x, `pass ${i + 1} ends on the right pole`).toBeGreaterThanOrEqual(rightPole.left);
      expect(pass.right.x, `pass ${i + 1} ends on the right pole`).toBeLessThanOrEqual(rightPole.right);
      expect(pass.left.y, `the left pole rises above pass ${i + 1}`).toBeGreaterThan(leftPole.top);
      expect(pass.right.y, `the right pole rises above pass ${i + 1}`).toBeGreaterThan(rightPole.top);
      // It is not level, and each pass ties on lower than the one before.
      expect(Math.abs(pass.right.y - pass.left.y), `pass ${i + 1} slopes`).toBeGreaterThanOrEqual(10);
      if (i > 0) expect(Math.min(pass.left.y, pass.right.y)).toBeGreaterThan(Math.max(m.passes[i - 1].left.y, m.passes[i - 1].right.y));
    }
    // Both poles stand in the ground: their feet are inside the ground band,
    // in the paddy's own height, below my field tag and everything else that
    // hangs; neither ends in mid-air, and a tuft of grass covers each foot.
    for (const pole of m.poles) {
      expect(pole.bottom, `${pole.kind} pole's foot is in the ground band`).toBeGreaterThan(m.ground.top);
      expect(pole.bottom, `${pole.kind} pole's foot is in the ground band`).toBeLessThanOrEqual(m.ground.bottom);
      expect(pole.bottom, `${pole.kind} pole's foot is in the paddy's height`).toBeGreaterThan(m.paddy.top);
      expect(pole.bottom, `${pole.kind} pole ends below my field tag`).toBeGreaterThan(m.field.paper.bottom);
      expect(pole.bottom, `${pole.kind} pole ends below my words`).toBeGreaterThan(m.actions.bottom);
    }
    expect(m.tufts).toHaveLength(2);
    for (const tuft of m.tufts) {
      const pole = m.poles.find((p) => p.left < tuft.right && tuft.left < p.right)!;
      expect(pole, "each tuft is at a pole's foot").toBeTruthy();
      expect(tuft.top).toBeLessThan(pole.bottom);
      expect(tuft.bottom).toBeGreaterThanOrEqual(pole.bottom);
    }
    // The hat hangs by the first knot and the window does not crop it.
    expect(m.hat).toHaveLength(1);
    expect(m.hat[0].left).toBeGreaterThanOrEqual(0);
    expect(Math.abs(m.hat[0].top - m.passes[0].left.y)).toBeLessThanOrEqual(12);
    for (const f of m.fronts) {
      expect(f.width).toBeGreaterThanOrEqual(44);
      expect(f.height).toBeGreaterThanOrEqual(44);
    }
    // No paper lies on another (boxes with the tilt lifted).
    const papers = [...m.tags.map((t) => t.paper), m.field.paper];
    for (let i = 0; i < papers.length; i++) {
      for (let j = i + 1; j < papers.length; j++) {
        const [a, b] = [papers[i], papers[j]];
        const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        expect(overlap, `paper ${i} and paper ${j}`).toBe(false);
      }
    }
  }

  for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, PHONE, { width: 430, height: 932 }, { width: 600, height: 960 }]) {
    test(`layout at ${viewport.width}: my words, the hint, then three passes between two bamboo poles`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page);
      const m = await yard(page);
      // Pass 1 carries 2003 and 2018, pass 2 2021 and 2025, pass 3 my field tag.
      expect(m.passes).toHaveLength(3);
      expectYard(m, [0, 0, 1, 1, 2]);
      expect(m.poles.map((p) => p.kind).sort()).toEqual(["left", "right"]);
      // Each pass slopes the other way to the one before it.
      const slopes = m.passes.map((p) => Math.sign(p.right.y - p.left.y));
      expect(slopes).toEqual([1, -1, 1]);
      // Words first, then the hint directly above the tags.
      expect(m.h1.bottom).toBeLessThan(m.intro.top);
      expect(m.intro.bottom).toBeLessThan(m.actions.top);
      expect(m.actions.bottom).toBeLessThan(m.hint.top);
      const firstTagTop = Math.min(m.tags[0].paper.top, m.tags[1].paper.top);
      expect(m.hint.bottom).toBeLessThan(m.passes[0].left.y);
      expect(firstTagTop - m.hint.bottom, "the hint is directly above the tags").toBeLessThanOrEqual(150);
      // The poles start below the hint, at the page's edges, and the margins
      // are fixed: the words on the gutter, the papers inside the poles.
      const gutter = m.h1.left;
      for (const pole of m.poles) expect(pole.top).toBeGreaterThan(m.hint.bottom - 1);
      expect(m.passes[0].left.x).toBeLessThan(gutter);
      expect(m.passes[0].right.x).toBeGreaterThan(m.width - gutter);
      expect(Math.abs(m.passes[0].left.x - (m.width - m.passes[0].right.x)), "the poles stand the same distance in").toBeLessThanOrEqual(1);
      for (const t of [...m.tags, m.field]) {
        expect(t.paper.left).toBeGreaterThan(m.passes[0].left.x + 5);
        expect(t.paper.right).toBeLessThan(m.passes[0].right.x - 5);
      }
      // Two tags a pass, left then right, each row under the one before.
      const mid = m.width / 2;
      m.tags.forEach((t, i) => {
        if (i % 2 === 0) expect(t.paper.right, `tag ${i}`).toBeLessThan(mid);
        else expect(t.paper.left, `tag ${i}`).toBeGreaterThan(mid);
        if (i > 1) expect(t.paper.top, `tag ${i} hangs below tag ${i - 2}`).toBeGreaterThan(m.tags[i - 2].paper.bottom);
      });
      // Each pass's line clears the row above it, and my field tag hangs
      // from the middle of the third, under everything.
      expect(m.passes[1].right.y).toBeGreaterThan(m.tags[1].paper.bottom - 1);
      expect(m.passes[2].left.y).toBeGreaterThan(m.tags[2].paper.bottom - 1);
      expect(Math.abs(m.field.x - mid)).toBeLessThanOrEqual(2);
      expect(m.field.paper.top).toBeGreaterThan(Math.max(m.tags[2].paper.bottom, m.tags[3].paper.bottom));
      // The ground is one band at the foot: my field tag ends above the paddy.
      expect(m.field.paper.bottom).toBeLessThanOrEqual(m.paddy.top + 12);
    });
  }

  test("at 375 and up the two actions share a row; at 320 they wrap", async ({ page }) => {
    for (const [width, rows] of [[320, 2], [375, 1], [390, 1], [430, 1]] as const) {
      await page.setViewportSize({ width, height: 800 });
      await open(page);
      const tops = await page.locator('#about [data-hero-step="meta-actions"] > a').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(tops).size, `${width}: ${tops.join(", ")}`).toBe(rows);
    }
  });

  test("at 320 my field tag keeps label and value side by side, and My LinkedIn is one line", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await open(page);
    const m = await fieldTag(page).evaluate((tag) => {
      const lines = (el: Element) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      };
      const dts = [...tag.querySelectorAll("dl dt")];
      return {
        beside: dts.every((dt) => dt.getBoundingClientRect().right <= dt.nextElementSibling!.getBoundingClientRect().left + 1),
        sameRow: dts.every((dt) => Math.abs(dt.getBoundingClientRect().top - dt.nextElementSibling!.getBoundingClientRect().top) <= 4),
        link: lines(tag.querySelector("a span")!),
        size: parseFloat(getComputedStyle(tag).fontSize),
        height: tag.parentElement!.getBoundingClientRect().height,
      };
    });
    expect(m.beside).toBe(true);
    expect(m.sameRow).toBe(true);
    expect(m.link).toBe(1);
    // Nothing read as text is under 12px (design/system/README.md §2).
    expect(m.size).toBeGreaterThanOrEqual(12);
    // It was 620px tall with its rows stacked.
    expect(m.height).toBeLessThanOrEqual(500);
  });

  for (const viewport of [{ width: 640, height: 900 }, { width: 768, height: 1024 }, { width: 1023, height: 1366 }]) {
    test(`layout at ${viewport.width}: the tags on the first pass, my words under the second beside my field tag`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page);
      const m = await yard(page);
      expect(m.passes).toHaveLength(2);
      expectYard(m, [0, 0, 0, 0, 1]);
      // Bamboo at the left, the pine at the right.
      const [leftPole, rightPole] = [...m.poles].sort((a, b) => a.left - b.left);
      expect([leftPole.kind, rightPole.kind]).toEqual(["left", "pine"]);
      // Pass 1 carries all four across, left to right, above everything else.
      m.tags.forEach((t, i) => {
        if (i > 0) expect(t.paper.left, `tag ${i}`).toBeGreaterThan(m.tags[i - 1].paper.right);
        expect(t.paper.bottom, `tag ${i} is above the second pass`).toBeLessThan(Math.min(m.passes[1].left.y, m.passes[1].right.y) + 1);
        expect(t.paper.left).toBeGreaterThan(m.passes[0].left.x);
        expect(t.paper.right).toBeLessThan(m.passes[0].right.x);
      });
      // Pass 2 comes back lower with my field tag on the right; the hint, the
      // headline, my paragraph and the actions sit under it on the left.
      expect(m.field.x).toBeGreaterThan(m.width / 2);
      expect(m.field.paper.right).toBeLessThanOrEqual(m.passes[1].right.x);
      for (const [name, words] of [["hint", m.hint], ["h1", m.h1], ["intro", m.intro], ["actions", m.actions]] as const) {
        expect(words.right, `${name} is left of my field tag`).toBeLessThan(m.field.paper.left);
        expect(words.top, `${name} is under the second pass`).toBeGreaterThan(Math.max(m.passes[1].left.y, m.passes[1].right.y));
        expect(words.left, `${name} clears the bamboo and its sprigs`).toBeGreaterThan(m.passes[0].left.x + 56);
      }
      expect(m.hint.bottom).toBeLessThan(m.h1.top);
      expect(m.h1.bottom).toBeLessThan(m.intro.top);
      expect(m.intro.bottom).toBeLessThan(m.actions.top);
      // My field tag's top is about level with the hint: one row, two sides.
      expect(Math.abs(m.field.paper.top - m.hint.top)).toBeLessThanOrEqual(40);
      // The ground: neither side runs into the paddy's band.
      expect(m.actions.bottom).toBeLessThan(m.ground.top + 1);
      // About one iPad screen, down from ~1700.
      if (viewport.width === 768) expect(m.about.height).toBeLessThanOrEqual(1080);
    });
  }

  test("a tablet-wide window too short for both puts my words first, on the same yard", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    const m = await yard(page);
    expect(m.passes).toHaveLength(2);
    expectYard(m, [0, 0, 0, 0, 1]);
    expect(m.actions.bottom).toBeLessThan(m.hint.top);
    expect(m.hint.bottom).toBeLessThan(m.passes[0].left.y);
    for (const pole of m.poles) expect(pole.top).toBeGreaterThan(m.hint.bottom - 1);
  });

  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, PHONE, { width: 460, height: 900 }, { width: 640, height: 900 }, { width: 768, height: 1024 }, { width: 1023, height: 1366 }, { width: 844, height: 390 }]) {
    test(`below 1024 the yard's scenery clears the words and the actions at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page);
      const hits = await page.evaluate(() => {
        const words = [
          ...document.querySelectorAll<HTMLElement>("#about [data-hero-identity] :is(h1, p, a, button)"),
          document.querySelector<HTMLElement>('#about [data-yard="hint"]')!,
        ];
        // The drawings themselves (a pole's box is mostly air), the lines and
        // the hat. The pine's box is its whole crown's width.
        const pieces = [...document.querySelectorAll<HTMLElement>('#about [data-scenery="yard"] :is([data-scenery], svg)')].filter((el) =>
          el.checkVisibility(),
        );
        const out: string[] = [];
        for (const w of words) {
          // The ink, not the block: the h1 and the intro are full-width boxes.
          const range = document.createRange();
          range.selectNodeContents(w);
          const a = range.getBoundingClientRect();
          for (const p of pieces) {
            const b = p.getBoundingClientRect();
            if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
              out.push(`${w.tagName}:${w.innerText.slice(0, 20)} × ${p.getAttribute("data-scenery") ?? `pass ${p.getAttribute("data-yard-pass")}`}`);
            }
          }
        }
        return { out, pieces: pieces.length };
      });
      expect(hits.pieces).toBeGreaterThanOrEqual(8);
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
        const hint = document.querySelector<HTMLElement>('#about [data-yard="hint"]')!;
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
        // The pine's trunk is 96 units into its 180-unit box, at whatever size
        // the window leaves it (Scenery.tsx, `--pw`).
        return { lines, tagRight: tag.right, trunk: pine.left + (pine.width * 96) / 180 };
      });
      expect(m.lines.length).toBeGreaterThanOrEqual(4);
      for (const n of m.lines) expect(n, "each place is one line").toBe(1);
      expect(m.trunk).toBeGreaterThanOrEqual(m.tagRight);
    });
  }

  // Round 25: from 1024 the composition is the board's, with its edges put
  // right. My field tag ends on the shell's right edge, which is the header
  // stamp's; the window crops neither the pine nor the nón lá; and at 1024
  // the hint does not start in the bamboo's leaves.
  for (const width of [1024, 1152, 1280, 1440, 1920]) {
    test(`at ${width} my field tag ends on the shell's edge and the window crops neither the pine nor the hat`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page);
      const m = await page.evaluate(() => {
        const box = (sel: string) => document.querySelector<HTMLElement>(sel)!.getBoundingClientRect();
        const shell = document.querySelector<HTMLElement>("#about > .shell")!;
        const pad = parseFloat(getComputedStyle(shell).paddingRight);
        // The paper with its tilt lifted: the tilt swings its foot, not its top corner.
        const paper = document.querySelector<HTMLElement>('#about [data-hero-step="field-tag"]')!.parentElement!;
        const rotate = paper.style.rotate;
        paper.style.rotate = "none";
        const field = paper.getBoundingClientRect();
        paper.style.rotate = rotate;
        const tags = [...document.querySelectorAll<HTMLElement>('#about [data-hero-step="line"] > li')].map((li) => li.getBoundingClientRect().width);
        return {
          window: document.documentElement.clientWidth,
          shellRight: shell.getBoundingClientRect().right - pad,
          // "Let's talk" is the header's last link to #contact, after the nav's.
          stampRight: [...document.querySelectorAll("header[data-site-header] a[href$='#contact']")].at(-1)!.getBoundingClientRect().right,
          fieldRight: field.right,
          fieldWidth: field.width,
          tagWidth: Math.min(...tags),
          pine: box('#about [data-scenery="hero"] > [data-scenery="pine"]'),
          hat: box('#about [data-scenery="hero"] > [data-scenery="non-la"]'),
        };
      });
      expect(Math.abs(m.fieldRight - m.shellRight), "my field tag's right edge is the shell's").toBeLessThanOrEqual(1);
      expect(Math.abs(m.fieldRight - m.stampRight), "and the header stamp's").toBeLessThanOrEqual(8);
      expect(m.pine.right, "the pine is whole").toBeLessThanOrEqual(m.window + 0.5);
      expect(m.pine.width).toBeGreaterThanOrEqual(70);
      expect(m.hat.left, "the nón lá is whole").toBeGreaterThanOrEqual(0);
      // From 1024 to 1279 my field tag is clamp(320px, 33vw, 380px) wide, so
      // the four tags get more room than the 122px they had at 1024.
      const want = width >= 1280 ? 380 : Math.min(380, Math.max(320, width * 0.33));
      expect(Math.abs(m.fieldWidth - want)).toBeLessThanOrEqual(1);
      expect(m.tagWidth).toBeGreaterThanOrEqual(width >= 1280 ? 151 : 128);
    });
  }

  test("at 1024 the hint does not start in the bamboo's leaves", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    // The bamboo is one mask; ask the drawing where it has ink to the right of
    // its stem (x 80 of its 140) at the hint's height.
    const leaves = await page.evaluate(async () => {
      const bamboo = document.querySelector<HTMLElement>('#about [data-scenery="bamboo"]')!;
      const box = bamboo.getBoundingClientRect();
      const hint = document.querySelector<HTMLElement>('#about [data-yard="hint"]')!;
      const range = document.createRange();
      range.selectNodeContents(hint);
      const ink = range.getBoundingClientRect();
      const svg = await (await fetch("/scenery/bamboo.svg")).text();
      const image = new Image();
      image.src = `data:image/svg+xml;base64,${btoa(svg)}`;
      await image.decode();
      // The mask is drawn at the box's width, from its top, at the viewBox's shape.
      const [, , vw, vh] = /viewBox="([^"]+)"/.exec(svg)![1].split(" ").map(Number);
      const scale = box.width / vw;
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(box.width);
      canvas.height = Math.ceil(ink.bottom - box.top) + 4;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0, box.width, vh * scale);
      const from = Math.max(0, Math.floor(ink.left - box.left));
      const top = Math.max(0, Math.floor(ink.top - box.top) - 2);
      const width = canvas.width - from;
      if (width <= 0) return { inked: 0, from, scale };
      const data = ctx.getImageData(from, top, width, canvas.height - top).data;
      let inked = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 40) inked += 1;
      return { inked, from, scale };
    });
    expect(leaves.inked, `bamboo ink over the hint's box (from x ${leaves.from})`).toBe(0);
  });

  for (const width of [320, 360, 390, 414, 600, 768, 844, 1023, 1024, 1366, 1439, 1440, 1920]) {
    test(`the nón lá hangs wherever the bamboo shows, at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      const m = await page.evaluate(() => {
        const shown = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].some((el) => el.checkVisibility());
        return {
          bamboo: shown('#about [data-scenery="bamboo"], #about [data-scenery="bamboo-top"]'),
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
  // Round 26: the field tag's status links to the new growth, before the QR.
  const TAB_ORDER = [PRIMARY, QUIET, "tag", "tag", "tag", "tag", "4 seedlings", "My LinkedIn (opens in a new tab)"];

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
    // The field tag's two (its status link, then the QR) are right of all of them.
    for (const i of [6, 7]) expect(c[i].left).toBeGreaterThan(Math.max(...c.slice(0, 6).map((x) => x.left)));
  });

  for (const theme of ["day", "night"] as const) {
    test(`${theme} shows the ${theme === "day" ? "sun and the phin" : "moon and the lẩu"}`, async ({ page }) => {
      await open(page, theme);
      const art = await sky(page).evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(art).toContain(theme === "day" ? "sky-day.svg" : "sky-night.svg");
      // Round 23: the buffalo ploughs by day and sleeps at night, Moon's võng
      // and the stool's meal swap with her, by the theme's art variables.
      const painted = (selector: string, property: "mask-image" | "background-image") =>
        page.locator(selector).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
      await expect(page.locator('#about [data-scenery="buffalo-plow"]')).toBeVisible({ visible: theme === "day" });
      await expect(page.locator('#about [data-scenery="buffalo-sleep"]')).toBeVisible({ visible: theme === "night" });
      expect(await painted("#about [data-moon-art]", "background-image")).toContain(theme === "day" ? "offduty-day.svg" : "offduty-night.svg");
      expect(await painted('#about [data-scenery="vignette"]', "background-image")).toContain(theme === "day" ? "morning.svg" : "evening.svg");
      const [shown, gone] =
        theme === "day" ? [hero.vignette.morning, hero.vignette.evening] : [hero.vignette.evening, hero.vignette.morning];
      await expect(page.locator("#about").getByText(shown)).toBeVisible();
      await expect(page.locator("#about").getByText(gone)).toBeHidden();
    });
  }

  // Round 24: the field is a paddy. Text over the rice fails AA contrast, so
  // neither caption may sit on it; and the buffalo stands in it, in the strip
  // the drawing leaves bare for her (tests/lib/scenery.test.ts).
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    for (const theme of ["day", "night"] as const) {
      test(`the paddy keeps off both captions and holds the buffalo at ${width}, by ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await open(page, theme);
        const m = await page.evaluate(() => {
          const box = (el: Element) => el.getBoundingClientRect();
          const ink = (el: Element) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            return range.getBoundingClientRect();
          };
          const shown = (sel: string) => [...document.querySelectorAll(`#about ${sel}`)].filter((el) => el.checkVisibility());
          const paddy = shown('[data-scenery="paddy"], [data-scenery="paddy-phone"]').map(box);
          const water = shown('[data-scenery="paddy-water"], [data-scenery="paddy-phone-water"]').map(box);
          const captions = [
            ink(document.querySelector("#about [data-moon-off-duty] > span:last-child")!),
            ...shown('[data-scenery="hero"] > div p').map(ink),
          ];
          const buffalo = shown('[data-scenery^="buffalo-"]').map(box);
          const near = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          return {
            paddy: paddy.length,
            water: water.length,
            buffalo: buffalo.length,
            onCaptions: paddy.flatMap((p) => captions.filter((c) => near(p, c)).map((c) => `${Math.round(c.left)},${Math.round(c.top)}`)),
            inField: buffalo.every((b) => paddy.some((p) => b.left >= p.left && b.right <= p.right && b.top >= p.top && b.bottom <= p.bottom)),
          };
        });
        expect(m.paddy).toBe(1);
        expect(m.water).toBe(1);
        expect(m.buffalo).toBe(1);
        expect(m.onCaptions).toEqual([]);
        expect(m.inField).toBe(true);
      });
    }
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

  test("the header is no bar: paper on the sky, nothing painted of its own", async ({ page }) => {
    await open(page);
    // Round 23. The sky is a fixed layer under body (round 21 phase 8: iOS
    // ignores `background-attachment: fixed`); the header is transparent over
    // it and borderless, and its paper (the strip, the stamp) is opaque.
    const [header, strip] = await page.evaluate(() =>
      [
        getComputedStyle(document.querySelector("header[data-site-header]")!),
        getComputedStyle(document.querySelector(".nav-paper")!),
      ].map((s) => ({ image: s.backgroundImage, color: s.backgroundColor, border: s.borderBottomWidth })),
    );
    expect(header.image).toBe("none");
    expect(header.color).toBe("rgba(0, 0, 0, 0)");
    expect(header.border).toBe("0px");
    expect(strip.color).not.toBe("rgba(0, 0, 0, 0)");
    expect(await page.evaluate(() => getComputedStyle(document.body, "::before").position)).toBe("fixed");
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
