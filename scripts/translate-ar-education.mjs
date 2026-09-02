#!/usr/bin/env node
/**
 * Translates en education files to Arabic via LibreTranslate.
 * Falls back to copying en if API fails.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const arDir = join(__dirname, 'ar-education');

const PRESERVE = /\b(CPC|CPM|CPL|CTR|CAC|nCAC|CVR|ROAS|LTV|AOV|MER|GRR|NRR|CMGR|MoM|SEO|ARPU|MRR|SaaS|B2B|B2C|Google Ads|Meta|LinkedIn|TikTok|Facebook|Instagram|USD|\$[\d,.]+|\d+%|\d+x)\b/g;

async function translateText(text, retries = 2) {
  if (!text?.trim()) return text;
  const placeholders = [];
  const marked = text.replace(PRESERVE, (m) => {
    const id = `__KEEP_${placeholders.length}__`;
    placeholders.push(m);
    return id;
  });

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: marked, source: 'en', target: 'ar', format: 'text' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let out = data.translatedText ?? marked;
      placeholders.forEach((val, idx) => {
        out = out.replace(`__KEEP_${idx}__`, val);
      });
      return out;
    } catch (err) {
      if (i === retries) {
        console.warn(`Translate failed: ${text.slice(0, 40)}...`, err.message);
        return text;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return text;
}

async function translateValue(value) {
  if (typeof value === 'string') return translateText(value);
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) out.push(await translateValue(item));
    return out;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'tier') {
        out[k] = v;
      } else {
        out[k] = await translateValue(v);
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    return out;
  }
  return value;
}

const files = readdirSync(arDir).filter((f) => f.endsWith('.en.json'));
console.log(`Translating ${files.length} files...`);

for (const file of files) {
  const slug = file.replace('.en.json', '');
  const outFile = join(arDir, `${slug}.json`);
  if (slug === 'cpc') {
    console.log(`Skip ${slug} (manual translation exists)`);
    continue;
  }
  const en = JSON.parse(readFileSync(join(arDir, file), 'utf8'));
  console.log(`Translating ${slug}...`);
  const ar = await translateValue(en);
  writeFileSync(outFile, `${JSON.stringify(ar, null, 2)}\n`);
  console.log(`Wrote ${slug}.json`);
}

console.log('Done');
