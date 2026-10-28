import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3220/", { waitUntil: "networkidle" });
await p.waitForSelector("[data-companion] svg[data-cat]");
await p.waitForTimeout(2000);
await p.mouse.move(760, 600);
for (let t = 0; t < 20; t++) { await p.mouse.wheel(0, 420); await p.waitForTimeout(800); }
for (let s = 0; s < 36; s++) {
  console.log(s, await p.evaluate(() => JSON.stringify([window.__catBranch, window.__catWant, window.__catSlide])), await p.evaluate(() => JSON.stringify([...document.querySelectorAll("[data-companion] svg[data-cat]")].map((x) => { const r = x.getBoundingClientRect(); return [x.dataset.catPose, r.left | 0, r.top | 0, x.closest("[data-cat-under]") ? "U" : ""]; }))), await p.evaluate(() => scrollY));
  await p.waitForTimeout(1000);
}
await b.close();
