import sharp from 'sharp';
import fs from 'node:fs';

// Strip the baked-in black studio background from the service renders.
// Pixels with max(r,g,b) === 0 become fully transparent; a short ramp above
// that keeps anti-aliased edges smooth without eating dark subject detail
// (tires, navy pans, box art all sit well above this floor).
const RAMP_TOP = 28; // max-channel value at which pixels are fully opaque again

const MAP = {
  'home rellocation.png': 'house-shifting',
  'office reloocation.png': 'office-relocation',
  'car transportation.png': 'car-transportation',
  'bike.png': 'bike-transportation',
  'storage and ware house.png': 'storage-warehousing',
  'international relocation.png': 'international-relocation',
};

for (const [file, slug] of Object.entries(MAP)) {
  const src = `/home/user/uploads/${file}`;
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const m = Math.max(out[i], out[i + 1], out[i + 2]);
    if (m === 0) out[i + 3] = 0;
    else if (m < RAMP_TOP) out[i + 3] = Math.round((m / RAMP_TOP) * 255);
  }
  const base = sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
  for (const w of [600, 1024]) {
    if (w > info.width) continue;
    const png = await base.clone().blur(1.6).png().toBuffer(); // soften fringe after alpha cut
    const dest = `src/assets/services/${slug}-${w}.webp`;
    await sharp(png).resize(w, null, { withoutEnlargement: true }).webp({ quality: 78 }).toFile(dest);
    console.log(dest, `${Math.round(fs.statSync(dest).size / 1024)}KB`);
  }
}
