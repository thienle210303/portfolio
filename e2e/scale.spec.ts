import { test, expect, type Page } from "@playwright/test";
import { analyticsDisclosure } from "../src/content/portfolio";

// Round 20 spec §2: the site-wide type and spacing targets, measured at the two
// widths the spec names. Every bound carries a ±0.5px tolerance for subpixel
// rounding of the fluid clamps.
const TOL = 0.5;
const SIZES = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

function within(value: number, min: number, max: number) {
  expect(value).toBeGreaterThanOrEqual(min - TOL);
  expect(value).toBeLessThanOrEqual(max + TOL);
}

async function px(page: Page, selector: string, prop: string): Promise<number> {
  return page
    .locator(selector)
    .first()
    .evaluate((el, p) => parseFloat(getComputedStyle(el).getPropertyValue(p)), prop);
}

// Not inside the per-width loop: the face is the same at every width.
const firstFamily = (page: Page, sel: string) =>
  page
    .locator(sel)
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily.split(",")[0].trim());

test("headings use Bricolage Grotesque", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const sans = await firstFamily(page, "body");
  expect(sans).toContain("Bricolage Grotesque");
  expect(await firstFamily(page, "#about h1")).toBe(sans);
  expect(await firstFamily(page, "#tree h2")).toBe(sans);
});

test("data uses Courier Prime", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(await firstFamily(page, ".eyebrow")).toContain("Courier Prime");
});

test("Newsreader is declared, and IBM Plex is not", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // next/font hashes file names, so a URL check would be vacuous; its
  // @font-face family names are the stable signal.
  const families = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].map((f) => f.family);
  });
  expect(families.some((f) => /newsreader/i.test(f))).toBe(true);
  expect(families.filter((f) => /plex|fraunces/i.test(f))).toEqual([]);
});

test("Bricolage covers ệ", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const loaded = await page.evaluate(
    async () => (await document.fonts.load('16px "Bricolage Grotesque"', "ệ")).length,
  );
  expect(loaded).toBeGreaterThan(0);
});

