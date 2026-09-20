import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 320, height: 700 } });
await p.goto('http://localhost:4321/services/house-shifting/', { waitUntil: 'load' });
await p.waitForTimeout(1200);
const wide = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 320) out.push([el.tagName, el.className.toString().slice(0, 60), Math.round(r.width)]);
  });
  return out.slice(0, 15);
});
console.log(wide);
await b.close();
