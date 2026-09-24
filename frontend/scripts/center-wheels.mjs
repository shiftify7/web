#!/usr/bin/env node
/**
 * Re-normalize the wheel layer PNGs so their TRUE wheel centers sit at the
 * exact image center — pivot-perfect rotation (no orbit/wobble while moving).
 * Recomputes the CSS position constants so the wheels land on the same arch
 * spots in the parent 1725×786 rig space.
 *
 *   node scripts/center-wheels.mjs
 */
import sharp from 'sharp';

const RIG_W = 1725;
const RIG_H = 786;

// current constants (must match src/pages/index.astro + intro markup)
const WHEELS = [
  { name: 'truck-wheel-front', left: 12.464, top: 73.028, width: 11.246 },
  { name: 'truck-wheel-rear', left: 68.986, top: 74.046, width: 11.942 },
];

for (const w of WHEELS) {
  const path = `src/assets/${w.name}.png`;
  const meta = await sharp(path).metadata();
  const srcSide = meta.width;

  // absolute wheel centre the layers were designed around (rig space)
  const boxSize = (w.width / 100) * RIG_W;
  const absLeft = (w.left / 100) * RIG_W;
  const absTop = (w.top / 100) * RIG_H;
  const cx = absLeft + boxSize / 2;
  const cy = absTop + boxSize / 2;

  // measure the real centre via the alpha bounding box of the wheel art
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bboxCx = (minX + maxX + 1) / 2;
  const bboxCy = (minY + maxY + 1) / 2;
  const errX = bboxCx - srcSide / 2;
  const errY = bboxCy - srcSide / 2;

  // where the visual wheel centre TRULY sits in rig space right now
  const scale = boxSize / srcSide;
  const trueCx = cx + errX * scale;
  const trueCy = cy + errY * scale;

  // tight-crop the art, then re-pad into a square with centre at the middle
  const art = await sharp(path)
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png()
    .toBuffer();
  const artMeta = await sharp(art).metadata();
  const PAD = 6; // small transparent margin keeps the circle off the edges
  const side = Math.ceil(Math.max(artMeta.width, artMeta.height) / 2 + PAD) * 2;
  const out = await sharp({
    create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: art,
      left: Math.round(side / 2 - artMeta.width / 2),
      top: Math.round(side / 2 - artMeta.height / 2),
    }])
    .png()
    .toBuffer();
  await sharp(out).toFile(path);

  // recompute the box so the wheel centre stays pinned to trueCx/trueCy
  const newWidthPct = (side / RIG_W) * 100;
  const newLeftPct = ((trueCx - side / 2) / RIG_W) * 100;
  const newTopPct = ((trueCy - side / 2) / RIG_H) * 100;
  console.log(
    `${w.name}: pivot error was ${errX.toFixed(2)}px/${errY.toFixed(2)}px → centred. ` +
      `new ${side}×${side}px · left ${newLeftPct.toFixed(3)}% · top ${newTopPct.toFixed(3)}% · width ${newWidthPct.toFixed(3)}%`,
  );
}
