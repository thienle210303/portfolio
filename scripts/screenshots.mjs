#!/usr/bin/env node
/**
 * Standalone Playwright script (not a test spec): starts `pnpm dev`, captures
 * full-page / per-section / interactive-state screenshots, then stops it.
 */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
const REPO_ROOT = new URL("..", import.meta.url).pathname;
const BASE_URL = "http://localhost:3000";
const OUT_DIR =
  "/tmp/claude-0/-home-user-portfolio/2d0d34ac-2ff9-55f3-b689-20dc60d4a33e/scratchpad/shots";
const CHROMIUM_EXECUTABLE = "/opt/pw-browsers/chromium";
const SECTIONS = ["about", "philosophy", "work", "lab", "journey", "resume", "contact", "closing"];

const outPath = (name) => `${OUT_DIR}/${name}.png`;

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
  return spawn("pnpm", ["dev"], { cwd: REPO_ROOT, detached: true, stdio: ["ignore", "ignore", "inherit"] });
}

async function stopDevServer(child) {
  if (child && child.pid) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }
  // Turbopack's dev server detaches into its own persistent process, which
  // outlives the CLI above — Next records its real pid in this lock file for
  // exactly this situation ("run kill <pid> to stop it").
  const lockPath = `${REPO_ROOT}.next/dev/lock`;
  try {
    const { pid } = JSON.parse(await readFile(lockPath, "utf8"));
    process.kill(pid, "SIGKILL");
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

/** A transient viewport resize mis-resolves `position: sticky` (the résumé's
 * sticky sidebar lands at the bottom of the image) — resize for real, clip
 * to the element's actual box, then restore the viewport. */
async function shootTall(page, selector, path, width, baseHeight) {
  const locator = page.locator(selector);
  await locator.scrollIntoViewIfNeeded();
  await settle(page, 150);
  let box = await locator.boundingBox();
  if (box && box.height > baseHeight) {
    await page.setViewportSize({ width, height: Math.ceil(box.height) + 100 });
    await locator.scrollIntoViewIfNeeded();
    await settle(page, 150);
    box = await locator.boundingBox();
  }
  if (box) await page.screenshot({ path, clip: box });
  await page.setViewportSize({ width, height: baseHeight });
}

async function shootSections(page, width, baseHeight) {
  for (const id of SECTIONS) {
    if (id === "resume") {
      await shootTall(page, "#resume", outPath(`${id}-${width}`), width, baseHeight);
      continue;
    }
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
  await shootSections(page, 1440, 900);

  // A case-study disclosure, expanded.
  const article = page.locator("#work article").first();
  await article.scrollIntoViewIfNeeded();
  await article.locator('button[aria-expanded]').first().click();
  await settle(page, 250);
  await article.screenshot({ path: outPath("case-study-open-1440") });

  // AI Workflow Lab explorer, a non-default stage selected.
  const explorer = page.locator("#lab-explorer-heading + div");
  await explorer.scrollIntoViewIfNeeded();
  await explorer.locator('[role="tab"]').nth(1).click();
  await settle(page, 250);
  await explorer.screenshot({ path: outPath("lab-stage-1440") });

  // Resume in Deep Dive mode.
  await page.locator("#resume").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Deep Dive", exact: true }).click();
  await settle(page, 250);
  await shootTall(page, "#resume", outPath("resume-deep-1440"), 1440, 900);

  // Contact form with an intent selected (prefills reason + message).
  const contact = page.locator("#contact");
  await contact.scrollIntoViewIfNeeded();
  await page.locator('#contact input[type="radio"]').nth(1).check();
  await settle(page, 400);
  await contact.screenshot({ path: outPath("contact-intent-1440") });

  // Print emulation, from a clean reload (no leftover interactive state).
  await page.reload({ waitUntil: "load", timeout: 60_000 });
  await settle(page);
  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: outPath("print-1440"), fullPage: true });

  await context.close();
}

async function captureMobile(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 60_000 });
  await settle(page);

  await page.screenshot({ path: outPath("full-390"), fullPage: true });
  await shootSections(page, 390, 844);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("#mobile-nav-panel").waitFor({ state: "visible" });
  await settle(page, 250);
  await page.screenshot({ path: outPath("menu-open-390"), fullPage: false });

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

  const browser = await chromium.launch({ executablePath: CHROMIUM_EXECUTABLE });
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
