import { chromium } from "@playwright/test";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await c.newPage();
await p.goto("http://localhost:3241/", { waitUntil: "networkidle" });
console.log(await p.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const out = {};
  for (const s of ["[data-hero-step='line'] > li:nth-child(2)", "[data-postcard]", "[data-hanging-tags] li > div"]) {
    const el = q(s); const cs = getComputedStyle(el);
    out[s] = { name: cs.animationName, tl: cs.animationTimeline, range: cs.animationRangeStart, anims: el.getAnimations().map(a => [a.animationName, a.timeline?.constructor.name, a.playState]) };
  }
  return out;
}));
await b.close();
