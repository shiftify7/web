#!/usr/bin/env node
/**
 * Derives public/ raster assets from the brand PNGs in src/assets:
 *  - favicon-64.png, apple-touch-icon.png (180), favicon-512.png (schema/og)
 *  - og-default.png (1200×630 social card on brand-canvas)
 * Run: npm run assets (requires sharp — installed as a dependency).
 */
import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = (p) => join(ROOT, 'src/assets', p);
const P = (p) => join(ROOT, 'public', p);

const NAVY = { r: 10, g: 22, b: 51, alpha: 1 }; // ink-850

async function fromMark() {
  const mark = sharp(A('s-mark.png'));
  await sharp(A('s-mark.png')).resize(64, 64).png().toFile(P('favicon-64.png'));
  await sharp(A('s-mark.png')).resize(180, 180).png().toFile(P('apple-touch-icon.png'));
  await sharp(A('s-mark.png')).resize(512, 512).png().toFile(P('favicon-512.png'));
  console.log('✓ favicons from s-mark.png');
  return mark;
}

async function ogCard() {
  const W = 1200;
  const H = 630;
  const logo = await sharp(A('truck-hero.png'))
    .resize(940, null, { withoutEnlargement: true })
    .png()
    .toBuffer();
  await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 15, g: 23, b: 42 } },
  })
    .composite([
      { input: logo, gravity: 'center' },
    ])
    .png({ quality: 82 })
    .toFile(P('og-default.png'));
  console.log('✓ og-default.png (1200×630)');
  void NAVY;
}

await fromMark();
await ogCard();
console.log('assets prepared in public/');
