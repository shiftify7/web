import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 320, height: 700 } });
await p.goto('http://localhost:4321/services/house-shifting/', { waitUntil: 'load' });
await p.waitForTimeout(1200);
const info = await p.evaluate(() => {
  const g = document.querySelector('.svc-hero-grid');
  const cs = getComputedStyle(g);
  const wrap = getComputedStyle(g.parentElement);
  return {
    gridCols: cs.gridTemplateColumns,
    gridW: g.getBoundingClientRect().width,
    wrapW: g.parentElement.getBoundingClientRect().width,
    wrapPad: wrap.padding,
    docScrollW: document.documentElement.scrollWidth,
    figW: document.querySelector('.svc-hero-fig')?.getBoundingClientRect().width,
  };
});
console.log(info);
await b.close();
