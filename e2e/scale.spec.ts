import { test, expect, type Page } from "@playwright/test";

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
test("headings use IBM Plex Sans", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const first = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily.split(",")[0].trim());
  const sans = await first("body");
  expect(sans).toContain("IBM Plex Sans");
  expect(await first("#about h1")).toBe(sans);
  expect(await first("#worlds h2")).toBe(sans);
  // next/font hashes file names, so a URL check would be vacuous; its
  // @font-face family names ("Fraunces", "Fraunces Fallback") are the stable signal.
  const families = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].map((f) => f.family);
  });
  expect(families.length).toBeGreaterThan(0);
  expect(families.filter((f) => /fraunces/i.test(f))).toEqual([]);
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
      // The first About paragraph — not the first `#about p`, which is the
      // eyebrow (--step--1, deliberately below body size), nor the positioning
      // lead (--step-1).
      within(await px(page, "#about [data-hero-step='intro'] p:nth-of-type(2)", "font-size"), 15, 16);
    });

    test("section titles are 24–28px", async ({ page }) => {
      for (const id of ["worlds", "tree", "contact"]) {
        within(await px(page, `#${id} h2`, "font-size"), 24, 28);
      }
    });

    test("hero headline is 40–48px", async ({ page }) => {
      const size = await px(page, "#about h1", "font-size");
      if (page.viewportSize()!.width >= 1440) {
        within(size, 40, 48);
      } else {
        expect(size).toBeLessThanOrEqual(48 + TOL);
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
        (await px(page, "#worlds", "padding-bottom")) + (await px(page, "#tree", "padding-top"));
      if (page.viewportSize()!.width >= 1440) within(gap, 56, 72);
      else within(gap, 40, 56);
    });

    test("hero has no full-screen floor", async ({ page }) => {
      test.skip(page.viewportSize()!.width < 1440, "measured at 1440×900");
      const h = await page.locator("#about").evaluate((el) => el.getBoundingClientRect().height);
      expect(h).toBeLessThan(900 - 56);
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

    test("footer is one line under 80px", async ({ page }) => {
      await page.goto("/");
      const box = await page.locator("footer").boundingBox();
      expect(box!.height).toBeLessThan(80);
    });

    test("no closing band", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#closing")).toHaveCount(0);
    });
  });
}
