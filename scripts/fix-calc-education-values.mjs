#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const componentsDir = join(root, 'src/features/calculators/components');
const enPath = join(root, 'src/shared/i18n/locales/en/calculators.json');

// Remove values={educationValues} — education copy uses static example amounts
for (const file of readdirSync(componentsDir)) {
  if (!file.endsWith('Calculator.tsx')) continue;
  const path = join(componentsDir, file);
  let content = readFileSync(path, 'utf8');
  if (!content.includes('values={educationValues}')) continue;
  content = content.replace(/ values=\{educationValues\}/g, '');
  writeFileSync(path, content);
  console.log(`Removed educationValues from ${file}`);
}

// Replace {{amount}} placeholders with static USD examples in education copy
const en = JSON.parse(readFileSync(enPath, 'utf8'));
const amountReplacements = {
  cpc: { '{{amount}}': '$500' },
  cpm: { '{{amount}}': '$1,000' },
  cpl: { '{{amount}}': '$5,000' },
  aov: { '{{amount}}': '$14,000' },
  cac: { '{{amount}}': '$10,000' },
  ltv: { '{{amount}}': '$150' },
  roas: { '{{amount}}': '$1,000' },
};

function replaceInObject(obj, replacements) {
  if (typeof obj === 'string') {
    let result = obj;
    for (const [from, to] of Object.entries(replacements)) {
      result = result.split(from).join(to);
    }
    return result;
  }
  if (Array.isArray(obj)) return obj.map((item) => replaceInObject(item, replacements));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = replaceInObject(v, replacements);
    }
    return out;
  }
  return obj;
}

for (const [slug, reps] of Object.entries(amountReplacements)) {
  if (en.calcs[slug]?.education) {
    en.calcs[slug].education = replaceInObject(en.calcs[slug].education, reps);
  }
}

// Global fallback for any remaining {{amount}}
for (const slug of Object.keys(en.calcs)) {
  if (en.calcs[slug]?.education) {
    en.calcs[slug].education = replaceInObject(en.calcs[slug].education, {
      '{{amount}}': '$100',
    });
  }
}

writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`);
console.log('Fixed amount placeholders in en/calculators.json');
