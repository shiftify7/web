import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4321/', { waitUntil: 'load' });
await p.waitForTimeout(1400); // loader mid-frame — truck centered
await p.screenshot({ path: '/tmp/qa/intro-mid.png' });
await p.waitForTimeout(5200);
await p.screenshot({ path: '/tmp/qa/hp-hero2.png' });
await b.close();
