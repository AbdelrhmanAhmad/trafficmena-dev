#!/usr/bin/env node
/**
 * Generates Arabic education JSON files from English sources using embedded translations.
 * Run: node scripts/generate-ar-education-all.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const arDir = join(__dirname, 'ar-education');

/** @type {Record<string, string>} */
const MAP = JSON.parse(readFileSync(join(__dirname, 'ar-string-map.json'), 'utf8'));

function tr(text) {
  if (!text) return text;
  if (MAP[text]) return MAP[text];
  // partial glossary fallback
  let out = text;
  const glossary = [
    ['What is', 'ما هو'],
    ['Why is', 'لماذا'],
    ['How to Calculate', 'كيفية حساب'],
    ['How to calculate', 'كيفية حساب'],
    ['How to Lower', 'كيفية خفض'],
    ['The formula is:', 'المعادلة هي:'],
    ['For example,', 'على سبيل المثال،'],
    ['Example:', 'مثال:'],
    ['Note:', 'ملاحظة:'],
    ['Source:', 'المصدر:'],
    ['Important?', 'مهم؟'],
    ['Important', 'مهم'],
    ['Average', 'متوسط'],
    ['Industry', 'القطاع'],
    ['Excellent', 'ممتاز'],
    ['Good', 'جيد'],
    ['Poor', 'ضعيف'],
  ];
  for (const [en, ar] of glossary) out = out.split(en).join(ar);
  return out;
}

function translateDeep(value) {
  if (typeof value === 'string') return tr(value);
  if (Array.isArray(value)) return value.map(translateDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = k === 'tier' ? v : translateDeep(v);
    return out;
  }
  return value;
}

const files = readdirSync(arDir).filter((f) => f.endsWith('.en.json'));
for (const file of files) {
  const slug = file.replace('.en.json', '');
  const outPath = join(arDir, `${slug}.json`);
  if (slug === 'cpc') continue;
  const en = JSON.parse(readFileSync(join(arDir, file), 'utf8'));
  const ar = translateDeep(en);
  writeFileSync(outPath, `${JSON.stringify(ar, null, 2)}\n`);
  console.log(`Generated ${slug}.json`);
}
console.log('Done');
