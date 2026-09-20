import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('http://localhost:4321/packers-and-movers-delhi/dwarka/', { waitUntil: 'load' });
await p.waitForTimeout(1200);
console.log(await p.evaluate(() => ({
  city: document.getElementById('lf-wcity')?.value,
  fromLoc: document.getElementById('lf-floc')?.value,
})));
await p.evaluate(() => document.getElementById('lead-form').scrollIntoView({ block: 'center' }));
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/qa/loc-form.png', clip: await (await p.$('.quote-wrap2')).boundingBox() });
// route page prefill — intercity
await p.goto('http://localhost:4321/packers-and-movers-delhi-to-mumbai/', { waitUntil: 'load' });
await p.waitForTimeout(1200);
console.log(await p.evaluate(() => ({
  fcity: document.getElementById('lf-fcity')?.value,
  fstate: document.getElementById('lf-fstate')?.value,
  tcity: document.getElementById('lf-tcity')?.value,
  tstate: document.getElementById('lf-tstate')?.value,
})));
await b.close();
