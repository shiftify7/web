import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4321/', { waitUntil: 'load' });
await p.waitForTimeout(4200);
// hero state after intro
await p.screenshot({ path: '/tmp/qa/hp-hero.png' });
// why-choose-us section
const usp = await p.$('.usp-grid');
await usp.scrollIntoViewIfNeeded();
await p.waitForTimeout(600);
await p.screenshot({ path: '/tmp/qa/hp-usp.png', clip: await usp.boundingBox() });
// mobile hero
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
await m.goto('http://localhost:4321/', { waitUntil: 'load' });
await m.waitForTimeout(4200);
await m.screenshot({ path: '/tmp/qa/hp-mob.png' });
await b.close();
console.log('done');
