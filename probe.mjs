import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:3100/', { waitUntil:'networkidle' });
const r = await p.evaluate(() => {
  const list = document.querySelector('#journey ol[role="list"]');
  const items = Array.from(list.children);
  const out = [];
  for (let i=0;i<items.length-1;i++){
    const lineA = items[i].querySelector(':scope > [aria-hidden="true"] > .w-px');
    const lineB = items[i+1].querySelector(':scope > [aria-hidden="true"] > .w-px');
    const dotB  = items[i+1].querySelector(':scope > [aria-hidden="true"] > .rounded-full');
    out.push({
      i,
      lineA_bottom: lineA ? +lineA.getBoundingClientRect().bottom.toFixed(1) : null,
      lineB_top:    lineB ? +lineB.getBoundingClientRect().top.toFixed(1) : null,
      dotB_top:     dotB  ? +dotB.getBoundingClientRect().top.toFixed(1) : null,
      trueGap: (lineA && lineB) ? +(lineB.getBoundingClientRect().top - lineA.getBoundingClientRect().bottom).toFixed(1) : null,
      oldMetric: (lineA && dotB) ? +(dotB.getBoundingClientRect().top - lineA.getBoundingClientRect().bottom).toFixed(1) : null,
    });
  }
  return out;
});
console.log('idx | trueGap(lineA.bottom -> lineB.top) | oldMetric(lineA.bottom -> dotB.top)');
r.forEach(x=>console.log(`${String(x.i).padStart(3)} | ${String(x.trueGap).padStart(6)} | ${String(x.oldMetric).padStart(6)}`));
const worst = Math.max(...r.map(x=>x.trueGap ?? 0));
console.log('WORST TRUE GAP:', worst, worst <= 1 ? '=> line is continuous' : '=> REAL GAP');
await b.close();
