import { chromium } from "@playwright/test";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
await p.goto("http://localhost:3220/", { waitUntil: "networkidle" });
await p.waitForSelector("[data-companion] svg[data-cat]");
const height = await p.evaluate(() => document.documentElement.scrollHeight);
const streak = new Map(); const out = new Set();
for (let y = 0; y < height; y += 760) {
  await p.evaluate((t) => window.scrollTo(0, t), y);
  for (let i = 0; i < 80; i++) {
    if (i % 10 === 0) await p.keyboard.press("Shift");
    const r = await p.evaluate(() => {
      const res = [];
      const cats = [...document.querySelectorAll("[data-companion] svg[data-cat]")];
      [...document.querySelectorAll("a[href],button")].forEach((el, j) => {
        if (el.closest("[data-companion]")) return;
        const t = el.getBoundingClientRect(); if (!t.width) return;
        cats.forEach((s, k) => { const c = s.getBoundingClientRect(); if (s.dataset.catPose !== "walk" && c.left + 3 < t.right && c.right - 3 > t.left && c.top + 3 < t.bottom && c.bottom - 3 > t.top) res.push({ key: `${k}-${j}`, d: `${k} ${s.dataset.catPose} ${window.__catBranch} ${JSON.stringify(window.__catWant)} on ${(el.textContent||"").trim().slice(0,20)} cat=${c.left|0},${c.top|0} ctl=${t.left|0},${t.top|0},${t.right|0},${t.bottom|0}` }); });
      });
      return res;
    });
    const now = new Set(r.map((x) => x.key));
    for (const k of [...streak.keys()]) if (!now.has(k)) streak.delete(k);
    for (const x of r) { const n = (streak.get(x.key) ?? 0) + 1; streak.set(x.key, n); if (n >= 3) out.add(x.d); if (n === 3 && x.key.startsWith("0-")) { for (let q = 0; q < 8; q++) { console.log("TRACE", await p.evaluate(() => JSON.stringify([document.querySelector('[aria-controls="companion-actions"]').style.transform, window.__catWant?.want, window.__catWant?.pos, window.__catBranch, [...document.querySelectorAll("[data-companion] svg[data-cat]")].map(s=>s.dataset.catPose+"@"+s.getBoundingClientRect().left.toFixed(0))]))); await p.waitForTimeout(60); } } }
    await p.waitForTimeout(100);
  }
}
console.log([...out].slice(0, 12).join("\n"));
await b.close();
