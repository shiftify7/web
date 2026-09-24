import { chromium } from 'playwright';

const b = await chromium.launch();

async function openQuote(page) {
  await page.goto('http://localhost:4321/', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.click('#hqb-from');
  await page.locator('.hqb-opt').filter({ hasText: 'Delhi' }).first().click();
  await page.click('#hqb-to');
  await page.locator('.hqb-opt').filter({ hasText: 'Mumbai' }).first().click();
  await page.fill('#hqb-date', '2026-10-05');
  await page.click('.hqb-cta');
  await page.locator('.hqm-card').waitFor({ state: 'visible' });
}

// Static-site fallback: validation must block an invalid phone, then show
// contact actions when the API is unavailable.
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await openQuote(p);
await p.fill('#lf-name', 'Test User');
await p.fill('#lf-phone', '12345');
await p.click('.lf-submit');
await p.waitForTimeout(250);
console.log('invalid phone blocked:', await p.locator('.lf-err').first().textContent());

await p.fill('#lf-phone', '9876543210');
await p.click('.lf-submit');
await p.waitForTimeout(1000);
console.log('fallback:', await p.evaluate(() => ({
  err: document.querySelector('.lf-err--send')?.textContent?.trim().slice(0, 60),
  btns: Array.from(document.querySelectorAll('.lf-foot .lf-btn')).map((x) => x.textContent.trim()),
})));
await p.close();

// Mocked success: persistence/OTP wiring stays testable without a backend.
const p2 = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p2.route('**/api/lead', (r) => r.fulfill({ status: 200, body: '{"ok":true}', headers: { 'content-type': 'application/json' } }));
await openQuote(p2);
await p2.fill('#lf-name', 'Ananya Sharma');
await p2.fill('#lf-phone', '8766331715');
await p2.click('.lf-submit');
await p2.waitForTimeout(500);
console.log('success state:', await p2.locator('.lf--done h3').textContent());
const wa = await p2.locator('.lf-btn--wa').getAttribute('href');
console.log('wa prefill contains name+route:', decodeURIComponent(wa).includes('Ananya'), decodeURIComponent(wa).includes('Delhi'));
await b.close();
