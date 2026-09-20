import { chromium } from 'playwright';
const b = await chromium.launch();
const sizes = [[1440, 900], [390, 844], [320, 700], [1920, 1080]];
const pages = [
  ['/', 'home'],
  ['/services/house-shifting/', 'svc'],
  ['/packers-and-movers-delhi/', 'city'],
  ['/packers-and-movers-delhi/dwarka/', 'loc'],
  ['/packers-and-movers-delhi-to-mumbai/', 'route'],
  ['/contact/', 'contact'],
];
const c = await b.newContext();
for (const [w, h] of sizes) {
  for (const [path, name] of pages) {
    const p = await c.newPage();
    await p.setViewportSize({ width: w, height: h });
    await p.goto(`http://localhost:4321${path}`, { waitUntil: 'load', timeout: 20000 });
    await p.waitForTimeout(path === '/' ? 3500 : 1200);
    const scrollW = await p.evaluate(() => document.documentElement.scrollWidth);
    await p.screenshot({ path: `/tmp/qa/${name}-${w}.png` });
    console.log(`${name}-${w} scrollW=${scrollW}${scrollW > w ? ' <<< H-SCROLL!' : ''}`);
    await p.close();
  }
}
await b.close();
