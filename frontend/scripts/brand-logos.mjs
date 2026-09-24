import sharp from 'sharp';
import fs from 'node:fs';

// New Shiftify logo master (full wordmark) + icon, supplied on white bg.
// Near-white pixels become transparent so the logo sits on any backdrop.
const SRC = '/home/user/uploads/ChatGPT Image Sep 19, 2026, 08_48_29 AM.png';
const ICON = '/home/user/uploads/Icon Logo.png';

async function deWhite(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // eslint-disable-next-line
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i + 1], b = out[i + 2];
    const m = Math.min(r, g, b);
    if (m > 250) out[i + 3] = 0;
    else if (m > 236) out[i + 3] = Math.round(((250 - m) / 14) * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
}

const trimmed = await sharp(await (await deWhite(SRC)).png().toBuffer()).trim({ threshold: 12 }).png().toBuffer();
const iconTrim = await sharp(await (await deWhite(ICON)).png().toBuffer()).trim({ threshold: 12 }).png().toBuffer();

const jobs = [
  // nav wordmark (2x for retina)
  [trimmed, 'src/assets/logo-word.png', 340],
  // footer brand chip art at larger size
  [trimmed, 'src/assets/logo-lockup.png', 560],
  // favicons
  [iconTrim, 'public/favicon-64.png', 64, { pad: true }],
  [iconTrim, 'public/favicon-512.png', 512, { pad: true }],
  [iconTrim, 'public/apple-touch-icon.png', 180, { pad: true }],
  // legacy s-mark asset name kept for any schema/social references
  [iconTrim, 'src/assets/s-mark.png', 1024, { pad: true }],
];

for (const [srcBuf, dest, w, opts = {}] of jobs) {
  let img = sharp(srcBuf);
  if (opts.pad) {
    const meta = await sharp(srcBuf).metadata();
    const scale = Math.min(w / meta.width, w / meta.height) * 0.82;
    const rw = Math.round(meta.width * scale), rh = Math.round(meta.height * scale);
    img = img.resize(rw, rh).extend({
      top: Math.floor((w - rh) / 2), bottom: Math.ceil((w - rh) / 2),
      left: Math.floor((w - rw) / 2), right: Math.ceil((w - rw) / 2),
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    });
  } else {
    img = img.resize(w, null, { withoutEnlargement: true });
  }
  await img.png().toFile(dest);
  console.log(dest, `${Math.round(fs.statSync(dest).size / 1024)}KB`);
}

// ── OG default (1200x630): white canvas, logo, blue side band, orange hint ──
const W = 1200, H = 630;
const logoBuf = await sharp(trimmed).resize(760).png().toBuffer();
const lm = await sharp(logoBuf).metadata();
const bg = {
  create: {
    width: W, height: H, channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
};
await sharp(bg)
  .composite([
    { input: Buffer.from(`<svg width="${W}" height="${H}"><rect x="0" y="${H - 14}" width="${W}" height="14" fill="#1e3a8a"/><rect x="0" y="${H - 14}" width="260" height="14" fill="#f5871f"/><rect x="${W - 26}" y="0" width="26" height="${H - 14}" fill="#eff4fd"/></svg>`), top: 0, left: 0 },
    { input: logoBuf, top: Math.round((H - lm.height) / 2) - 8, left: Math.round((W - 26 - lm.width) / 2) },
  ])
  .png()
  .toFile('public/og-default.png');
console.log('public/og-default.png', `${Math.round(fs.statSync('public/og-default.png').size / 1024)}KB`);
