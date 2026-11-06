import { chromium } from "@playwright/test";
const b = await chromium.launch();
for (const t of ["day","night"]) {
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
await p.addInitScript((t) => localStorage.setItem("theme", t), t);
await p.goto("http://localhost:3241/", { waitUntil: "networkidle" });
await p.evaluate(() => scrollTo(0, 1500));
await p.click("button[aria-controls='mobile-nav-panel']");
await p.waitForTimeout(400);
await p.screenshot({ path: process.argv[2] + `/menu-${t}.png` });
await ctx.close();
}
await b.close();
