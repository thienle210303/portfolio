import { existsSync } from "node:fs";

import { defineConfig } from "@playwright/test";

/**
 * SPEC §3 (responsive contract) must be verified at these six widths.
 * Heights are representative device heights per breakpoint — not
 * load-bearing, specs may scroll — only `width` is the actual contract.
 */
const VIEWPORTS = [
  { width: 320, height: 568 }, // small phone (iPhone SE class)
  { width: 375, height: 667 }, // standard phone
  { width: 390, height: 844 }, // large phone
  { width: 768, height: 1024 }, // tablet portrait
  { width: 1024, height: 768 }, // tablet landscape / small laptop
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
const PINNED_CHROMIUM = "/opt/pw-browsers/chromium";
const CHROMIUM_EXECUTABLE = existsSync(PINNED_CHROMIUM) ? PINNED_CHROMIUM : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    launchOptions: {
      executablePath: CHROMIUM_EXECUTABLE,
    },
  },
  // Chromium only — it is the only browser installed in this environment.
  projects: VIEWPORTS.map(({ width, height }) => ({
    name: `chromium-${width}`,
    use: {
      viewport: { width, height },
    },
  })),
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
