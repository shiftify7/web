import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4321/', { waitUntil: 'load' });
await p.waitForTimeout(4200);
await p.screenshot({ path: '/tmp/qa/home-full.png', fullPage: true });
// hero only after intro completes
await p.screenshot({ path: '/tmp/qa/home-hero.png' });
await b.close();
