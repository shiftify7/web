import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 320, height: 700 } });
await p.goto('http://localhost:4321/services/house-shifting/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
console.log('scrollW', await p.evaluate(() => document.documentElement.scrollWidth));
const wide = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > 320.5 || r.left < -0.5) out.push([el.tagName, el.className.toString().slice(0, 70), Math.round(r.left), Math.round(r.right)]);
  });
  return out.slice(0, 20);
});
console.log(wide);
await b.close();
