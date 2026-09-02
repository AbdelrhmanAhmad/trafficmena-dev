#!/usr/bin/env node
/**
 * Translates calculator education JSON (en -> ar) via Google gtx endpoint.
 * Preserves acronyms/brands. Use --force to retranslate partial files.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const arDir = join(__dirname, 'ar-education');

const PRESERVE =
  /\b(CPC|CPM|CPL|CTR|CAC|nCAC|CVR|ROAS|LTV|AOV|MER|GRR|NRR|CMGR|MoM|SEO|ARPU|MRR|SaaS|B2B|B2C|Google Ads|Meta|LinkedIn|TikTok|Facebook|Instagram|YouTube|Snapchat|USD|CPA|RFM|MQL|SQL|ACV|SMB|UX|AI|D2C|VCs|Q4|eCommerce)\b/gi;

const SKIP_SLUGS = new Set(['cpc']);
const FORCE = process.argv.includes('--force');
const onlySlugArg = process.argv.find((arg) => arg.startsWith('--slug='));
const onlySlug = onlySlugArg ? onlySlugArg.split('=')[1] : null;

async function translateText(text) {
  if (!text?.trim() || !/[A-Za-z]/.test(text)) return text;

  const placeholders = [];
  const marked = text.replace(PRESERVE, (match) => {
    const id = `__KEEP${placeholders.length}__`;
    placeholders.push(match);
    return id;
  });

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(marked.slice(0, 4500))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  let out = data[0].map((part) => part[0]).join('');
  placeholders.forEach((value, index) => {
    out = out.replaceAll(`__KEEP${index}__`, value);
  });
  return out;
}

async function translateValue(value) {
  if (typeof value === 'string') {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return translateText(value);
  }
  if (Array.isArray(value)) {
    const output = [];
    for (const item of value) output.push(await translateValue(item));
    return output;
  }
  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = key === 'tier' ? nested : await translateValue(nested);
    }
    return output;
  }
  return value;
}

function looksArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

const files = readdirSync(arDir).filter((file) => file.endsWith('.en.json'));

for (const file of files) {
  const slug = file.replace('.en.json', '');
  if (onlySlug && slug !== onlySlug) continue;
  if (SKIP_SLUGS.has(slug)) {
    console.log(`Skip ${slug} (manual Arabic)`);
    continue;
  }

  const outFile = join(arDir, `${slug}.json`);
  const en = JSON.parse(readFileSync(join(arDir, file), 'utf8'));

  if (!FORCE && !onlySlug && existsSync(outFile)) {
    const existing = JSON.parse(readFileSync(outFile, 'utf8'));
    const firstHeading = existing.sections?.[0]?.heading ?? '';
    if (looksArabic(firstHeading)) {
      const englishChunks = (JSON.stringify(existing).match(/[A-Za-z]{6,}/g) ?? []).length;
      if (englishChunks < 50) {
        console.log(`Skip ${slug} (already localized, englishChunks=${englishChunks})`);
        continue;
      }
    }
  }

  console.log(`Translating ${slug}...`);
  const ar = await translateValue(en);
  writeFileSync(outFile, `${JSON.stringify(ar, null, 2)}\n`);
  console.log(`Wrote ${slug}.json`);
}

console.log('Done');
