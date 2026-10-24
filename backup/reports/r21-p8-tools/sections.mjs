// node reports/r21-p8-tools/sections.mjs <baseURL> <outDir> <label> [sizes=all] [themes=day,night] [browser=chromium]
// Viewport shots (not fullPage: the fixed sky fakes a seam) of every section, from its top down.
import { chromium, webkit } from "@playwright/test";
import { mkdirSync } from "node:fs";
const [base, out, label, sizeArg, themeArg, engine] = process.argv.slice(2);
const ALL = { 320: [320, 1000], 360: [360, 1000], 390: [390, 1100], 414: [414, 1100], 768: [768, 1300], "844x390": [844, 390], 1024: [1024, 1100], 1280: [1280, 1100], 1366: [1366, 1000], 1440: [1440, 1100], 1920: [1920, 1200] };
const sizes = sizeArg && sizeArg !== "all" ? sizeArg.split(",") : Object.keys(ALL);
const themes = (themeArg || "day,night").split(",");
mkdirSync(out, { recursive: true });
const b = await (engine === "webkit" ? webkit : chromium).launch();
for (const s of sizes) {
  const [w, h] = ALL[s];
  for (const theme of themes) {
    const touch = w < 1024;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch && engine !== "webkit" ? true : undefined });
    const p = await ctx.newPage();
    await p.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
    await p.goto(base, { waitUntil: "networkidle" });
    await p.waitForTimeout(900);
    for (const id of (process.env.IDS || "about,tree,record,contact").split(",")) {
      const { top, height } = await p.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { top: r.top + scrollY, height: r.height }; }, id);
      const step = h - 120;
      const n = process.env.ONE ? 1 : Math.min(8, Math.max(1, Math.ceil((height - 40) / step)));
      for (let i = 0; i < n; i++) {
        const y = id === "about" && i === 0 ? 0 : Math.max(0, top - 56 + i * step);
        await p.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
        await p.waitForTimeout(700);
        await p.screenshot({ path: `${out}/${label}-${s}-${theme}-${id}-${i}.png` });
      }
    }
    await ctx.close();
  }
}
await b.close();
