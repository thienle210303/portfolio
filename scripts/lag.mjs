/**
 * Measures desktop lag against a running production build: scroll smoothness
 * at 4x CPU and main-thread cost at rest in each section. Deliberately NOT part of `pnpm verify`: it needs a server.
 *
 * Usage:
 *   pnpm build
 *   PORT=3100 pnpm start &
 *   pnpm lag
 *
 * Prints one JSON object. Headless Chromium has no real GPU, so this sees
 * main-thread JS and layout cost only. Numbers are comparable between runs on
 * the same machine. `rafPerSec` counts requestAnimationFrame calls scheduled,
 * not frames painted, so it can exceed the display rate. `rest` is unthrottled; `scroll4x` runs
 * at 4x CPU slowdown. Each `rest` sample starts 10 s after the jump to its
 * section: the jump is a scroll, a scroll tells the cats somebody is here, and
 * for some seconds after it they walk and talk, which is motion, not rest.
 *
 * `scroll4x.bands` splits that scroll by the section holding the viewport
 * centre when each frame ran (section bounds read once, after the scroll), so
 * a change in one section's cost is not confused with a change in page length:
 * the totals are means over every frame, and a shorter page drops frames from
 * whichever section got shorter. `frames` and `scrollHeight` give that length.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const targetUrl = process.env.LAG_URL || "http://localhost:3100/";
const SECTIONS = ["about", "tree", "contact"];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// Counters must exist before the page's own scripts run.
await context.addInitScript(() => {
  const lag = (window.__lag = { raf: 0, hits: 0, longTasks: [] });
  const elementsFromPoint = document.elementsFromPoint.bind(document);
  document.elementsFromPoint = (x, y) => {
    lag.hits++;
    return elementsFromPoint(x, y);
  };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => {
    lag.raf++;
    return raf(cb);
  };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) lag.longTasks.push({ start: e.startTime, duration: e.duration });
  }).observe({ type: "longtask", buffered: true });
});

async function open(throttle) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  await page.goto(targetUrl, { waitUntil: "load" });
  await page.waitForTimeout(2000); // let hydration and the first idle work finish
  return { page, cdp };
}

const round = (n, d = 1) => Number(n.toFixed(d));
const result = {};

// Scroll top to bottom, 40 px per rAF, 4x CPU.
{
  const { page } = await open(4);
  const run = await page.evaluate(
    (sections) =>
      new Promise((resolve) => {
        const lag = window.__lag;
        const tasksBefore = lag.longTasks.length;
        const deltas = [];
        const centres = [];
        let last = performance.now();
        const t0 = last;
        const step = (now) => {
          deltas.push(now - last);
          centres.push(scrollY + innerHeight / 2);
          last = now;
          const max = document.documentElement.scrollHeight - innerHeight;
          if (scrollY >= max) {
            const bounds = sections.map((id) => {
              const rect = document.getElementById(id).getBoundingClientRect();
              return { id, top: rect.top + scrollY, bottom: rect.bottom + scrollY };
            });
            const bands = centres.map(
              (y) => bounds.find((b) => y >= b.top && y < b.bottom)?.id ?? "other",
            );
            resolve({
              deltas,
              bands,
              wall: now - t0,
              longTasks: lag.longTasks.length - tasksBefore,
              scrollHeight: document.documentElement.scrollHeight,
            });
            return;
          }
          window.scrollBy(0, 40);
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    SECTIONS,
  );
  const bands = {};
  for (const id of [...SECTIONS, "other"]) {
    const deltas = run.deltas.filter((_, i) => run.bands[i] === id);
    if (deltas.length === 0) continue;
    bands[id] = {
      frames: deltas.length,
      fps: round((deltas.length / deltas.reduce((a, b) => a + b, 0)) * 1000),
      drops: deltas.filter((d) => d > 33).length,
      worstFrameMs: Math.round(Math.max(...deltas)),
    };
  }
  result.scroll4x = {
    fps: round((run.deltas.length / run.wall) * 1000),
    drops: run.deltas.filter((d) => d > 33).length,
    worstFrameMs: Math.round(Math.max(...run.deltas)),
    longTasks: run.longTasks,
    frames: run.deltas.length,
    scrollHeight: run.scrollHeight,
    bands,
  };
  await page.close();
}

// Resting cost per section, unthrottled.
{
  const { page, cdp } = await open(1);
  await cdp.send("Performance.enable");
  const taskDuration = async () =>
    (await cdp.send("Performance.getMetrics")).metrics.find((m) => m.name === "TaskDuration").value;
  result.rest = {};
  for (const id of SECTIONS) {
    await page.evaluate((i) => document.getElementById(i).scrollIntoView({ behavior: "instant" }), id);
    await page.waitForTimeout(10_000);
    const before = await page.evaluate(() => ({ raf: window.__lag.raf, hits: window.__lag.hits }));
    const t0 = await taskDuration();
    const w0 = Date.now();
    await page.waitForTimeout(5000);
    const wall = (Date.now() - w0) / 1000;
    const busy = (await taskDuration()) - t0;
    const after = await page.evaluate(() => ({ raf: window.__lag.raf, hits: window.__lag.hits }));
    result.rest[id] = {
      busyPct: round((busy / wall) * 100),
      rafPerSec: round((after.raf - before.raf) / wall),
      hitTestsPer5s: after.hits - before.hits,
    };
  }
  await page.close();
}

await browser.close();
console.log(JSON.stringify(result, null, 2));
