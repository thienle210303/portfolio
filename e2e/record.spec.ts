import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { careerEntries, certifications, record } from "../src/content/portfolio";
import { kindCounts, recordYears } from "../src/lib/record";

// Round 21 Phase 5: the Record (NatRecordFinal). Each test pins its own
// viewport and runs once (in the chromium-1440 project), as journey.spec does.

const WIDE = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
const ROW_TOP = 80;
const STAMPED = certifications.filter((c) => "stamp" in c);

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-1440", "pins its own viewports; run once");
});

async function open(page: Page, theme: "day" | "night" = "day", hash = "") {
  await page.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
  await page.goto(`/${hash}`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

async function restingTop(page: Page, selector: string): Promise<number> {
  const read = () => page.locator(selector).evaluate((el) => Math.round(el.getBoundingClientRect().top));
  let previous = await read();
  let stable = 0;
  for (let i = 0; i < 60 && stable < 2; i += 1) {
    await page.waitForTimeout(100);
    const next = await read();
    stable = next === previous ? stable + 1 : 0;
    previous = next;
  }
  return previous;
}

test.describe("the Record", () => {
  test("sits between the Journey and Contact, and the nav says Record", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const order = await page.evaluate(() => [...document.querySelectorAll("main > section")].map((s) => s.id));
    expect(order).toEqual(["about", "tree", "record", "contact"]);
    await expect(page.locator('header nav a[href="/#record"]').first()).toHaveText("Record");
    await expect(page.locator("#record-heading")).toHaveText(record.pressed.heading);
  });

  test("a ring jumps to its year", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const ring = page.locator('#record a.record-ring[href="#record-2019"]');
    await ring.scrollIntoViewIfNeeded();
    // The notebook's entrance is scroll-driven (round 21 phase 8): let the
    // page finish opening before aiming at a ring on it.
    let seen = "";
    await expect
      .poll(async () => {
        const now = JSON.stringify(await page.locator("#record svg.record-slice").boundingBox());
        const settled = now === seen;
        seen = now;
        return settled;
      })
      .toBe(true);
    // The ring is an annulus: press it at its own band, left of the centre.
    const box = await page.locator("#record svg.record-slice").boundingBox();
    const hit = await page.evaluate(() => {
      const svg = document.querySelector<SVGSVGElement>("#record svg.record-slice")!;
      const path = svg.querySelector<SVGPathElement>('a[href="#record-2019"] path')!;
      const inner = svg.querySelector<SVGPathElement>('a[href="#record-2018"] path')!;
      const vb = svg.viewBox.baseVal;
      const r = svg.getBoundingClientRect();
      // Midway between 2018's and 2019's outer edges, along the 180° ray.
      const x2019 = path.getPointAtLength(path.getTotalLength() / 2).x;
      const x2018 = inner.getPointAtLength(inner.getTotalLength() / 2).x;
      const x = (x2019 + x2018) / 2;
      return { x: r.left + ((x - vb.x) / vb.width) * r.width, y: r.top + r.height / 2 };
    });
    expect(box).not.toBeNull();
    await page.mouse.click(hit.x, hit.y);
    await expect(page).toHaveURL(/#record-2019$/);
    expect(Math.abs((await restingTop(page, "#record-2019")) - ROW_TOP)).toBeLessThanOrEqual(2);
  });

  test("every ring is a named link, reachable by keyboard, with a visible focus", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const rings = page.locator("#record a.record-ring");
    await expect(rings).toHaveCount(recordYears().length);
    const first = rings.first();
    await first.focus();
    const stroke = await first.locator("path").evaluate((el) => getComputedStyle(el).strokeWidth);
    expect(parseFloat(stroke)).toBeGreaterThanOrEqual(3);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#record-\d{4}$/);
  });

  test("filters show one kind, with counts from content, and a ring clears a filter that hides its year", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const group = page.getByRole("group", { name: "Show entries of one kind" });
    const counts = kindCounts();
    await expect(group.getByRole("button")).toHaveText([
      `All${counts.all}`,
      `Work${counts.work}`,
      `Study${counts.learning}`,
      `Milestones${counts.milestone}`,
    ]);
    const visibleRows = () => page.locator("#record [data-tree-branch]:visible");
    await expect(visibleRows()).toHaveCount(counts.all);
    for (const [name, kind, n] of [
      ["Work", "work", counts.work],
      ["Study", "learning", counts.learning],
      ["Milestones", "milestone", counts.milestone],
    ] as const) {
      const button = group.getByRole("button", { name: new RegExp(`^${name}`) });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(visibleRows()).toHaveCount(n);
      for (const row of await visibleRows().all()) await expect(row).toHaveAttribute("data-kind", kind);
    }
    // Milestones hides 2020 and 2019 (nothing of that kind started then).
    await expect(page.locator("#record-2019")).toBeHidden();
    await page.locator('#record a.record-ring[href="#record-2019"]').focus();
    await page.keyboard.press("Enter");
    await expect(group.getByRole("button", { name: /^All/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#record-2019")).toBeInViewport();
  });

  test("a pressed card opens its row", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await page.getByRole("list", { name: "Pressed: my best ones" }).getByRole("link").nth(4).click();
    await expect(page.locator("#record-row-usc-scraping-trigger")).toHaveAttribute("aria-expanded", "true");
    expect(Math.abs((await restingTop(page, "#journey-entry-usc-scraping")) - ROW_TOP)).toBeLessThanOrEqual(2);
  });

  test("side by side, the pressed board stays in view down a long open row, and stops above the cup", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page, "day", "#journey-entry-doordash");
    await expect(page.locator("#record-row-doordash-trigger")).toHaveAttribute("aria-expanded", "true");
    const board = page.locator("[data-pressed]").locator("..");
    const notebook = page.locator("[data-notebook]");
    const { top, height } = await notebook.evaluate((el) => ({ top: el.getBoundingClientRect().top + window.scrollY, height: el.getBoundingClientRect().height }));
    for (const share of [0.3, 0.5]) {
      await page.evaluate((y) => window.scrollTo(0, y), top + height * share);
      await expect.poll(() => board.evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(96);
    }
    // At the notebook's foot the board has stopped: it ends above the cup.
    await page.evaluate((y) => window.scrollTo(0, y), top + height - 300);
    const boardBottom = await board.evaluate((el) => el.getBoundingClientRect().bottom);
    const cup = await page.locator(".record-page-left [aria-hidden=true].mt-auto").evaluate((el) => el.getBoundingClientRect().top);
    expect(boardBottom).toBeLessThanOrEqual(cup);
  });

  test("the Journey's tags and branch labels land on Record rows", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await page.locator('[data-hanging-tags] a[href="#journey-entry-schaeffler"]').click();
    await expect(page.locator("#record-row-schaeffler-trigger")).toHaveAttribute("aria-expanded", "true");
    expect(Math.abs((await restingTop(page, "#journey-entry-schaeffler")) - ROW_TOP)).toBeLessThanOrEqual(2);
    // Nothing on the Journey links to an id it no longer holds.
    const hrefs = await page.locator("#tree a[href^='#']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    for (const href of hrefs) {
      const inRecord = await page.locator(`#record ${href}`).count();
      const inTree = await page.locator(`#tree ${href}`).count();
      expect(inRecord + inTree, href).toBe(1);
    }
  });

  test("a fragment opens its row with JavaScript on", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page, "day", "#journey-entry-cockyhacks");
    await expect(page.locator("#record-row-cockyhacks-trigger")).toHaveAttribute("aria-expanded", "true");
    expect(Math.abs((await restingTop(page, "#journey-entry-cockyhacks")) - ROW_TOP)).toBeLessThanOrEqual(2);
    await expect(page.locator("#journey-entry-cockyhacks").getByRole("button", { name: "See the award" })).toBeVisible();
  });

  test("with JavaScript off, a fragment opens its row by :target, filters are hidden, every row shows", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: WIDE });
    const page = await context.newPage();
    await page.goto("/#journey-entry-graduation");
    await expect(page.locator("#journey-entry-graduation [role=region] > div").first()).toHaveCSS("visibility", "visible");
    await expect(page.locator("#journey-entry-graduation")).toBeInViewport();
    await expect(page.getByRole("group", { name: "Show entries of one kind" })).toBeHidden();
    await expect(page.locator("#record [data-tree-branch]:visible")).toHaveCount(careerEntries.length);
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

    // The Close button closes it too, and focus still returns.
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect(stamp).toBeFocused();
  });

  test("an award opens from its row", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page, "day", "#journey-entry-code-to-give");
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

  test("the phone layout stacks: slice, cards, then the year list and stamps", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page);
    const top = (sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const slice = await top("#record svg.record-slice");
    const cards = await top("#record .record-card");
    const years = await top("#record [data-record-list]");
    const stamps = await top("#record .record-stamp");
    expect(slice).toBeLessThan(cards);
    expect(cards).toBeLessThan(years);
    expect(years).toBeLessThan(stamps);
    // No strings on a phone: they need the board's frame.
    await expect(page.locator("#record [data-pressed] > svg[aria-hidden='true']")).toBeHidden();
  });

  test("no horizontal overflow from 320 to 1920", async ({ page }) => {
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

  test("reduced motion: nothing in the Record animates", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    expect(await page.evaluate(() => document.getElementById("record")!.getAnimations({ subtree: true }).length)).toBe(0);
  });

  for (const theme of ["day", "night"] as const) {
    for (const size of [WIDE, PHONE]) {
      test(`zero WCAG violations in the Record, ${theme}, ${size.width}`, async ({ page }) => {
        await page.setViewportSize(size);
        await open(page, theme);
        await page.locator("#record").scrollIntoViewIfNeeded();
        await page.locator("#record-row-doordash-trigger").click();
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .include("#record")
          .analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`)).toEqual([]);
      });
    }
    test(`zero WCAG violations with a certificate open, ${theme}`, async ({ page }) => {
      await page.setViewportSize(WIDE);
      await open(page, theme);
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
