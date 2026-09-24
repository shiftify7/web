import sharp from 'sharp';

const SRC = 'src/assets/truck-body.png';
const LOGO = 'src/assets/logo-word.png';
const zone = { x: 530, y: 165, w: 950, h: 260 };
const pad = 30;

// Sampled panel gradient: rgb(248,250,251) @ top → rgb(205,210,214) @ bottom
const patch = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${zone.w + pad * 2}" height="${zone.h + pad * 2}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgb(248,250,251)"/>
      <stop offset="1" stop-color="rgb(205,210,214)"/>
    </linearGradient>
    <filter id="f" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="16"/>
    </filter>
  </defs>
  <rect x="${pad}" y="${pad}" width="${zone.w}" height="${zone.h}" rx="8"
        fill="url(#g)" filter="url(#f)"/>
</svg>`);

const logoW = 850;
const logo = await sharp(LOGO).resize({ width: logoW }).toBuffer();
const lmeta = await sharp(logo).metadata();

const out = await sharp(SRC)
  .composite([
    { input: patch, left: zone.x - pad, top: zone.y - pad },
    {
      input: logo,
      left: Math.round(zone.x + zone.w / 2 - logoW / 2),
      top: Math.round(zone.y + zone.h / 2 - lmeta.height / 2),
    },
  ])
  .png()
  .toBuffer();

await sharp(out).toFile(SRC);
console.log('patched');
