#!/usr/bin/env node
/**
 * Standalone Playwright script (not a test spec): starts `pnpm dev`, captures
 * full-page / per-section / interactive-state screenshots, then stops it.
 *
 * Refreshed for round 11 (see docs/feedback-tracker.md). What changed since
 * the last pass:
 *   - The résumé is a route (`/resume`), not a `#resume` section — there is
 *     no "Deep Dive" toggle there any more (that whole page is one flat
 *     view). It now gets its own navigation + full-page + print capture.
 *   - `#skills` joined the section list (it didn't exist last time this
 *     script was touched).
 *   - The old `#journey` section merged into `#tree` as a Tree/List toggle
 *     (`ViewToggle.tsx` / `view-state.ts`); the capture list follows that —
 *     one shot of each face via the real toggle buttons instead of a
 *     `#journey` section that no longer exists.
 *   - The AI Workflow Lab's "explorer" (`[role="tab"]` stage picker) retired
 *     in favor of "Ask this site", a chat thread over the page's own
 *     content (`AskThisSite.tsx`). The interactive-state capture now asks
 *     one question from the suggested list and shoots the resulting turn.
 *   - `OUT_DIR` and the Chromium executable path used to be hardcoded
 *     absolute paths baked in from whatever sandbox last ran this script —
 *     broken on any other machine (this one included: Windows, not that
 *     Linux path). Both are portable defaults now, overridable by env var.
 */
import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASE_URL = "http://localhost:3000";

// Portable default: a well-known per-OS tmp dir, not a path baked in from
// whatever sandbox last ran this script. Override with SCREENSHOTS_OUT_DIR
// when you want the output somewhere specific.
const OUT_DIR = process.env.SCREENSHOTS_OUT_DIR ?? path.join(tmpdir(), "portfolio-screenshots");

// Let Playwright resolve its own installed browser by default (correct on
// every platform this repo runs on) — only override via env var if you
// specifically need a different binary.
const CHROMIUM_EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

const IS_WINDOWS = process.platform === "win32";

// Page order per src/app/page.tsx: about, worlds, work, skills, tree,
// contact, closing. No standalone "journey" or "resume" section
// any more — journey folded into tree (see CareerTree.tsx), résumé moved to its own
// route (captured separately, below); Philosophy and the AI Workflow Lab
// both removed entirely (round 16) — the Lab's chat lives on in the hero's
// "Ask Thien" tab, captured separately below rather than as a section shot.
// Playground Earth's "worlds" section joined the same round, second in page
// order, right after the hero. The Workshop that joined it was removed in
// round 18.
const SECTIONS = ["about", "worlds", "work", "skills", "tree", "contact", "closing"];

const outPath = (name) => path.join(OUT_DIR, `${name}.png`);

async function isServerUp() {
  try {
    return (await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) })).status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function startDevServer() {
  // `shell: true` is required on Windows: `pnpm` resolves to a `.cmd` shim,
  // and `spawn` only resolves shims through the shell, not directly on PATH
  // (bare `spawn("pnpm", ...)` throws ENOENT there). `detached` process
  // groups are a POSIX concept — skip it on Windows, where the lock-file pid
  // below is the real (and only reliable) way to find and stop the server.
  return spawn("pnpm", ["dev"], {
    cwd: REPO_ROOT,
    detached: !IS_WINDOWS,
    shell: IS_WINDOWS,
    stdio: ["ignore", "ignore", "inherit"],
  });
}

function killPid(pid) {
  try {
    if (IS_WINDOWS) {
      // /t kills the whole tree (Turbopack's real server included), /f forces it.
      spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" });
    } else {
      process.kill(pid, "SIGKILL");
    }
  } catch {
    // Already gone.
  }
}

async function stopDevServer(child) {
  if (child && child.pid) {
    try {
      if (IS_WINDOWS) {
        killPid(child.pid);
      } else {
        process.kill(-child.pid, "SIGTERM");
      }
    } catch {
      /* already gone */
    }
  }
  // Turbopack's dev server detaches into its own persistent process, which
  // outlives the CLI above — Next records its real pid in this lock file for
  // exactly this situation ("run kill <pid> to stop it").
  const lockPath = path.join(REPO_ROOT, ".next", "dev", "lock");
  try {
    const { pid } = JSON.parse(await readFile(lockPath, "utf8"));
    killPid(pid);
  } catch {
    // No lock file, or that pid is already gone.
  }
  await rm(lockPath, { force: true }).catch(() => {});
}

/** Fonts settled + a short buffer for React state / CSS to finish painting. */
async function settle(page, ms = 300) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function shootSections(page, width) {
  for (const id of SECTIONS) {
    const locator = page.locator(`#${id}`);
    await locator.scrollIntoViewIfNeeded();
    await settle(page, 150);
    await locator.screenshot({ path: outPath(`${id}-${width}`) });
  }
}

