import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
await p.goto("http://localhost:3220/", { waitUntil: "networkidle" });
await p.waitForSelector("[data-companion] svg[data-cat]");
const height = await p.evaluate(() => document.documentElement.scrollHeight);
let done = false;
for (let y = 0; y < height && !done; y += 690) {
  await p.evaluate((t) => window.scrollTo(0, t), y);
  for (let i = 0; i < 60 && !done; i++) {
    if (i % 10 === 0) await p.keyboard.press("Shift");
    const r = await p.evaluate(() => {
      const cats = [...document.querySelectorAll("[data-companion] svg[data-cat]")];
      for (const el of document.querySelectorAll("a[href],button")) {
        if (el.closest("[data-companion]")) continue;
        const t = el.getBoundingClientRect(); if (!t.width) continue;
        for (const s of cats) { const c = s.getBoundingClientRect(); if (s.dataset.catPose === "walk" && !s.closest("[data-cat-under]") && c.left + 3 < t.right && c.right - 3 > t.left && c.top + 3 < t.bottom && c.bottom - 3 > t.top) {
          const node = s.closest("[data-companion] > *"); const nr = node.getBoundingClientRect();
          const hits = document.elementsFromPoint((c.left + c.right) / 2, (c.top + c.bottom) / 2).map((e) => e.tagName + (e.closest("[data-companion]") ? "*" : "") + "." + (e.className?.baseVal ?? e.className ?? "").toString().slice(0, 30) + ":" + getComputedStyle(e).pointerEvents);
          return { ctl: (el.textContent || "").slice(0, 20), t: [t.left, t.top, t.right, t.bottom], c: [c.left, c.top, c.right, c.bottom], node: node.tagName + " " + [nr.left, nr.top, nr.width, nr.height].map(Math.round), clip: node.dataset.clip, style: node.style.clipPath, hits };
        } }
      }
      return null;
    });
    if (r) { console.log(JSON.stringify(r, null, 1)); done = true; }
    await p.waitForTimeout(100);
  }
}
await b.close();
