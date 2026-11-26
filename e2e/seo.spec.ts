import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { onceOverall } from "./once";
import { SHOWN } from "../src/lib/showcase";

/**
 * What a search engine, a link preview and a stranger's browser get: a whole
 * snippet, a share card with a picture on every page a person can land on, a
 * sitemap of those pages, a 404 that is not indexed and leads back in, and
 * the response headers a public site should send. Run once: none of it
 * depends on the window's width.
 */
test.beforeEach(({}, info) => {
  test.skip(!onceOverall(info), "metadata does not depend on the width; run once");
});

const meta = (page: Page, selector: string) => page.locator(selector).first().getAttribute("content");

// Round 32: each shown case study is a page a person can land on.
const LANDINGS = ["/", "/resume", ...SHOWN.map((p) => `/work/${p.id}`)];

for (const path of LANDINGS) {
  test(`${path} has a whole snippet, a canonical and a share card with a picture`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    const description = (await meta(page, 'meta[name="description"]')) ?? "";
    expect(description.length, description).toBeGreaterThan(50);
    // Search results cut a snippet at about 160 characters.
    expect(description.length, description).toBeLessThanOrEqual(160);
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(new RegExp(`${path === "/" ? "" : path}$`));
    expect(await meta(page, 'meta[property="og:image"]')).toMatch(/\/opengraph-image/);
    expect(await meta(page, 'meta[property="og:site_name"]')).toBeTruthy();
    expect(await meta(page, 'meta[name="twitter:image"]')).toMatch(/\/opengraph-image/);
    expect(await page.locator('link[rel="apple-touch-icon"]').count()).toBeGreaterThan(0);
  });
}

test("the home page says who I am in structured data", async ({ page }) => {
  await page.goto("/");
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
  expect(data["@type"]).toBe("Person");
  expect(data.name).toBeTruthy();
  expect(data.sameAs.length).toBeGreaterThan(0);
});

test("the sitemap lists the site, the résumé and each case study; robots points at it and keeps out of the API", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toMatch(/<loc>[^<]+<\/loc>/);
  expect(sitemap).toMatch(/<loc>[^<]+\/resume<\/loc>/);
  for (const project of SHOWN) expect(sitemap).toContain(`/work/${project.id}</loc>`);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Sitemap: .+\/sitemap\.xml/);
  expect(robots).toMatch(/Disallow: \/api\//);
});

test("a missing page is a 404 in my voice, not indexed, with the way back in", async ({ page }) => {
  const response = await page.goto("/a-page-that-isnt-here");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Nothing hangs here." })).toBeVisible();
  const robots = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((el) => el.getAttribute("content")));
  expect(robots.length).toBeGreaterThan(0);
  for (const value of robots) expect(value).toContain("noindex");
  expect(await page.locator('link[rel="canonical"]').count()).toBe(0);
  await expect(page.getByRole("link", { name: "Back to the site" })).toHaveAttribute("href", "/");
  for (const label of ["About", "Work", "Journey", "Diary", "Contact"]) {
    await expect(page.getByRole("navigation", { name: "The site" }).getByRole("link", { name: label })).toBeVisible();
  }
});

test("the 404 has no WCAG violations, day and night, at 1440 and 390", async ({ page }) => {
  for (const width of [1440, 390]) {
    for (const theme of ["day", "night"]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
      await page.goto("/a-page-that-isnt-here");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`), `${width} ${theme}`).toEqual([]);
    }
  }
});

test("every page sends the public site's headers and no framework banner", async ({ request }) => {
  for (const path of LANDINGS) {
    const headers = (await request.get(path)).headers();
    expect(headers["x-powered-by"], path).toBeUndefined();
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'self'");
    expect(headers["permissions-policy"], path).toContain("camera=()");
  }
});

test("a case study only has a page when it is shown: any other id is a 404, not indexed", async ({ page }) => {
  // `chess-minmax` is a real project, but not a featured one (round 32).
  for (const path of ["/work/nope", "/work/chess-minmax"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    const robots = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((el) => el.getAttribute("content")));
    for (const value of robots) expect(value, path).toContain("noindex");
  }
});

test("every case-study link on the page leads to a page", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = [...new Set(await page.locator('main a[href^="/work/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")!)))];
  // The four sheets and the oak's tags that open one.
  expect(hrefs.sort()).toEqual(SHOWN.map((p) => `/work/${p.id}`).sort());
  for (const href of hrefs) expect((await request.get(href)).status(), href).toBe(200);
});

test("a case study's page has no WCAG violations, day and night, at 1440 and 390", async ({ page }) => {
  for (const project of SHOWN) {
    for (const width of [1440, 390]) {
      for (const theme of ["day", "night"]) {
        await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
        await page.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
        await page.goto(`/work/${project.id}`);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        // Open the long version too: its words are on the page.
        await page.locator("details.work-long summary").click();
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        expect(
          results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`),
          `${project.id} ${width} ${theme}`,
        ).toEqual([]);
      }
    }
  }
});

test("a case study's page cuts off no text and scrolls no sideways, at nine widths", async ({ page }) => {
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const project of SHOWN) {
      await page.goto(`/work/${project.id}`);
      await page.locator("details.work-long summary").click();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${project.id} at ${width}`).toBeLessThanOrEqual(0);
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("main :is(h1, h2, p, li, dt, dd, a, summary, figcaption)")]
          // `clientWidth > 1` leaves out what is visually hidden on purpose (sr-only).
          .filter((el) => el.checkVisibility() && el.clientWidth > 1 && el.scrollWidth - el.clientWidth > 1 && getComputedStyle(el).overflowX !== "visible")
          .map((el) => el.textContent?.slice(0, 30)),
      );
      expect(clipped, `${project.id} at ${width}`).toEqual([]);
    }
  }
});

test("on a case study's page the nav goes home, and the cats do not start a tour", async ({ page }) => {
  await page.goto(`/work/${SHOWN[0]!.id}`);
  for (const id of ["about", "work", "tree", "record", "contact"]) await expect(page.locator(`#${id}`)).toHaveCount(0);
  const journey = page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Journey", exact: true });
  if (await journey.isVisible()) await expect(journey).toHaveAttribute("href", "/#tree");
});
