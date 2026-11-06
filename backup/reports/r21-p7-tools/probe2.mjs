import { chromium } from "@playwright/test";
const [w, h, target, secs, runs] = process.argv.slice(2);
const b = await chromium.launch();
for (let run = 0; run < +runs; run++) {
  const ctx = await b.newContext({ viewport: { width: +w, height: +h } });
  const p = await ctx.newPage();
  await p.goto("http://localhost:3220/", { waitUntil: "networkidle" });
  await p.waitForSelector("[data-companion] svg[data-cat]");
  await p.evaluate(`(()=>{const el=${target};const r=el.getBoundingClientRect();window.scrollTo(0,scrollY+r.top-innerHeight/2+r.height/2)})()`);
  const seen = new Set();
  for (let i = 0; i < secs * 5; i++) {
    if (i % 5 === 0) await p.keyboard.press("Shift");
    const r = await p.evaluate(`(()=>{const el=${target};const t=el.getBoundingClientRect();const hits=[...document.querySelectorAll("[data-companion] svg[data-cat]")].map((s,k)=>{const c=s.getBoundingClientRect();return {k,pose:s.dataset.catPose,hit:c.left+3<t.right&&c.right-3>t.left&&c.top+3<t.bottom&&c.bottom-3>t.top,c:[c.left|0,c.top|0]}}).filter(x=>x.hit);return hits.length?JSON.stringify({hits,branch:window.__catBranch,t:[t.left|0,t.top|0,t.right|0,t.bottom|0]}):null})()`);
    if (r) seen.add(r);
    await p.waitForTimeout(200);
  }
  console.log(run, [...seen].slice(0, 4).join("\n"));
  await ctx.close();
}
await b.close();
