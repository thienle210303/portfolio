/**
 * Measures what a phone actually downloads and how long it waits, against a
 * running production build. Deliberately NOT part of `pnpm verify`: it needs
 * a server, and `verify` must stay hermetic.
 *
 * Usage:
 *   pnpm build
 *   PORT=3100 pnpm start &
 *   pnpm perf
 *
 * Throttling matches the Lighthouse mobile preset's shape: 4x CPU slowdown
 * and roughly 1.6 Mbps down with 150 ms latency. Numbers are comparable
 * between runs on the same machine; they are not Lighthouse scores.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const URL = process.env.PERF_URL || "http://localhost:3100/";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 412, height: 823 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
});

// Observers must exist before the document runs, or LCP and long tasks that
// happen during load are simply never seen.
await context.addInitScript(() => {
  window.__perf = { lcp: 0, lcpEl: "", longTasks: [], cls: 0 };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__perf.lcp = entry.startTime;
      window.__perf.lcpEl = entry.element
        ? entry.element.tagName + "#" + (entry.element.id || "") + "." + String(entry.element.className || "").slice(0, 30)
        : "?";
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__perf.longTasks.push(Math.round(entry.duration));
  }).observe({ type: "longtask", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__perf.cls += entry.value;
  }).observe({ type: "layout-shift", buffered: true });
});

const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");
// NOTE: the parameter is `latency`, not `latencyMs`. The other spelling is
// rejected as "Invalid parameters" with no further explanation.
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150,
  downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8),
  uploadThroughput: Math.round((750 * 1024) / 8),
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

const bytes = { script: 0, stylesheet: 0, font: 0, other: 0 };
page.on("response", async (response) => {
  const type = response.request().resourceType();
  try {
    const sizes = await response.request().sizes();
    const n = sizes.responseBodySize || 0;
    if (type in bytes) bytes[type] += n;
    else bytes.other += n;
  } catch {
    // A response that never finished has no sizes. Skipping it under-reports
    // rather than crashing the run, which is the right trade for a metric.
  }
});

await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(8000);

const metrics = await page.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const fcp = performance.getEntriesByName("first-contentful-paint")[0];
  return {
    fcp: Math.round(fcp ? fcp.startTime : 0),
    load: Math.round(nav.loadEventEnd),
    lcp: Math.round(window.__perf.lcp),
    lcpEl: window.__perf.lcpEl,
    tbt: window.__perf.longTasks.reduce((sum, d) => sum + Math.max(0, d - 50), 0),
    cls: Number(window.__perf.cls.toFixed(4)),
    domNodes: document.querySelectorAll("body *").length,
  };
});

const kb = (n) => (n / 1024).toFixed(1);
const row = [
  kb(bytes.script) + " KB",
  kb(bytes.stylesheet) + " KB",
  kb(bytes.font) + " KB",
  metrics.lcp + " ms",
  metrics.tbt + " ms",
  String(metrics.cls),
  String(metrics.domNodes),
].join(" | ");

console.log("| JS | CSS | Fonts | LCP | TBT | CLS | DOM nodes |");
console.log("|---|---|---|---|---|---|---|");
console.log("| " + row + " |");
console.log("");
console.log("LCP element: " + metrics.lcpEl);
console.log(JSON.stringify({ bytes, ...metrics }, null, 2));

await browser.close();
