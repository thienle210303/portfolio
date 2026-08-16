import { chromium } from '@playwright/test';
const OUT = '/tmp/claude-0/-home-user-portfolio/625391a5-3e1d-50a1-9382-08424c01ebd1/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
for (const id of ['work','lab','resume']) {
  await p.evaluate(i => { const e = document.getElementById(i);
    window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 64); }, id);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/t-${id}.png` });
}
const s = await p.evaluate(() => {
  const leaves = [...document.querySelectorAll('main *')].filter(e => e.children.length===0 && e.textContent.trim());
  const up = leaves.filter(e => { const c = getComputedStyle(e);
    return c.fontFamily.toLowerCase().includes('plex mono') && c.textTransform === 'uppercase'; });
  const bordered = [...document.querySelectorAll('main *')].filter(e => { const c = getComputedStyle(e);
    return parseFloat(c.borderTopWidth)+parseFloat(c.borderBottomWidth)+parseFloat(c.borderLeftWidth)+parseFloat(c.borderRightWidth) > 0; });
  return { leaves: leaves.length, upperMono: up.length, bordered: bordered.length };
});
console.log(JSON.stringify(s));
await b.close();
