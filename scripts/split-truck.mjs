#!/usr/bin/env node
/**
 * Splits the branded Shiftify truck artwork into animation layers:
 *   src/assets/truck-body.png        body with both wheel discs erased (transparent)
 *   src/assets/truck-wheel-front.png circular disc crop (tire + hub)
 *   src/assets/truck-wheel-rear.png  circular disc crop
 *   scripts/truck-layers.json        measurements consumed by the hero markup
 *
 * Wheel centers/radii were measured with ruler overlays (see git comment) —
 * front (337, 738) R93 · rear (1318, 752) R99 on the 1774×887 source.
 *
 * Run: node scripts/split-truck.mjs
 */
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = '/home/user/uploads/a7dc96a7-e084-4ba5-bd1c-6f004fbefa97.png';
const OUT = (p) => join(ROOT, 'src/assets', p);
const PAD = 4;

const WHEELS = [
  { name: 'front', cx: 337, cy: 738, R: 93 },
  { name: 'rear', cx: 1318, cy: 752, R: 99 },
];

const src = sharp(SRC);
const meta = await src.metadata();
const W = meta.width;
const H = meta.height;

// ── 1 · body: erase both discs (dest-in against an SVG mask) ───────────────
const maskSvg = `<svg width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="white"/>
  ${WHEELS.map((w) => `<circle cx="${w.cx}" cy="${w.cy}" r="${w.R + PAD}" fill="black"/>`).join('')}
</svg>`;
const body = await sharp(SRC)
  .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
  .png()
  .toBuffer();

// ── 2 · trim transparent borders; note offsets to re-map wheel centers ──────
const trimmed = await sharp(body).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
const ox = Math.abs(trimmed.info.trimOffsetLeft ?? 0);
const oy = Math.abs(trimmed.info.trimOffsetTop ?? 0);
const BW = trimmed.info.width;
const BH = trimmed.info.height;
console.log(`body ${BW}×${BH}, trimmed left=${ox} top=${oy}`);

// ── 3 · wheel disc crops, circularly masked ─────────────────────────────────
async function cutWheel(w) {
  const D = 2 * (w.R + PAD);
  const crop = await sharp(SRC)
    .extract({ left: w.cx - w.R - PAD, top: w.cy - w.R - PAD, width: D, height: D })
    .png()
    .toBuffer();
  const circleSvg = `<svg width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="white"/></svg>`;
  return sharp(crop)
    .composite([{ input: Buffer.from(circleSvg), blend: 'dest-in' }])
    .png()
    .toBuffer();
}
const front = await cutWheel(WHEELS[0]);
const rear = await cutWheel(WHEELS[1]);

mkdirSync(OUT(''), { recursive: true });
writeFileSync(OUT('truck-body.png'), trimmed.data);
writeFileSync(OUT('truck-wheel-front.png'), front);
writeFileSync(OUT('truck-wheel-rear.png'), rear);

// ── 4 · layout metadata (everything as % of the trimmed body box) ───────────
const layers = WHEELS.map((w) => {
  const D = 2 * (w.R + PAD);
  return {
    name: w.name,
    R: w.R,
    x: w.cx - ox, // center in trimmed coords
    y: w.cy - oy,
    dPct: +((D / BW) * 100).toFixed(3), // css width of the wheel img, % of body box width
    leftPct: +(((w.cx - ox - w.R - PAD) / BW) * 100).toFixed(3),
    topPct: +(((w.cy - oy - w.R - PAD) / BH) * 100).toFixed(3),
  };
});
const metaJson = { bodyWidth: BW, bodyHeight: BH, wheels: layers };
writeFileSync(join(ROOT, 'scripts/truck-layers.json'), JSON.stringify(metaJson, null, 2));
console.log(JSON.stringify(metaJson, null, 2));

// ── 5 · verification composite: reassemble at 880px wide ────────────────────
const CW = 880;
const CH = Math.round((BH / BW) * CW);
const wSize = (w) => Math.round((2 * (w.R + PAD) * CW) / BW);
const frontR = await sharp(front).resize(wSize(WHEELS[0])).toBuffer();
const rearR = await sharp(rear).resize(wSize(WHEELS[1])).toBuffer();
const place = (w, sz) => ({
  left: Math.round(((w.cx - ox - w.R - PAD) / BW) * CW),
  top: Math.round(((w.cy - oy - w.R - PAD) / BH) * CH),
});
await sharp({
  create: { width: CW, height: CH, channels: 3, background: { r: 246, g: 248, b: 252 } },
})
  .composite([
    { input: await sharp(trimmed.data).resize(CW).toBuffer(), left: 0, top: 0 },
    { input: frontR, ...place(WHEELS[0]) },
    { input: rearR, ...place(WHEELS[1]) },
  ])
  .png()
  .toFile('/tmp/truck_reassembled.png');
console.log('→ /tmp/truck_reassembled.png');
