import { existsSync } from "node:fs";

import { defineConfig } from "@playwright/test";

/**
 * SPEC §3 (responsive contract) must be verified at these seven widths
 * (430 and 1920 are pinned inside clipping.spec.ts).
 * Heights are representative device heights per breakpoint — not
 * load-bearing, specs may scroll — only `width` is the actual contract.
 */
const VIEWPORTS = [
  { width: 320, height: 568 }, // small phone (iPhone SE class)
  { width: 375, height: 667 }, // standard phone
  { width: 390, height: 844 }, // large phone
  { width: 768, height: 1024 }, // tablet portrait
  { width: 1024, height: 768 }, // tablet landscape / small laptop
  { width: 1280, height: 800 }, // the first desktop width (round 25): where the Journey's board begins
  { width: 1440, height: 900 }, // desktop
] as const;

/**
 * This environment provisions a single pinned Chromium build outside
 * Playwright's own managed registry (see `PLAYWRIGHT_BROWSERS_PATH=
 * /opt/pw-browsers`), at a revision this installed `@playwright/test`
 * (1.62.1) does not itself know about — its default browser-resolution
 * looks for a `chromium_headless_shell-<its-own-expected-revision>` folder
 * that doesn't exist here and fails with "Executable doesn't exist" (verified
 * directly: `chromium.launch()` with no `executablePath` fails that way in
 * this container; passing `executablePath` below launches it fine). Do not
 * run `playwright install` — this path is the only browser available.
 *
 * Outside that container (a developer's own machine) the pinned path does not
 * exist, but Playwright's ordinary managed cache does — so the override is
 * applied only when the container path is actually present, and everywhere
 * else the default resolution is left to do its job.
 */
/** Engines besides Chromium (round 32): WebKit, the engine of every iPhone
 *  browser and of Safari on a Mac, at a phone width and a laptop width, and
 *  Firefox at a laptop width. */
// Firefox is opt-in (`E2E_FIREFOX=1`): on this Mac (2026-11-23) its headless
// build cannot start (its compositor fails to map a framebuffer, with its
// sandbox on or off), and every test would wait out a 3-minute launch.
const OTHER_ENGINES = [
  { name: "webkit-390", browserName: "webkit", width: 390, height: 844 },
  { name: "webkit-1440", browserName: "webkit", width: 1440, height: 900 },
  ...(process.env.E2E_FIREFOX ? [{ name: "firefox-1440", browserName: "firefox", width: 1440, height: 900 } as const] : []),
] as const;

const PINNED_CHROMIUM = "/opt/pw-browsers/chromium";
const CHROMIUM_EXECUTABLE = existsSync(PINNED_CHROMIUM) ? PINNED_CHROMIUM : undefined;

/** `E2E_PORT` lets several checkouts (git worktrees) run the suite at once,
 *  each against its own dev server; unset, it is the usual 3000. */
const PORT = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    ...VIEWPORTS.map(({ width, height }) => ({
      name: `chromium-${width}`,
      use: {
        browserName: "chromium" as const,
        viewport: { width, height },
        launchOptions: { executablePath: CHROMIUM_EXECUTABLE },
      },
    })),
    // Round 32: Safari's engine on a phone and a laptop, and Firefox on a
    // laptop, run locally (there is no CI). Each runs every test that is not
    // gated, and its 1440 project runs the ones that set their own viewports
    // (`e2e/once.ts`), the Diary's turns among them. Needs a one-time
    // `pnpm exec playwright install webkit firefox`.
    ...OTHER_ENGINES.map(({ name, browserName, width, height }) => ({
      name,
      use: { browserName, viewport: { width, height } },
    })),
  ],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
