/**
 * Offline motion reproduction: composites body + wheels exactly like the site
 * (pig-latin: same % constants, same roll formula, rotated wheel layers) at
 * several travel distances, zoomed on each wheel, rendered into one contact
 * sheet so wheel behaviour DURING movement can be inspected frame by frame.
 *
 *   node scripts/wheel-sim.mjs
 */
import sharp from 'sharp';

const RIG_W = 1725;
const RIG_H = 786;
const WHEELS = [
  { name: 'truck-wheel-front', left: 12.116, top: 72.264, width: 11.942 },
  { name: 'truck-wheel-rear', left: 68.638, top: 73.155, width: 12.638 },
];
const DISTANCES = [0, 180, 360, 540, 720];
const PAD_LABEL = 0; // no text labels — visual only

const body = await sharp('src/assets/truck-body.png').toBuffer();

// rotated wheel variants are produced inside composeFrame directly

async function composeFrame(d) {
  const composites = [{ input: body, left: 0, top: 0 }];
  for (const w of WHEELS) {
    const sidePx = Math.round((w.width / 100) * RIG_W);
    const left = Math.round((w.left / 100) * RIG_W);
    const top = Math.round((w.top / 100) * RIG_H);
    const rPx = sidePx / 2; // site formula: rPx = offsetWidth / 2 (COUNT sign)
    const theta = -(d / rPx) * (180 / Math.PI); // positive d = rightward on screen → CCW (right→left travel uses -d)
    const wheel = await sharp(`src/assets/${w.name}.png`)
      .resize(sidePx, sidePx)
      .rotate(theta, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const meta = await sharp(wheel).metadata();
    composites.push({
      input: wheel,
      left: Math.round(left + sidePx / 2 - meta.width / 2),
      top: Math.round(top + sidePx / 2 - meta.height / 2),
    });
  }
  return sharp({
    create: { width: RIG_W, height: RIG_H, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  }).composite(composites).png().toBuffer();
}

const rows = [];
for (const d of DISTANCES) {
  const frame = await composeFrame(d);
  const out = [];
  for (const w of WHEELS) {
    const sidePx = Math.round((w.width / 100) * RIG_W);
    const cx = Math.round((w.left / 100) * RIG_W + sidePx / 2);
    const cy = Math.round((w.top / 100) * RIG_H + sidePx / 2);
    const grab = Math.ceil(sidePx * 1.35);
    const left = Math.min(Math.max(0, cx - grab), RIG_W - grab * 2);
    const top = Math.min(Math.max(0, cy - grab), RIG_H - grab * 2);
    const crop = await sharp(frame).extract({ left, top, width: grab * 2, height: grab * 2 }).toBuffer();
    out.push(crop);
  }
  const row = await sharp({
    create: { width: 1400, height: 400, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([
      { input: await sharp(out[0]).resize(400, 400).toBuffer(), left: 0, top: 0 },
      { input: await sharp(out[1]).resize(400, 400).toBuffer(), left: 420, top: 0 },
      { input: await sharp('src/assets/truck-body.png').extract({ left: 860, top: 120, width: 560, height: 160 }).resize(480, 137).toBuffer(), left: 860, top: 120 },
    ])
    .png()
    .toBuffer();
  rows.push(row);
}

const sheet = await sharp({
  create: { width: 1400, height: 400 * rows.length, channels: 4, background: { r: 250, g: 250, b: 252, alpha: 1 } },
})
  .composite(rows.map((r, i) => ({ input: r, left: 0, top: i * 400 })))
  .png()
  .toFile('wheel-sim-sheet.png');
console.log('frames (travel px top→bottom):', DISTANCES.join(', '), '→ wheel-sim-sheet.png');
