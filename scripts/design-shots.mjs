#!/usr/bin/env node
/**
 * Review sheets for the design workflow (round 25; see design/README.md).
 *
 *   pnpm shots [label]                 capture every section at nine widths,
 *                                      day and night, plus the key states
 *   pnpm shots [label] --widths 390,1440 --themes day --no-states
 *   pnpm shots --diff <a> <b>          compare two captures, image by image
 *   pnpm shots --boards <boards dir>   previews of a round's design boards
 *
 * Output goes to design/.shots/<label>/ (gitignored) with an index.html
 * contact sheet: one row per shot, the widths side by side. Nothing here is a
 * committed baseline: a capture is something to look at, and `--diff` is how a
 * "no visual change" refactor proves itself against a capture taken before it.
 *
 * It shoots a running server: BASE_URL if set, else the production build on
 * :3300 (`pnpm build && pnpm start -p 3300`), else the dev server on :3000.
 * If neither is up it starts `pnpm start -p 3300` itself and stops it after.
 * SHOTS_PORT picks another port (one per git worktree).
 *
 * Stills are taken with motion allowed (so the Diary binds its leaves, the way
 * most visitors see it) and Playwright's `animations: "disabled"`, which
 * finishes every finite animation and holds the endless ones still. Phone and
 * tablet widths are touch contexts, so the cats rest in their box; on the
 * fine-pointer widths the cats roam at random and are hidden, or no two
 * captures would ever match.
 */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SHOTS_ROOT = path.join(REPO_ROOT, "design", ".shots");

/** The nine widths of the responsive contract (design/system/README.md). */
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
const THEMES = ["day", "night"];
const SECTIONS = ["about", "tree", "record", "contact"];
/** Widths the interactive states are shot at: one phone, one desktop. */
const STATE_WIDTHS = [390, 1440];
const isTouch = (width) => width < 1024;

const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const has = (name) => args.includes(name);

async function isUp(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(2000) })).status < 500;
  } catch {
    return false;
  }
}

async function findServer() {
  const candidates = process.env.BASE_URL
    ? [process.env.BASE_URL]
    : process.env.SHOTS_PORT
      ? [`http://localhost:${process.env.SHOTS_PORT}`]
      : ["http://localhost:3300", "http://localhost:3000"];
  for (const url of candidates) if (await isUp(url)) return { url, child: null };
  if (!existsSync(path.join(REPO_ROOT, ".next", "BUILD_ID"))) {
    throw new Error("No server on :3300 or :3000 and no build. Run `pnpm build` first.");
  }
  // SHOTS_PORT lets several checkouts (git worktrees) capture at once, each
  // from its own build, the way E2E_PORT does for the e2e suite.
  const port = process.env.SHOTS_PORT ?? "3300";
  const child = spawn("pnpm", ["start", "-p", port], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  const url = `http://localhost:${port}`;
  for (let i = 0; i < 60; i += 1) {
    if (await isUp(url)) return { url, child };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`\`pnpm start -p ${port}\` did not come up within 30s`);
}

async function settle(page, ms = 250) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

/** Walk the page once so every lazy chunk and every scroll reveal has run. */
async function walk(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
  });
  await settle(page, 600);
}

async function open(browser, base, { width, height }, theme, { reduce = false, route = "/" } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    hasTouch: isTouch(width),
    isMobile: isTouch(width),
    reducedMotion: reduce ? "reduce" : "no-preference",
  });
  await context.addInitScript((value) => {
    try {
      window.localStorage.setItem("theme", value);
    } catch {
      /* private mode: the page falls back to the system scheme */
    }
  }, theme);
  const page = await context.newPage();
  await page.goto(base + route, { waitUntil: "load", timeout: 60_000 });
  if (!isTouch(width)) {
    await page.addStyleTag({ content: "[data-companion]{visibility:hidden !important}" });
  }
  await settle(page);
  return { context, page };
}

const SHOT = { animations: "disabled", caret: "hide" };

/**
 * A section is shot whole, taller than the window, and two fixed things do not
 * survive that: the site header (not a section's own <header>) would be drawn once, wherever the window happened
 * to be, and the sky (`body::before`, one window tall) would stop in a straight
 * line partway down. So for whole-element shots the header is hidden (`fold`
 * is the shot that shows it, and the cats at rest on a touch screen, who
 * wander and would make every diff noisy) and the sky is stretched over the
 * document. One thing still moves between captures: Bé Nhi's mood. The
 * gradient is therefore gentler here than on a real screen, where every
 * window holds the whole of it.
 */
