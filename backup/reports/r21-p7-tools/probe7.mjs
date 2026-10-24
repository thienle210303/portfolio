import { chromium } from "@playwright/test";
const [w, h] = process.argv.slice(2).map(Number);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.goto("http://localhost:3220/", { waitUntil: "load" });
await p.waitForSelector("[data-companion] svg[data-cat]");
const box = await p.evaluate(() => { const r = document.querySelector("#record").getBoundingClientRect(); return [r.top + scrollY, r.height]; });
const out = new Map();
for (let y = box[0]; y < box[0] + box[1]; y += h * 0.8) {
  await p.evaluate((t) => window.scrollTo(0, t), y);
  for (let i = 0; i < 50; i++) {
    if (i % 10 === 0) await p.keyboard.press("Shift");
    const r = await p.evaluate(() => {
      const res = [];
      for (const s of document.querySelectorAll("[data-companion] svg[data-cat]")) {
        if (s.dataset.catPose === "walk") continue;
        const c = s.getBoundingClientRect();
        const seen = new Set();
        for (const [fx, fy] of [[0.5, 0.3], [0.5, 0.7], [0.2, 0.8], [0.8, 0.8], [0.3, 0.2], [0.7, 0.2]]) {
          for (const el of document.elementsFromPoint(c.left + c.width * fx, c.top + c.height * fy)) {
            if (el.closest("[data-companion]") || !el.closest("#record")) continue;
            const t = el.closest("li, button, a, p, h2, h3, [data-stamp], dialog, img, svg");
            if (t && t.closest("#record")) seen.add(t.tagName + "." + (t.className?.baseVal ?? t.className ?? "").toString().slice(0, 40) + " pe=" + getComputedStyle(t).pointerEvents);
          }
        }
        for (const x of seen) res.push(`${s.dataset.coat} ${s.dataset.catPose} @${c.left | 0},${c.top | 0} on ${x}`);
      }
      return res;
    });
    for (const x of r) out.set(x.replace(/@\S+/, ""), x);
    await p.waitForTimeout(200);
  }
}
console.log([...out.values()].join("\n") || "clean");
await b.close();
