// node reports/r21-p8-tools/motion-probe.mjs <base> <outDir> : frames mid-entrance
import { chromium } from "@playwright/test";
const [base, out] = process.argv.slice(2);
const b = await chromium.launch();
async function ctx(w, h, theme = "day") {
  const c = await b.newContext({ viewport: { width: w, height: h } });
  const p = await c.newPage();
  await p.addInitScript((t) => localStorage.setItem("theme", t), theme);
  return [c, p];
}
// Hero at 1440: frames of the load sway.
{
  const [c, p] = await ctx(1440, 900);
  await p.goto(base);
  for (const t of [150, 450, 900]) { await p.waitForTimeout(t === 150 ? 150 : 300); await p.screenshot({ path: `${out}/m-hero-1440-${t}.png`, clip: { x: 0, y: 56, width: 1440, height: 450 } }); }
  await c.close();
}
// Section entrances at given offsets of the section top from the window's bottom.
for (const [w, h, id] of [[1440, 900, "tree"], [1440, 900, "record"], [1440, 900, "contact"], [390, 844, "tree"], [390, 844, "about"], [390, 844, "record"], [390, 844, "contact"]]) {
  const [c, p] = await ctx(w, h);
  await p.goto(base, { waitUntil: "networkidle" });
  const sel = { tree: "[data-hanging-tags] li", about: "[data-hero-step='line'] > li:nth-child(2)", record: "[data-notebook]", contact: "[data-postcard]" }[id];
  if (process.env.NOSNAP) await p.evaluate(() => { document.documentElement.style.scrollSnapType = "none"; });
  const top = await p.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, sel);
  for (const f of [0.15, 0.4, 0.8]) {
    await p.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), top - h + h * f);
    await p.waitForTimeout(250);
    const tf = await p.evaluate((s) => getComputedStyle(document.querySelector(s).matches("[data-hanging-tags] li") ? document.querySelector(s + " > div") : document.querySelector(s).matches("[data-notebook]") ? document.querySelector(".record-page-left") : document.querySelector(s)).transform, sel);
    console.log(w, id, f, tf);
    await p.screenshot({ path: `${out}/m-${id}-${w}-${f}.png` });
  }
  await c.close();
}
await b.close();
