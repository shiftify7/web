import { chromium } from 'playwright';
const b = await chromium.launch();

// 1) desktop: validation + fallback
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('http://localhost:4321/', { waitUntil: 'load' });
await p.waitForTimeout(3800);
await p.evaluate(() => document.getElementById('lead-section').scrollIntoView());
await p.waitForTimeout(500);

// invalid phone -> error
await p.fill('#lf-name', 'Test User');
await p.fill('#lf-phone', '12345');
await p.click('.lf-submit');
await p.waitForTimeout(400);
console.log('invalid phone blocked:', await p.evaluate(() => document.querySelector('.lf-err')?.textContent));
await p.screenshot({ path: '/tmp/qa/form-invalid.png', clip: await (await p.$('.lead-band')).boundingBox() });

// valid phone + fields -> POST fails on static server -> fallback CTAs
await p.fill('#lf-phone', '9876543210');
await p.fill('#lf-floc', 'Dwarka');
await p.fill('#lf-tloc', 'Rohini');
await p.fill('#lf-date', '2026-10-05');
await p.click('.lf-submit');
await p.waitForTimeout(1500);
const fallback = await p.evaluate(() => ({
  err: document.querySelector('.lf-err--send')?.textContent?.trim().slice(0, 60),
  btns: Array.from(document.querySelectorAll('.lf-foot .lf-btn')).map(x => x.textContent.trim()),
}));
console.log('fallback:', fallback);
await p.screenshot({ path: '/tmp/qa/form-fallback.png', clip: await (await p.$('.lead-band')).boundingBox() });

// intercity toggle switches fields
await p.click('text=Intercity / Interstate');
await p.waitForTimeout(300);
console.log('intercity fields:', await p.evaluate(() => [!!document.getElementById('lf-fstate'), !!document.getElementById('lf-wcity')]));
await p.screenshot({ path: '/tmp/qa/form-intercity.png', clip: await (await p.$('.lead-band')).boundingBox() });
await p.close();

// 2) mocked success -> success state
const p2 = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p2.route('**/api/lead', (r) => r.fulfill({ status: 200, body: '{"ok":true}', headers: { 'content-type': 'application/json' } }));
await p2.goto('http://localhost:4321/', { waitUntil: 'load' });
await p2.waitForTimeout(3800);
await p2.evaluate(() => document.getElementById('lead-section').scrollIntoView());
await p2.fill('#lf-name', 'Ananya Sharma');
await p2.fill('#lf-phone', '8766331715');
await p2.fill('#lf-floc', 'Dwarka');
await p2.fill('#lf-tloc', 'Rohini');
await p2.fill('#lf-date', '2026-10-05');
await p2.click('.lf-submit');
await p2.waitForTimeout(900);
console.log('success state:', await p2.evaluate(() => document.querySelector('.lf--done h3')?.textContent));
const wa = await p2.evaluate(() => document.querySelector('.lf-btn--wa')?.href);
console.log('wa prefill contains name+route:', decodeURIComponent(wa).includes('Ananya'), decodeURIComponent(wa).includes('Dwarka'));
await p2.screenshot({ path: '/tmp/qa/form-success.png', clip: await (await p2.$('.lead-band')).boundingBox() });
// double-submit guard: try again
await b.close();
