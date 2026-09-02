#!/usr/bin/env node
/**
 * Translates non-education calculator panel strings where ar === en.
 * Resumable via scripts/ar-string-map.json. Run repeatedly until "remaining: 0".
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const mapPath = join(__dirname, 'ar-string-map.json');
const enPath = join(root, 'src/shared/i18n/locales/en/calculators.json');
const arPath = join(root, 'src/shared/i18n/locales/ar/calculators.json');

const MAP = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : {};
const en = JSON.parse(readFileSync(enPath, 'utf8'));
const ar = JSON.parse(readFileSync(arPath, 'utf8'));

const MAX_PER_RUN = Number(process.env.MAX_TRANSLATIONS ?? 100);
const SKIP_PATH = /\.(education|share)\./;

/** Keep acronyms, numbers, and punctuation-only strings as-is. */
function shouldSkipTranslation(text) {
  if (!text || text.length < 2) return true;
  if (!/[A-Za-z]/.test(text)) return true;
  if (/^(Yes|No|CPC|CPM|CPL|CTR|CAC|ROAS|LTV|AOV|MER|GRR|NRR|CMGR|MoM|nCAC|SEO|SaaS|B2B|Q4)$/i.test(text.trim())) {
    return true;
  }
  return false;
}

function collectPairs(enVal, arVal, path, pairs) {
  if (typeof enVal === 'string' && typeof arVal === 'string') {
    if (SKIP_PATH.test(path)) return;
    if (enVal === arVal && !shouldSkipTranslation(enVal)) {
      pairs.push({ path, text: enVal });
    }
    return;
  }
  if (Array.isArray(enVal) && Array.isArray(arVal)) {
    enVal.forEach((item, index) => collectPairs(item, arVal[index], `${path}[${index}]`, pairs));
    return;
  }
  if (enVal && typeof enVal === 'object' && arVal && typeof arVal === 'object') {
    for (const key of Object.keys(enVal)) {
      collectPairs(enVal[key], arVal[key], path ? `${path}.${key}` : key, pairs);
    }
  }
}

function setAtPath(obj, path, value) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
}

async function translate(text) {
  if (MAP[text]) return MAP[text];
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ar`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.responseStatus !== 200) {
    throw new Error(data.responseDetails || `translate failed (${data.responseStatus})`);
  }
  return data.responseData.translatedText;
}

const pairs = [];
collectPairs(en, ar, '', pairs);
const unique = [...new Map(pairs.map((p) => [p.text, p])).values()];
const pending = unique.filter((p) => !MAP[p.text]);

console.log(`Identical panel strings: ${unique.length}, cached: ${unique.length - pending.length}, pending: ${pending.length}`);

let translated = 0;
for (const entry of pending) {
  if (translated >= MAX_PER_RUN) break;
  try {
    MAP[entry.text] = await translate(entry.text);
    translated += 1;
    if (translated % 20 === 0) {
      writeFileSync(mapPath, `${JSON.stringify(MAP, null, 2)}\n`);
      console.log(`Cached ${Object.keys(MAP).length}…`);
    }
    await new Promise((resolve) => setTimeout(resolve, 320));
  } catch (err) {
    console.warn(`Failed: ${entry.text.slice(0, 60)}…`, err.message);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

writeFileSync(mapPath, `${JSON.stringify(MAP, null, 2)}\n`);

let applied = 0;
for (const entry of pairs) {
  const translatedText = MAP[entry.text];
  if (!translatedText || translatedText === entry.text) continue;
  setAtPath(ar, entry.path, translatedText);
  applied += 1;
}

writeFileSync(arPath, `${JSON.stringify(ar, null, 2)}\n`);
console.log(`Applied ${applied} translations this run. New cache entries: ${translated}. Remaining pending: ${pending.length - translated}`);
