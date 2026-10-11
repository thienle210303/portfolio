/**
 * Measures desktop lag against a running production build: scroll smoothness
 * at 4x CPU, main-thread cost at rest in each section, and the stall on first
 * entry to Worlds. Deliberately NOT part of `pnpm verify`: it needs a server.
 *
 * Usage:
 *   pnpm build
 *   PORT=3100 pnpm start &
 *   pnpm lag
 *
 * Prints one JSON object. Headless Chromium has no real GPU, so this sees
 * main-thread JS and layout cost only. Numbers are comparable between runs on
 * the same machine. `rafPerSec` counts requestAnimationFrame calls scheduled,
 * not frames painted, so it can exceed the display rate. `rest` is unthrottled; `scroll4x` and the Worlds entry run
 * at 4x CPU slowdown. Each `rest` sample starts 10 s after the jump to its
 * section: the jump is a scroll, a scroll tells the cats somebody is here, and
 * for some seconds after it they walk and talk, which is motion, not rest.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const targetUrl = process.env.LAG_URL || "http://localhost:3100/";
const SECTIONS = ["about", "worlds", "tree", "contact"];

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
    () =>
      new Promise((resolve) => {
        const lag = window.__lag;
        const tasksBefore = lag.longTasks.length;
        const deltas = [];
        let last = performance.now();
        const t0 = last;
        const step = (now) => {
          deltas.push(now - last);
          last = now;
          const max = document.documentElement.scrollHeight - innerHeight;
          if (scrollY >= max) {
            resolve({ deltas, wall: now - t0, longTasks: lag.longTasks.length - tasksBefore });
            return;
          }
          window.scrollBy(0, 40);
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
  );
  result.scroll4x = {
    fps: round((run.deltas.length / run.wall) * 1000),
    drops: run.deltas.filter((d) => d > 33).length,
    worstFrameMs: Math.round(Math.max(...run.deltas)),
    longTasks: run.longTasks,
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

// First entry to Worlds on a fresh load, 4x CPU: worst long task within 3 s.
{
  const { page } = await open(4);
  const worst = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const el = document.getElementById("worlds");
        const io = new IntersectionObserver((entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io.disconnect();
          const t0 = performance.now();
          setTimeout(() => {
            const inWindow = window.__lag.longTasks.filter((t) => t.start >= t0 - 100 && t.start <= t0 + 3000);
            resolve(Math.max(0, ...inWindow.map((t) => t.duration)));
          }, 3000);
        });
        io.observe(el);
        el.scrollIntoView({ behavior: "instant" });
      }),
  );
  result.worldsEntryWorstTaskMs = Math.round(worst);
  await page.close();
}

await browser.close();
console.log(JSON.stringify(result, null, 2));