for (const size of SIZES) {
  test.describe(`at ${size.width}px`, () => {
    test.use({ viewport: size });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => window.localStorage.setItem("theme", "day"));
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
    });

    test("body text is 15–16px", async ({ page }) => {
      // A Journey paragraph rendered at --step-0: the first visible `#tree p`
      // whose computed font-size equals a `var(--step-0)` probe's. That is a
      // case study's prose (CaseStudy.tsx PROSE_CLASS). The hero has no body
      // text at --step-0; its paragraph is the lead (below).
      const size = await page.locator("#tree").evaluate((tree) => {
        const probe = document.createElement("div");
        probe.style.fontSize = "var(--step-0)";
        tree.append(probe);
        const step0 = getComputedStyle(probe).fontSize;
        probe.remove();
        const p = [...tree.querySelectorAll("p")].find(
          (el) => el.checkVisibility() && getComputedStyle(el).fontSize === step0,
        );
        return p ? parseFloat(step0) : NaN;
      });
      within(size, 15, 16);
    });

    test("hero lead is 17–19px", async ({ page }) => {
      within(await px(page, "#about [data-hero-step='intro']", "font-size"), 17, 19);
    });

    test("section titles are 24–28px", async ({ page }) => {
      within(await px(page, "#contact h2", "font-size"), 24, 28);
    });

    test("the Journey's title is 52–58px at 1440 and 30–34px at 390", async ({ page }) => {
      const width = page.viewportSize()!.width;
      test.skip(width !== 1440 && width !== 390, "the board's size at its two widths");
      const size = await px(page, "#tree h2", "font-size");
      if (width === 1440) within(size, 52, 58);
      else within(size, 30, 34);
    });

    test("hero headline is 64–72px at 1440", async ({ page }) => {
      const size = await px(page, "#about h1", "font-size");
      if (page.viewportSize()!.width >= 1440) {
        within(size, 64, 72);
      } else {
        expect(size).toBeLessThanOrEqual(72 + TOL);
        const lines = await page.locator("#about h1").evaluate((el) => {
          const lh = parseFloat(getComputedStyle(el).lineHeight);
          return el.getBoundingClientRect().height / lh;
        });
        expect(lines).toBeLessThanOrEqual(4 + 0.1);
      }
    });

    test("header is at most 56px", async ({ page }) => {
      const h = await page.locator("header").first().evaluate((el) => el.getBoundingClientRect().height);
      expect(h).toBeLessThanOrEqual(56 + TOL);
    });

    test("content is at most 1120px wide", async ({ page }) => {
      test.skip(page.viewportSize()!.width < 1440, "width cap only binds on desktop");
      const widest = await page.locator(".shell").evaluateAll((els) =>
        Math.max(
          ...els.map((el) => {
            const s = getComputedStyle(el);
            return el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
          }),
        ),
      );
      expect(widest).toBeLessThanOrEqual(1120 + TOL);
    });

    test("sections are about 64px apart on desktop, 48 on mobile", async ({ page }) => {
      const gap =
        (await px(page, "#tree", "padding-bottom")) + (await px(page, "#contact", "padding-top"));
      if (page.viewportSize()!.width >= 1440) within(gap, 56, 72);
      else within(gap, 40, 56);
    });

    // A floor, not a height: the hero may grow tall from its own content, but
    // neither #about nor any box between it and the h1 may set a min-height
    // that reaches a screen (viewport minus the header).
    test("hero has no full-screen floor", async ({ page }) => {
      const floor = page.viewportSize()!.height - 56;
      const mins = await page
        .locator("#about, #about :has(h1)")
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).minHeight));
      expect(mins.length).toBeGreaterThan(1);
      for (const m of mins) {
        expect(m === "auto" ? 0 : parseFloat(m)).toBeLessThan(floor);
      }
    });

    test("mobile menu panel starts at the header's bottom", async ({ page }) => {
      test.skip(page.viewportSize()!.width >= 1024, "mobile menu only");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: /Open menu/ }).click();
      const panel = page.locator("#" + (await page.getByRole("button", { name: /Close menu/ }).getAttribute("aria-controls")));
      await expect(panel).toBeVisible();
      const panelTop = await panel.evaluate((el) => el.getBoundingClientRect().top);
      const headerBottom = await page.locator("header").first().evaluate((el) => el.getBoundingClientRect().bottom);
      expect(Math.abs(panelTop - headerBottom)).toBeLessThanOrEqual(TOL);
    });

    test("nav anchor lands below the header", async ({ page }) => {
      await page.waitForLoadState("networkidle");
      if (page.viewportSize()!.width >= 1024) {
        await page
          .getByRole("navigation", { name: "Primary" })
          .getByRole("link", { name: "Contact", exact: true })
          .click();
      } else {
        await page.getByRole("button", { name: /Open menu/ }).click();
        await page
          .getByRole("navigation", { name: "Mobile" })
          .getByRole("link", { name: "Contact", exact: true })
          .click();
      }
      const heading = page.locator("#contact h2").first();
      await expect(heading).toBeInViewport();
      // Let smooth scrolling settle: two reads 200ms apart agree.
      await expect
        .poll(() =>
          page.evaluate(async () => {
            const y = window.scrollY;
            await new Promise((r) => setTimeout(r, 200));
            return window.scrollY === y;
          }),
        )
        .toBe(true);
      const headerBottom = await page.locator("header").first().evaluate((el) => el.getBoundingClientRect().bottom);
      const headingTop = await heading.evaluate((el) => el.getBoundingClientRect().top);
      expect(headingTop).toBeGreaterThanOrEqual(headerBottom - TOL);
    });

    // Both arms: e2e builds run with analytics off, so the production line is
    // measured by appending the disclosure the way SiteFooter renders it.
    test("footer is under 80px, with and without the analytics disclosure", async ({ page }) => {
      const footer = page.locator("footer");
      expect((await footer.boundingBox())!.height).toBeLessThan(80);
      await footer.locator("p").evaluate((p, text) => {
        if (!p.textContent!.includes(text)) p.append(" · " + text);
      }, analyticsDisclosure);
      await expect(footer).toContainText(analyticsDisclosure);
      expect((await footer.boundingBox())!.height).toBeLessThan(80);
    });

    test("the page ends at the footer", async ({ page }) => {
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(1500);
      const gap = await page.evaluate(
        () =>
          document.documentElement.scrollHeight -
          (document.querySelector("footer")!.getBoundingClientRect().bottom + window.scrollY),
      );
      expect(gap).toBeLessThanOrEqual(1);
    });

    test("no closing band", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#closing")).toHaveCount(0);
    });
  });
}
