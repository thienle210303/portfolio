import { chromium } from "@playwright/test";
const [base, out] = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto(base, { waitUntil: "networkidle" });
await p.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Record", exact: true }).click();
for (const t of [60, 180, 600]) { await p.waitForTimeout(t === 60 ? 60 : t - 60); await p.screenshot({ path: `${out}/vt-${t}.png`, scale: "css" }); }
await b.close();
