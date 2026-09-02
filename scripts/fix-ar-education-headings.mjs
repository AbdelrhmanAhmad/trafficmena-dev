#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const arPath = join(__dirname, '../src/shared/i18n/locales/ar/calculators.json');

const HEADING_MAP = {
  'How to Reduce CAC Payback Period': 'كيفية تقليل فترة استرداد CAC',
  'How to Improve CVR': 'كيفية تحسين CVR',
  'How to Reduce Cart Abandonment': 'كيفية تقليل التخلي عن السلة',
  'How to Reduce Checkout Abandonment': 'كيفية تقليل التخلي عن الدفع',
  'How to Improve Lead-to-Customer Rate': 'كيفية تحسين معدل تحويل العملاء المحتملين',
  'How to Improve Your Repeat Purchase Rate': 'كيفية تحسين معدل الشراء المتكرر',
  'How to Increase LTV': 'كيفية زيادة LTV',
  'How to Increase SaaS LTV': 'كيفية زيادة LTV لـ SaaS',
  'How to Lower Your CAC': 'كيفية خفض CAC',
  'How to Lower Your CPL': 'كيفية خفض CPL',
  'How to Lower Your nCAC': 'كيفية خفض nCAC',
  'How to Improve GRR': 'كيفية تحسين GRR',
  'How to Improve NRR': 'كيفية تحسين NRR',
  'How to Improve LTV:CAC Ratio': 'كيفية تحسين نسبة LTV:CAC',
  '7 Ways to Increase AOV': '7 طرق لزيادة AOV',
  'Pro Tip: Look Beyond the Mean': 'نصيحة احترافية: لا تكتفِ بالمتوسط الحسابي',
};

function fixDeep(obj) {
  if (typeof obj === 'string') return HEADING_MAP[obj] ?? obj;
  if (Array.isArray(obj)) return obj.map(fixDeep);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = fixDeep(v);
    return out;
  }
  return obj;
}

const ar = JSON.parse(readFileSync(arPath, 'utf8'));
for (const slug of Object.keys(ar.calcs)) {
  if (ar.calcs[slug].education) {
    ar.calcs[slug].education = fixDeep(ar.calcs[slug].education);
  }
}
writeFileSync(arPath, `${JSON.stringify(ar, null, 2)}\n`);
console.log('Fixed Arabic heading fallbacks');
