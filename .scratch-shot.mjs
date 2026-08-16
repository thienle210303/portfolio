import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
await p.emulateMedia({ media: 'print' });
const r = await p.evaluate(() => {
  const panel = document.querySelector('#work [data-print-expand]');
  if (!panel) return { error: 'no panel' };
  const kids = [...panel.children].map(k => ({
    tag: k.tagName, cls: k.className.toString().slice(0, 70),
    vis: getComputedStyle(k).visibility, display: getComputedStyle(k).display,
  }));
  return {
    panelId: panel.id,
    panelVis: getComputedStyle(panel).visibility,
    panelDisplay: getComputedStyle(panel).display,
    children: kids,
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