const WHOLE_ELEMENT = `
  body > header, header.sticky, [data-companion] { visibility: hidden !important; }
  :root body { position: relative; }
  :root body::before {
    position: absolute !important;
    height: 100% !important;
    background-size: 100% 100% !important;
  }`;

async function captureStills(browser, base, dir, viewport, theme) {
  const { width } = viewport;
  const out = (name) => path.join(dir, theme, `${name}-${width}.png`);
  const { context, page } = await open(browser, base, viewport, theme);
  await walk(page);
  await page.screenshot({ path: out("fold"), ...SHOT });
  await page.addStyleTag({ content: WHOLE_ELEMENT });
  for (const id of SECTIONS) {
    await page.locator(`#${id}`).screenshot({ path: out(id), ...SHOT });
  }
  await page.locator("footer").last().screenshot({ path: out("footer"), ...SHOT });
  await context.close();

  const resume = await open(browser, base, viewport, theme, { route: "/resume" });
  await resume.page.screenshot({ path: out("resume"), ...SHOT });
  await resume.context.close();
}

/**
 * The states worth looking at before changing a component. Each is its own
 * page load, and a state that cannot be reached is reported, not fatal: a
 * renamed control should cost one shot, not the capture.
 */
const STATES = [
  {
    name: "state-menu-open",
    only: (width) => width < 1024,
    run: async (page) => {
      await page.getByRole("button", { name: "Open menu" }).click();
      await settle(page, 400);
      return page;
    },
  },
  {
    name: "state-tag-turned",
    run: async (page) => {
      await page.locator("#about [data-flip]").first().click();
      await settle(page, 900);
      return page.locator("#about");
    },
  },
  {
    name: "state-focus-ring",
    run: async (page) => {
      for (let i = 0; i < 3; i += 1) await page.keyboard.press("Tab");
      await settle(page, 200);
      return page;
    },
  },
  {
    name: "state-diary-next",
    run: async (page) => {
      const book = page.locator("#record");
      await book.scrollIntoViewIfNeeded();
      for (let i = 0; i < 2; i += 1) {
        await book.getByRole("button", { name: "Next page" }).click();
        await settle(page, 1400);
      }
      return book;
    },
  },
  {
    name: "state-diary-track",
    reduce: true,
    run: async (page) => {
      await page.locator("#record").scrollIntoViewIfNeeded();
      // Half a page along, so the shot shows a scroll track and not a book.
      await page.locator("#record .diary-track").evaluate((track) => {
        track.scrollLeft = track.clientWidth / 2;
      });
      await settle(page, 400);
      return page.locator("#record");
    },
  },
  {
    name: "state-certificate",
    run: async (page) => {
      await page.evaluate(() => {
        window.location.hash = "#diary-certificates";
      });
      await settle(page, 1800);
      await page
        .locator("#record button[commandfor^='certificate-'][command='show-modal']")
        .first()
        .click();
      await settle(page, 600);
      return page;
    },
  },
  {
    name: "state-form-error",
    run: async (page) => {
      const form = page.locator("#contact form").first();
      await form.scrollIntoViewIfNeeded();
      await form.locator('button[type="submit"]').click();
      await settle(page, 500);
      return page.locator("#contact");
    },
  },
  {
    name: "state-ask-answered",
    run: async (page) => {
      const ask = page.locator("#ask");
      await ask.scrollIntoViewIfNeeded();
      await ask.locator('[aria-label="Try asking"] button').first().click();
      await settle(page, 2500);
      return ask;
    },
  },
  {
    name: "state-resume-dialog",
    only: (width) => width >= 640,
    run: async (page) => {
      const link = page.locator("#contact").getByRole("link", { name: "Résumé", exact: true });
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await settle(page, 1200);
      return page;
    },
  },
];

async function captureStates(browser, base, dir, viewport, theme, failures) {
  for (const state of STATES) {
    if (state.only && !state.only(viewport.width)) continue;
    const { context, page } = await open(browser, base, viewport, theme, { reduce: state.reduce });
    try {
      await walk(page);
      const target = await state.run(page);
      if (target !== page) await page.addStyleTag({ content: WHOLE_ELEMENT });
      await target.screenshot({
        path: path.join(dir, theme, `${state.name}-${viewport.width}.png`),
        ...SHOT,
      });
    } catch (error) {
      failures.push(`${state.name} @ ${viewport.width} ${theme}: ${String(error.message).split("\n")[0]}`);
    } finally {
      await context.close();
    }
  }
}

