#!/usr/bin/env node
/**
 * Builds ar-string-map.json via MyMemory API with local cache.
 * Resumable: re-run to continue translating missing strings.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mapPath = join(__dirname, 'ar-string-map.json');
const stringsPath = join(__dirname, 'calc-education-strings-en.txt');

const MAP = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : {};
const strings = readFileSync(stringsPath, 'utf8').split('\n').filter(Boolean);

async function translate(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ar`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.responseStatus !== 200) throw new Error(data.responseDetails || 'translate failed');
  return data.responseData.translatedText;
}

let translated = 0;
const MAX_PER_RUN = 80;

for (const text of strings) {
  if (MAP[text]) continue;
  if (translated >= MAX_PER_RUN) break;
  try {
    MAP[text] = await translate(text);
    translated++;
    if (translated % 10 === 0) {
      writeFileSync(mapPath, `${JSON.stringify(MAP, null, 2)}\n`);
      console.log(`Cached ${Object.keys(MAP).length} strings...`);
    }
    await new Promise((r) => setTimeout(r, 350));
  } catch (err) {
    console.warn(`Failed: ${text.slice(0, 50)}`, err.message);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

writeFileSync(mapPath, `${JSON.stringify(MAP, null, 2)}\n`);
console.log(`Done. Map has ${Object.keys(MAP).length}/${strings.length} strings (${translated} new this run)`);