async function captureDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 60_000 });
  await settle(page);

  await page.screenshot({ path: outPath("full-1440"), fullPage: true });
  await shootSections(page, 1440);

  // A case-study disclosure, expanded.
  const article = page.locator("#work article").first();
  await article.scrollIntoViewIfNeeded();
  await article.locator('button[aria-expanded]').first().click();
  await settle(page, 250);
  await article.screenshot({ path: outPath("case-study-open-1440") });

  // The Journey with the pin released, via the real "Show me the whole tree"
  // button — the pinned stage is what shootSections above captures at
  // whatever act the page happened to be scrolled to, so this is the finished
  // tree in normal flow instead. (Round 18 replaced the Tree / List toggle
  // this used to click.)
  const tree = page.locator("#tree");
  await tree.scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Show me the whole tree" }).click();
  await settle(page, 250);
  await tree.screenshot({ path: outPath("tree-list-1440") });

  // The "Ask Thien" chat, with one turn asked from the suggested-questions
  // list. Round 16 moved this out of the AI Workflow Lab section (deleted)
  // and into the hero's fourth code-artifact tab, so getting the shot now
  // means switching to that tab first rather than scrolling to a section.
  const heroTablist = page.getByRole("tablist", { name: "Code artifact tabs" });
  await heroTablist.scrollIntoViewIfNeeded();
  await heroTablist.getByRole("tab", { name: "Ask Thien" }).click();
  const askPanel = page.getByRole("tabpanel", { name: "Ask Thien" });
  // The chat is a lazily imported chunk, so wait for it to actually mount
  // before reaching for the suggested-questions list inside it.
  await askPanel.getByRole("textbox", { name: "Ask a question about this portfolio" }).waitFor();
  await askPanel.locator('[aria-label="Try asking"] button').first().click();
  await settle(page, 400);
  await askPanel.screenshot({ path: outPath("ask-thien-turn-1440") });

  // Contact form with an intent selected (prefills reason + message).
  const contact = page.locator("#contact");
  await contact.scrollIntoViewIfNeeded();
  await page.locator('#contact input[type="radio"]').nth(1).check();
  await settle(page, 400);
  await contact.screenshot({ path: outPath("contact-intent-1440") });

  // Print emulation, from a clean reload (no leftover interactive state).
  //
  // As of this refresh this capture reliably fails: under `@media print`
  // every `<article>` inside #work measures 0px wide (confirmed via
  // getBoundingClientRect — .shell itself is still the full 1440px, so
  // something below it collapses), which turns each case study's flowing
  // text into one character per line and inflates the section to ~230,000px
  // tall. Chromium's screenshot backend refuses to rasterize a canvas that
  // size ("Protocol error (Page.captureScreenshot): Unable to capture
  // screenshot") — not a script bug, a real print-layout defect in
  // SelectedWork/CaseStudy (or the print rules in globals.css) that predates
  // this refresh and is out of scope for this file. Caught here so it can't
  // take down every capture after it; every other screenshot below still
  // gets produced. See the resume-print-1440 capture below for the print
  // path that does work.
  await page.reload({ waitUntil: "load", timeout: 60_000 });
  await settle(page);
  await page.emulateMedia({ media: "print" });
  try {
    await page.screenshot({ path: outPath("print-1440"), fullPage: true, timeout: 30_000 });
  } catch (error) {
    console.warn(
      `print-1440 skipped — home page print layout is broken (see the comment above this line): ${error.message}`,
    );
  }
  await page.emulateMedia({ media: "screen" });

  // The résumé, as its own page — no longer a section of the home page.
  await page.goto(`${BASE_URL}/resume`, { waitUntil: "load", timeout: 60_000 });
  await settle(page);
  await page.screenshot({ path: outPath("resume-1440"), fullPage: true });

  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: outPath("resume-print-1440"), fullPage: true });

  await context.close();
}

async function captureMobile(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 60_000 });
  await settle(page);

  await page.screenshot({ path: outPath("full-390"), fullPage: true });
  await shootSections(page, 390);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("#mobile-nav-panel").waitFor({ state: "visible" });
  await settle(page, 250);
  await page.screenshot({ path: outPath("menu-open-390"), fullPage: false });

  // The résumé at mobile width too — it is a full route now, not a section
  // that only ever appeared inside the desktop-oriented captures above.
  await page.goto(`${BASE_URL}/resume`, { waitUntil: "load", timeout: 60_000 });
  await settle(page);
  await page.screenshot({ path: outPath("resume-390"), fullPage: true });

  await context.close();
}

async function captureSmall(browser) {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 60_000 });
  await settle(page);
  await page.screenshot({ path: outPath("full-320"), fullPage: true });
  await context.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let devServer = null;
  if (!(await isServerUp())) {
    console.log("Starting dev server (pnpm dev)...");
    devServer = startDevServer();
    const ready = await waitForServer(120_000);
    if (!ready) throw new Error("Dev server did not become ready within 120s");
  }
  console.log("Dev server is up at " + BASE_URL);

  const browser = await chromium.launch(
    CHROMIUM_EXECUTABLE ? { executablePath: CHROMIUM_EXECUTABLE } : {},
  );
  try {
    await captureDesktop(browser);
    await captureMobile(browser);
    await captureSmall(browser);
  } finally {
    await browser.close();
    if (devServer) {
      console.log("Stopping dev server...");
      await stopDevServer(devServer);
    }
  }

  console.log(`Done. Screenshots written to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
