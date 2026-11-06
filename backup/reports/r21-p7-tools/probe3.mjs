import { chromium } from "@playwright/test";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
const p = await ctx.newPage();
await p.goto("http://localhost:3220/", { waitUntil: "networkidle" });
await p.waitForSelector("[data-companion] svg[data-cat]");
const height = await p.evaluate(() => document.documentElement.scrollHeight);
const seen = new Map();
for (let y = 0; y < height; y += 690) {
  await p.evaluate((t) => window.scrollTo(0, t), y);
  for (let i = 0; i < 80; i++) {
    if (i % 10 === 0) await p.keyboard.press("Shift");
    const r = await p.evaluate(() => {
      const out = [];
      const cats = [...document.querySelectorAll("[data-companion] svg[data-cat]")];
      for (const el of document.querySelectorAll("a[href],button")) {
        if (el.closest("[data-companion]")) continue;
        const t = el.getBoundingClientRect(); if (!t.width) continue;
        cats.forEach((s, k) => { const c = s.getBoundingClientRect(); if (c.left + 3 < t.right && c.right - 3 > t.left && c.top + 3 < t.bottom && c.bottom - 3 > t.top) out.push(`${k} ${s.dataset.catPose} ${window.__catBranch} on ${(el.textContent||"").trim().slice(0,20)} cat=${c.left|0},${c.top|0} ctl=${t.left|0},${t.top|0},${t.right|0},${t.bottom|0} pe=${getComputedStyle(el).pointerEvents}`); });
      }
      return out;
    });
    for (const x of r) { const k = x.replace(/cat=\S+/, ""); const v = seen.get(k); seen.set(k, v ? v.replace(/ n=\d+$/, "") + " .. " + x.match(/cat=\S+/)[0] + " n=" + ((+(v.match(/n=(\d+)$/)?.[1] ?? 1)) + 1) : x + " n=1"); }
    await p.waitForTimeout(100);
  }
}
console.log([...seen.values()].join("\n"));
await b.close();
