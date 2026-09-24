import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://localhost:4321/', { waitUntil: 'load' });
await p.waitForTimeout(4000);
await p.evaluate(() => document.getElementById('lead-section').scrollIntoView({ block: 'start' }));
await p.waitForTimeout(600);
await p.screenshot({ path: '/tmp/qa/lead-mobile.png' });
// mobile nav drawer
const p2 = await b.newPage({ viewport: { width: 390, height: 844 } });
await p2.goto('http://localhost:4321/', { waitUntil: 'load' });
await p2.waitForTimeout(4000);
await p2.click('.mnav-burger');
await p2.waitForTimeout(600);
await p2.screenshot({ path: '/tmp/qa/mnav.png' });
await b.close();
