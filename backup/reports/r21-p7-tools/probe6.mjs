import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3220/", { waitUntil: "networkidle" });
await p.waitForSelector("[data-companion] svg[data-cat]");
await p.waitForTimeout(3000);
await p.evaluate(() => { const t = document.querySelector("#tree [data-timeline]"); const r = t.getBoundingClientRect(); window.scrollTo({ top: scrollY + r.top + 200, behavior: "instant" }); });
let dir = 1;
for (let i = 0; i < 100; i++) {
  if (i % 8 === 0) { await p.mouse.wheel(0, 80 * dir); dir = -dir; }
  const far = await p.evaluate(() => { const c = [...document.querySelectorAll("[data-companion] svg[data-cat]")].map((s) => s.getBoundingClientRect()); const spots = [[40,120],[1400,120],[40,860],[1400,860],[720,120],[720,860]]; let best = spots[0], bd = -1; for (const [x,y] of spots) { const d = Math.min(...c.map((r) => Math.hypot(x - (r.left + 25), y - (r.top + 21)))); if (d > bd) { bd = d; best = [x,y]; } } return best; });
  await p.mouse.move(far[0] + (i % 2) * 3, far[1]);
  if (i % 4 === 0) console.log(i, await p.evaluate(() => JSON.stringify([window.__catBranch, window.__catWant])));
  await p.waitForTimeout(250);
}
await b.close();
