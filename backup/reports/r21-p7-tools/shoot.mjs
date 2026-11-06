// node reports/r21-p7-tools/shoot.mjs <url> <w> <h> <theme> <out-prefix> [actions-json]
import { chromium } from "@playwright/test";
const [url, w, h, theme, out, script] = process.argv.slice(2);
const b = await chromium.launch();
const touch = Number(w) < 768 && !out.includes("fine");
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
await p.goto(url, { waitUntil: "networkidle" });
await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
await p.waitForSelector("[data-companion] svg[data-cat]", { timeout: 20000 });
await p.waitForTimeout(800);
const steps = script ? JSON.parse(script) : [];

for (const s of steps) {
  if (s.move) await p.mouse.move(s.move[0], s.move[1], { steps: 10 });
  if (s.wait) await p.waitForTimeout(s.wait);
  if (s.scroll != null) await p.evaluate((y) => window.scrollTo(0, y), s.scroll);
  if (s.eval) console.log(JSON.stringify(await p.evaluate(s.eval)));
  if (s.click) await p.click(s.click);
  if (s.until) {
    const t0 = Date.now(); let ok = false;
    while (Date.now() - t0 < (s.timeout ?? 60000)) {
      if (await p.evaluate(s.until)) { ok = true; break; }
      if (s.jiggle) { await p.mouse.move(s.jiggle[0] + Math.random() * 20, s.jiggle[1] + Math.random() * 20); await p.keyboard.press("Shift"); }
      await p.waitForTimeout(s.every ?? 150);
    }
    console.log("until", ok, (Date.now() - t0) / 1000);
  }
  if (s.shot) {
    const cats = await p.$$eval("[data-companion] svg[data-cat]", (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, e.getAttribute("data-cat-pose")]; }));
    console.log(s.shot, JSON.stringify(cats));
    await p.screenshot({ path: `${out}-${s.shot}.png` });
    if (s.zoom && cats.length) {
      const x0 = Math.max(0, Math.min(...cats.map((c) => c[0])) - 60), y0 = Math.max(0, Math.min(...cats.map((c) => c[1])) - 50);
      const x1 = Math.min(+w, Math.max(...cats.map((c) => c[2])) + 60), y1 = Math.min(+h, Math.max(...cats.map((c) => c[3])) + 30);
      await p.screenshot({ path: `${out}-${s.shot}-zoom.png`, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
    }

  }
}
await b.close();
