#!/usr/bin/env node
/**
 * Content-quality gate — wired into `npm run build` BEFORE astro build.
 *
 * Anti-doorway enforcement (Google spam policy):
 *  1. Every city must carry ≥300 words of genuinely city-specific content
 *     (intro + whyLocal + localRules + seasonality).
 *  2. No two cities may be >70% textually similar (word-5-gram Jaccard).
 *  3. Placeholder tokens are forbidden inside local content fields.
 *  4. Price bands must be sane; tier-1 cities should have locality pages.
 *
 * Exit 1 → the build fails. That is the point: thin or duplicate city copy
 * must never ship.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CITIES_DIR = join(ROOT, 'src/content/cities');

const UNIQUE_MIN_WORDS = 300;
const SIMILARITY_FAIL = 0.7;

const words = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9₹\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

function shingles(wordList, n = 5) {
  const set = new Set();
  for (let i = 0; i + n <= wordList.length; i++) set.add(wordList.slice(i, i + n).join(' '));
  if (set.size === 0) set.add(wordList.join(' '));
  return set;
}

function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

let failures = 0;
let warnings = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); failures++; };
const warn = (msg) => { console.warn(`  ⚠ ${msg}`); warnings++; };

const files = readdirSync(CITIES_DIR).filter((f) => f.endsWith('.json'));
if (files.length === 0) fail('no city files found in src/content/cities');

const cityReports = [];
console.log(`\nShiftify content gate — validating ${files.length} cities\n`);

for (const file of files) {
  let c;
  try {
    c = JSON.parse(readFileSync(join(CITIES_DIR, file), 'utf8'));
  } catch (e) {
    fail(`${file}: invalid JSON — ${e.message}`);
    continue;
  }
  const ctx = `${file} (${c.slug ?? '?'})`;

  // assemble the unique-local corpus
  const rulesText = (c.localRules ?? []).map((r) => `${r.title} ${r.detail}`).join(' ');
  const corpus = [c.intro, c.whyLocal, rulesText, c.seasonality?.note].filter(Boolean).join(' ');
  const wc = words(corpus).length;
  cityReports.push({ file, slug: c.slug, corpus: words(corpus) });

  if (wc < UNIQUE_MIN_WORDS) fail(`${ctx}: only ${wc} unique local words (< ${UNIQUE_MIN_WORDS}). This is doorway-page territory.`);
  else console.log(`  ✓ ${ctx}: ${wc} unique local words`);

  if (c.tier === 1 && wc < 600) warn(`${ctx}: tier-1 city with ${wc} unique words — target 600+ for the 1,200–1,800-word page goal`);
  if (c.tier === 1 && (c.localities?.length ?? 0) === 0) warn(`${ctx}: tier-1 city has no locality pages`);

  // placeholder leakage in local content
  if (/\[[A-Z][A-Z0-9 _/-]{2,}\]/.test(corpus)) fail(`${ctx}: placeholder token found inside local content`);

  // price sanity
  const bands = [];
  for (const grp of ['homeLocal', 'homeNational']) {
    for (const [k, v] of Object.entries(c.priceMatrix?.[grp] ?? {})) bands.push([`${grp}.${k}`, v]);
  }
  for (const [k, v] of Object.entries(c.priceMatrix?.vehicle ?? {})) bands.push([`vehicle.${k}`, v]);
  for (const [k, v] of bands) {
    if (!Array.isArray(v) || v.length !== 2 || !(v[0] > 0) || !(v[0] < v[1])) fail(`${ctx}: bad price band at ${k}`);
  }
  // local 1 BHK should never exceed national 1 BHK
  const hl = c.priceMatrix?.homeLocal?.['1 BHK'];
  const hn = c.priceMatrix?.homeNational?.['1 BHK'];
  if (hl && hn && hl[0] >= hn[0]) warn(`${ctx}: local 1 BHK min (${hl[0]}) ≥ national min (${hn[0]}) — check the matrix`);

  // meta guards
  if ((c.metaTitle?.length ?? 0) > 65) fail(`${ctx}: metaTitle >65 chars`);
  if ((c.metaDescription?.length ?? 0) > 160) fail(`${ctx}: metaDescription >160 chars`);
}

// pairwise similarity
console.log('\n  Pairwise 5-gram similarity:');
for (let i = 0; i < cityReports.length; i++) {
  for (let j = i + 1; j < cityReports.length; j++) {
    const a = shingles(cityReports[i].corpus);
    const b = shingles(cityReports[j].corpus);
    const sim = jaccard(a, b);
    const tag = `${cityReports[i].slug} ↔ ${cityReports[j].slug}: ${(sim * 100).toFixed(1)}%`;
    if (sim > SIMILARITY_FAIL) fail(`${tag} — over the ${SIMILARITY_FAIL * 100}% doorway threshold`);
    else console.log(`  ✓ ${tag}`);
  }
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} error(s), ${warnings} warning(s)\n`);
process.exit(failures === 0 ? 0 : 1);