/** index.html: one row per shot name, the widths side by side, per theme. */
async function writeSheet(dir, label) {
  const rows = [];
  for (const theme of THEMES) {
    const themeDir = path.join(dir, theme);
    if (!existsSync(themeDir)) continue;
    const files = (await readdir(themeDir)).filter((file) => file.endsWith(".png"));
    const groups = new Map();
    for (const file of files) {
      const match = /^(.*)-(\d+)\.png$/.exec(file);
      if (!match) continue;
      if (!groups.has(match[1])) groups.set(match[1], []);
      groups.get(match[1]).push({ width: Number(match[2]), file });
    }
    const order = ["fold", ...SECTIONS, "footer", "resume"];
    const names = [...groups.keys()].sort(
      (a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b),
    );
    for (const name of names) {
      const cells = groups
        .get(name)
        .sort((a, b) => a.width - b.width)
        .map(
          ({ width, file }) =>
            `<figure><figcaption>${width}</figcaption><a href="${theme}/${file}"><img loading="lazy" src="${theme}/${file}" style="width:${Math.round(Math.min(width, 1920) * 0.25)}px"></a></figure>`,
        )
        .join("");
      rows.push(`<section><h2>${name} <small>${theme}</small></h2><div class="row">${cells}</div></section>`);
    }
  }
  const html = `<!doctype html><meta charset="utf-8"><title>Shots: ${label}</title>
<style>
body{font:14px/1.4 ui-monospace,monospace;margin:24px;background:#f4f4f1;color:#1c1c1a}
h2{font-size:14px;margin:32px 0 8px} small{opacity:.6}
.row{display:flex;gap:12px;align-items:flex-start;overflow-x:auto;padding-bottom:8px}
figure{margin:0;flex:none} figcaption{font-size:11px;opacity:.7;margin-bottom:4px}
img{display:block;border:1px solid #cfcfc8;background:#fff}
</style><h1>Shots: ${label}</h1>${rows.join("\n")}`;
  await writeFile(path.join(dir, "index.html"), html);
}

async function capture() {
  const label = args.find((arg) => !arg.startsWith("--") && arg !== flag("--widths") && arg !== flag("--themes")) ?? "current";
  const widths = flag("--widths")?.split(",").map(Number);
  const themes = flag("--themes")?.split(",") ?? THEMES;
  const viewports = widths ? VIEWPORTS.filter(({ width }) => widths.includes(width)) : VIEWPORTS;
  const dir = path.join(SHOTS_ROOT, label);
  await rm(dir, { recursive: true, force: true });
  for (const theme of themes) await mkdir(path.join(dir, theme), { recursive: true });

  const server = await findServer();
  console.log(`Shooting ${server.url} into design/.shots/${label}/`);
  const browser = await chromium.launch();
  const failures = [];
  try {
    for (const theme of themes) {
      for (const viewport of viewports) {
        await captureStills(browser, server.url, dir, viewport, theme);
        if (!has("--no-states") && STATE_WIDTHS.includes(viewport.width)) {
          await captureStates(browser, server.url, dir, viewport, theme, failures);
        }
        console.log(`  ${theme} ${viewport.width}`);
      }
    }
  } finally {
    await browser.close();
    if (server.child?.pid) {
      try {
        process.kill(-server.child.pid, "SIGTERM");
      } catch {
        /* already gone */
      }
    }
  }
  await writeSheet(dir, label);
  if (failures.length) {
    console.warn(`\n${failures.length} state(s) not captured:`);
    for (const failure of failures) console.warn(`  ${failure}`);
  }
  console.log(`Done: design/.shots/${label}/index.html`);
}

/**
 * Compare two captures. The pixels are compared in Chromium on a canvas, so
 * this needs no image library. A channel must move by more than 8 to count,
 * and an image is "changed" above 0.02% of its pixels or when its size moved.
 */
