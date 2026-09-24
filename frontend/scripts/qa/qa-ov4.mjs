import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 320, height: 700 } });
await p.goto('http://localhost:4321/services/house-shifting/', { waitUntil: 'load' });
await p.waitForTimeout(1000);
const info = await p.evaluate(() => {
  const els = document.querySelectorAll('.svc-cta, .svc-cta .btn, .svc-cta a, .btn.header-quote');
  return Array.from(els).map(e => [e.className, e.getBoundingClientRect().left, e.getBoundingClientRect().right, getComputedStyle(e).minWidth, getComputedStyle(e).padding]);
});
console.log(info);
await b.close();
