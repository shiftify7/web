import sharp from 'sharp';
import fs from 'node:fs';

const MAP = { 'mobile phone.png': 'moving-process', 'indiamap.png': 'moving-india' };
for (const [file, slug] of Object.entries(MAP)) {
  const src = `/home/user/uploads/${file}`;
  const m = await sharp(src).metadata();
  const widths = [...new Set([600, 1024].filter(w => w <= m.width))];
  if (widths.length === 0) widths.push(m.width);
  for (const w of widths) {
    const out = `src/assets/promo/${slug}-${w}.webp`;
    await sharp(src).resize(w, null, { withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
    console.log(out, `${Math.round(fs.statSync(out).size / 1024)}KB (src ${m.width}x${m.height})`);
  }
}
