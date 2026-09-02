#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const enPath = join(root, 'src/shared/i18n/locales/en/calculators.json');
const outPath = join(root, 'scripts/calc-education-strings-en.txt');

const en = JSON.parse(readFileSync(enPath, 'utf8'));
const strings = new Set();

function collect(obj) {
  if (typeof obj === 'string' && obj.length > 2) strings.add(obj);
  else if (Array.isArray(obj)) obj.forEach(collect);
  else if (obj && typeof obj === 'object') Object.values(obj).forEach(collect);
}

for (const slug of Object.keys(en.calcs)) {
  if (en.calcs[slug].education) collect(en.calcs[slug].education);
  if (en.calcs[slug].share) collect(en.calcs[slug].share);
}

writeFileSync(outPath, [...strings].sort().join('\n'));
console.log(`Extracted ${strings.size} unique strings`);
