import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage();
const msgs = [];
p.on('console', m => msgs.push(`[${m.type()}] ${m.text()}`));
p.on('pageerror', e => msgs.push(`[pageerror] ${e.message}`));
await p.goto('http://localhost:3100/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
// interact to force client hydration paths
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight/2));
await p.waitForTimeout(1000);
const bad = msgs.filter(m => /hydrat|mismatch|did not match|error/i.test(m));
console.log('TOTAL CONSOLE MSGS:', msgs.length);
console.log('SUSPICIOUS:', bad.length);
bad.forEach(m => console.log('  ', m.slice(0,300)));
if (bad.length === 0) console.log('  none — clean');
await b.close();
