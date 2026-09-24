import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });

await p.goto('http://localhost:4321/packers-and-movers-delhi/dwarka/', { waitUntil: 'load' });
await p.waitForTimeout(800);
console.log('locality prefill:', await p.evaluate(() => ({
  pickup: document.querySelector('.locsel-btn')?.textContent?.trim(),
  fromLocality: document.getElementById('lf-floc')?.value,
})));

await p.goto('http://localhost:4321/packers-and-movers-delhi-to-mumbai/', { waitUntil: 'load' });
await p.waitForTimeout(800);
console.log('route prefill:', await p.evaluate(() => ({
  pickup: document.querySelector('.locsel-btn')?.textContent?.trim(),
  destination: document.querySelectorAll('.locsel-btn')[1]?.textContent?.trim(),
})));

await b.close();
