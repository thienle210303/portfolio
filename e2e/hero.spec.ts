import { test, expect, type Page } from "@playwright/test";
import { profile } from "../src/content/portfolio";
import { currentEntry } from "../src/lib/content";

// Round 20 Phase 3 (spec §3): Hero A. Identity beside a dark terminal card.
// Each test pins one viewport rather than running per project.

const WIDE = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

async function open(page: Page, theme: "day" | "night" = "day") {
  await page.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

/** WCAG relative luminance of an element's computed background. A canvas
 *  normalises whatever colour syntax the browser reports to sRGB bytes. */
function backgroundLuminance(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) throw new Error(`no ${sel}`);
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("no 2d context");
    context.fillStyle = getComputedStyle(element).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data].map((byte) => {
      const c = byte / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }, selector);
}

const IDENTITY = "#about [data-hero-identity]";
const TERMINAL = '#about [data-hero-step="code"]';

test.describe("hero A", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-1440", "pins its own viewports; run once");
  });

  for (const viewport of [WIDE, PHONE]) {
    test(`hero shows role · employer, headline, one paragraph and two actions at ${viewport.width}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await open(page);
      const identity = page.locator(IDENTITY);
      const current = currentEntry();
      await expect(identity.locator("[data-hero-step='eyebrow']")).toHaveText(
        `${current.role} · ${current.organization}`,
      );
      await expect(identity.locator("h1")).toHaveText(profile.headline);
      const body = identity.locator("p:not(.eyebrow)");
      await expect(body).toHaveCount(1);
      await expect(body).toHaveText(profile.positioning);
      await expect(page.locator('#about a[href="#tree"]')).toHaveText("See my work");
      await expect(identity.getByRole("link", { name: /^Book a call/ })).toBeVisible();
      await expect(identity.getByRole("link")).toHaveCount(2);
    });
  }

  test("book a call falls back to #contact", async ({ page }) => {
    // The test server runs without BOOKING_URL.
    await open(page);
    await expect(page.locator(IDENTITY).getByRole("link", { name: "Book a call" })).toHaveAttribute(
      "href",
      "#contact",
    );
  });

  test("hero has no margin rail", async ({ page }) => {
    await open(page);
    await expect(page.locator("#about .rail, #about .rail-layout")).toHaveCount(0);
  });

  test("terminal sits beside the identity at 1440 and below it at 390", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    const identity = (await page.locator(IDENTITY).boundingBox())!;
    const terminal = (await page.locator(TERMINAL).boundingBox())!;
    expect(terminal.x).toBeGreaterThanOrEqual(identity.x + identity.width);
    expect(terminal.y).toBeLessThan(identity.y + identity.height);

    await page.setViewportSize(PHONE);
    const narrowIdentity = (await page.locator(IDENTITY).boundingBox())!;
    const narrowTerminal = (await page.locator(TERMINAL).boundingBox())!;
    expect(narrowTerminal.y).toBeGreaterThanOrEqual(narrowIdentity.y + narrowIdentity.height);
  });

  for (const theme of ["day", "night"] as const) {
    test(`terminal is dark in ${theme} theme`, async ({ page }) => {
      await open(page, theme);
      const terminal = await backgroundLuminance(page, TERMINAL);
      expect(terminal).toBeLessThan(0.2);
      if (theme === "day") expect(terminal).toBeLessThan(await backgroundLuminance(page, "body"));
    });
  }

  test("terminal types once and shows complete under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    const lines = page.locator(`${TERMINAL} [data-type-line]`);
    expect(await lines.count()).toBeGreaterThan(1);
    const states = await lines.evaluateAll((nodes) =>
      nodes.map((node) => ({ running: node.getAnimations().length, clip: getComputedStyle(node).clipPath })),
    );
    for (const state of states) expect(state).toEqual({ running: 0, clip: "none" });
    await expect(page.locator(TERMINAL)).toContainText(`motto: ${profile.motto}`);
  });

  test("whoami types on load under normal motion", async ({ page }) => {
    await open(page);
    // `fill-mode: both` keeps the animation listed after it ends, so this
    // cannot race the typing; it fails if the rule or `data-typing` is lost.
    const typed = await page
      .locator(`${TERMINAL} [data-type-line]`)
      .evaluateAll((nodes) =>
        nodes.filter((node) =>
          node.getAnimations().some((a) => (a as CSSAnimation).animationName === "term-type"),
        ).length,
      );
    expect(typed).toBeGreaterThan(0);
  });

  test("switching tabs never re-types", async ({ page }) => {
    await open(page);
    await page.waitForSelector("html[data-ink-ready]", { timeout: 30_000 });
    const running = () =>
      page
        .locator(`${TERMINAL} [data-type-line]`)
        // `fill-mode: both` keeps a finished typing animation in
        // getAnimations(), so count only the ones still playing.
        .evaluateAll((nodes) =>
          nodes.reduce(
            (sum, node) => sum + node.getAnimations().filter((a) => a.playState === "running").length,
            0,
          ),
        );
    await expect.poll(running, { timeout: 10_000 }).toBe(0);

    const tabs = page.getByRole("tablist", { name: "Terminal" }).getByRole("tab");
    await expect(async () => {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true", { timeout: 1000 });
    }).toPass({ timeout: 15_000 });
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    expect(await running()).toBe(0);
  });

  test("terminal tabs read as lowercase commands", async ({ page }) => {
    await open(page);
    const tab = page.getByRole("tablist", { name: "Terminal" }).getByRole("tab").first();
    expect(await tab.evaluate((node) => getComputedStyle(node).textTransform)).toBe("none");
  });
});
