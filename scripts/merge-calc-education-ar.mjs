#!/usr/bin/env node
/**
 * Merges per-slug Arabic education files into ar/calculators.json
 * and copies share strings with Arabic translations.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const enPath = join(root, 'src/shared/i18n/locales/en/calculators.json');
const arPath = join(root, 'src/shared/i18n/locales/ar/calculators.json');
const arDataDir = join(root, 'scripts/ar-education');

const en = JSON.parse(readFileSync(enPath, 'utf8'));
const ar = JSON.parse(readFileSync(arPath, 'utf8'));

const slugs = Object.keys(en.calcs);
let merged = 0;
let missing = [];

for (const slug of slugs) {
  const arEduFile = join(arDataDir, `${slug}.json`);
  if (existsSync(arEduFile)) {
    const education = JSON.parse(readFileSync(arEduFile, 'utf8'));
    ar.calcs[slug].education = education;
    merged++;
  } else {
    missing.push(slug);
  }
  if (en.calcs[slug].share) {
    ar.calcs[slug].share = en.calcs[slug].share;
  }
}

writeFileSync(arPath, `${JSON.stringify(ar, null, 2)}\n`);
console.log(`Merged ${merged}/${slugs.length} Arabic education files`);
if (missing.length) console.log('Missing:', missing.join(', '));
