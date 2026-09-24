import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const locations = fs.readFileSync(path.join(root, 'src/lib/locations.ts'), 'utf8');
const stateCount = (locations.match(/^  state\('/gm) || []).length;
const utCount = (locations.match(/^  ut\('/gm) || []).length;
if (stateCount !== 28) throw new Error(`Expected 28 states, found ${stateCount}`);
if (utCount !== 8) throw new Error(`Expected 8 Union Territories, found ${utCount}`);

const credits = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/locations/CREDITS.json'), 'utf8'));
const capitalDir = path.join(root, 'src/assets/locations/capitals');
for (const entry of credits) {
  const asset = entry.file === 'delhi.webp' || entry.file === 'gurgaon.webp' || entry.file === 'noida.webp' || entry.file === 'mumbai.webp' || entry.file === 'bengaluru.webp'
    ? path.join(root, 'src/assets/locations', entry.file)
    : path.join(capitalDir, entry.file);
  if (!fs.existsSync(asset)) throw new Error(`Missing local image for ${entry.slug}: ${entry.file}`);
  if (!entry.sourceUrl || !entry.license || !entry.licenseUrl || !entry.author) throw new Error(`Incomplete attribution for ${entry.slug}`);
}

const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) {
  const stateSlugs = [...locations.matchAll(/^  state\('([^']+)'/gm)].map((m) => m[1]);
  for (const slug of stateSlugs) {
    const page = path.join(dist, `packers-and-movers-in-${slug}`, 'index.html');
    if (!fs.existsSync(page)) throw new Error(`Missing built state page: ${slug}`);
  }
  const sitemap = fs.readFileSync(path.join(dist, 'sitemap-states.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (locs.length !== 28) throw new Error(`Expected 28 state sitemap URLs, found ${locs.length}`);
  if (locs.some((url) => /[?]|admin|crm|draft/i.test(url))) throw new Error('Invalid URL found in state sitemap');
}

console.log(`PASS — ${stateCount} states, ${utCount} Union Territories, ${credits.length} attributed local images, and built state routes verified.`);