async function diff(a, b) {
  const dirA = path.join(SHOTS_ROOT, a);
  const dirB = path.join(SHOTS_ROOT, b);
  const out = path.join(SHOTS_ROOT, `diff-${a}-${b}`);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const changed = [];
  let same = 0;
  for (const theme of THEMES) {
    if (!existsSync(path.join(dirA, theme))) continue;
    for (const file of (await readdir(path.join(dirA, theme))).sort()) {
      const pathB = path.join(dirB, theme, file);
      if (!existsSync(pathB)) {
        changed.push({ file: `${theme}/${file}`, note: `missing in ${b}` });
        continue;
      }
      const [dataA, dataB] = await Promise.all(
        [path.join(dirA, theme, file), pathB].map(async (p) => `data:image/png;base64,${(await readFile(p)).toString("base64")}`),
      );
      const result = await page.evaluate(async ([srcA, srcB]) => {
        const load = (src) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        const [imgA, imgB] = await Promise.all([load(srcA), load(srcB)]);
        const w = Math.max(imgA.width, imgB.width);
        const h = Math.max(imgA.height, imgB.height);
        const read = (img) => {
          const canvas = new OffscreenCanvas(w, h);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          return ctx.getImageData(0, 0, w, h);
        };
        const pa = read(imgA);
        const pb = read(imgB);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        const overlay = ctx.createImageData(w, h);
        let count = 0;
        for (let i = 0; i < pa.data.length; i += 4) {
          const moved =
            Math.abs(pa.data[i] - pb.data[i]) > 8 ||
            Math.abs(pa.data[i + 1] - pb.data[i + 1]) > 8 ||
            Math.abs(pa.data[i + 2] - pb.data[i + 2]) > 8;
          if (moved) count += 1;
          const grey = (pb.data[i] + pb.data[i + 1] + pb.data[i + 2]) / 3;
          overlay.data[i] = moved ? 255 : 200 + grey * 0.2;
          overlay.data[i + 1] = moved ? 0 : 200 + grey * 0.2;
          overlay.data[i + 2] = moved ? 80 : 200 + grey * 0.2;
          overlay.data[i + 3] = 255;
        }
        ctx.putImageData(overlay, 0, 0);
        return {
          ratio: count / (w * h),
          resized: imgA.width !== imgB.width || imgA.height !== imgB.height,
          sizes: `${imgA.width}×${imgA.height} → ${imgB.width}×${imgB.height}`,
          png: count ? canvas.toDataURL("image/png") : null,
        };
      }, [dataA, dataB]);
      if (result.resized || result.ratio > 0.0002) {
        const name = `${theme}-${file}`;
        if (result.png) await writeFile(path.join(out, name), Buffer.from(result.png.split(",")[1], "base64"));
        changed.push({
          file: `${theme}/${file}`,
          note: `${(result.ratio * 100).toFixed(2)}% of pixels${result.resized ? `, size ${result.sizes}` : ""}`,
          overlay: name,
        });
      } else {
        same += 1;
      }
    }
  }
  await browser.close();
  const rows = changed
    .map(
      ({ file, note, overlay }) =>
        `<section><h2>${file} <small>${note}</small></h2><div class="row"><img loading="lazy" src="../${a}/${file}"><img loading="lazy" src="../${b}/${file}">${overlay ? `<img loading="lazy" src="${overlay}">` : ""}</div></section>`,
    )
    .join("\n");
  await writeFile(
    path.join(out, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Diff ${a} → ${b}</title><style>body{font:14px ui-monospace,monospace;margin:24px}h2{font-size:14px;margin:28px 0 8px}small{opacity:.6}.row{display:flex;gap:12px;align-items:flex-start;overflow-x:auto}img{width:30%;border:1px solid #ccc}</style><h1>${a} → ${b}: ${changed.length} changed, ${same} same</h1>${rows}`,
  );
  console.log(`${changed.length} changed, ${same} same`);
  for (const { file, note } of changed) console.log(`  ${file}  ${note}`);
  console.log(`design/.shots/diff-${a}-${b}/index.html`);
}

/**
 * Previews of a round's boards: each boards/*.html is a small responsive page,
 * shot whole at the widths its `<meta name="board-widths">` names, in day, and
 * in night at the first of them. Written beside the boards, in ../previews/,
 * which is committed: a board's preview is part of the design record.
 */
async function boards(dir) {
  const boardsDir = path.resolve(REPO_ROOT, dir);
  const out = path.join(boardsDir, "..", "previews");
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch();
  const names = (await readdir(boardsDir)).filter((file) => file.endsWith(".html")).sort();
  for (const file of names) {
    const html = await readFile(path.join(boardsDir, file), "utf8");
    const widths = /name="board-widths" content="([^"]+)"/.exec(html)?.[1].split(",").map(Number);
    if (!widths) continue;
    const name = file.replace(/\.html$/, "");
    for (const [index, width] of widths.entries()) {
      for (const theme of index === 0 ? THEMES : ["day"]) {
        const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
        await page.goto(`file://${path.join(boardsDir, file)}?theme=${theme}`);
        await settle(page, 400);
        const suffix = theme === "night" ? "-night" : "";
        await page.screenshot({ path: path.join(out, `${name}-${width}${suffix}.png`), fullPage: true });
        await page.close();
      }
    }
    console.log(`  ${name}: ${widths.join(", ")}`);
  }
  await browser.close();
  console.log(`Previews in ${path.relative(REPO_ROOT, out)}/`);
}

const diffAt = args.indexOf("--diff");
const boardsAt = args.indexOf("--boards");
const job =
  boardsAt !== -1
    ? boards(args[boardsAt + 1])
    : diffAt === -1
      ? capture()
      : diff(args[diffAt + 1], args[diffAt + 2]);
job.catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
