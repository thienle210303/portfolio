// node probe.mjs <w> <h> <touch 0|1> <target-js> <theme> <seconds> <out>
import { chromium } from "@playwright/test";
const [w, h, touch, target, theme, secs, out] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: touch === "1", isMobile: touch === "1", deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
await p.goto("http://localhost:3220/", { waitUntil: "networkidle" });
await p.waitForSelector("[data-companion] svg[data-cat]");
await p.evaluate(`(()=>{const el=${target};const r=el.getBoundingClientRect();window.scrollTo(0,scrollY+r.top-innerHeight/2+r.height/2)})()`);
const hits = []; const t0 = Date.now(); let k = 0;
while (Date.now() - t0 < secs * 1000) {
  if (touch !== "1" && k % 6 === 0) { await p.mouse.move(+w - 30, +h - 30 - Math.random() * 20); await p.keyboard.press("Shift"); }
  const r = await p.evaluate(`(()=>{const el=${target};const t=el.getBoundingClientRect();return [...document.querySelectorAll("[data-companion] svg[data-cat]")].map(s=>{const c=s.getBoundingClientRect();return {pose:s.dataset.catPose,hit:c.left<t.right&&c.right>t.left&&c.top<t.bottom&&c.bottom>t.top,c:[c.left|0,c.top|0]}}).filter(x=>x.hit)})()`);
  if (r.length) hits.push({ t: Date.now() - t0, r });
  if (r.length && out && !hits.shot) { await p.screenshot({ path: out }); hits.shot = 1; }
  k++; await p.waitForTimeout(300);
}
console.log(JSON.stringify(hits.slice(0, 8)), hits.length);
await b.close();
