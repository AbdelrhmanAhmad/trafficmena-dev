#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const componentsDir = join(root, 'src/features/calculators/components');
const en = JSON.parse(readFileSync(join(root, 'src/shared/i18n/locales/en/calculators.json'), 'utf8'));

const SLUG_BY_FILE = {
  AOVCalculator: 'aov',
  BreakevenROASCalculator: 'breakeven-roas',
  CACCalculator: 'cac',
  CACPaybackCalculator: 'cac-payback',
  CartAbandonmentRateCalculator: 'cart-abandonment',
  CheckoutAbandonmentRateCalculator: 'checkout-abandonment',
  CPCCalculator: 'cpc',
  CPLCalculator: 'cpl',
  CPMCalculator: 'cpm',
  CTRCalculator: 'ctr',
  CVRCalculator: 'cvr',
  GRRCalculator: 'grr',
  LeadToCustomerRateCalculator: 'lead-to-customer',
  LTVCalculator: 'ltv',
  LTVCACCalculator: 'ltv-cac',
  MERCalculator: 'mer',
  MoMGrowthCalculator: 'mom-growth',
  NCACCalculator: 'ncac',
  NRRCalculator: 'nrr',
  ROASCalculator: 'roas',
  RepeatPurchaseRateCalculator: 'repeat-purchase',
  SEOROICalculator: 'seo-roi',
  SaaSLTVCalculator: 'saas-ltv',
};

function flattenStrings(obj, prefix, slug, out) {
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'title' || key === 'description') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      if (value === '0' || value === '—' || value.length < 2) continue;
      out.push([value, `{t('calcs.${slug}.${path}')}`]);
      out.push([`'${value.replace(/'/g, "\\'")}'`, `t('calcs.${slug}.${path}')`]);
    } else if (value && typeof value === 'object') {
      flattenStrings(value, path, slug, out);
    }
  }
}

function ensureImports(content) {
  let next = content;
  if (!next.includes("from 'react-i18next'")) {
    const hooks = ['useId, useState', 'useId, useMemo, useState', 'useState', 'useMemo, useState'];
    for (const h of hooks) {
      if (next.includes(`import { ${h} }`)) {
        next = next.replace(`import { ${h} }`, `import { useTranslation } from 'react-i18next';\nimport { ${h} }`);
        break;
      }
    }
  }
  if (!next.includes("useTranslation('calculators')")) {
    next = next.replace(/const (\w+) = \(\) => \{(\n\s*)/, "const $1 = () => {$2const { t } = useTranslation('calculators');$2");
  }
  return next;
}

const SAFE_COMMON = [
  ['placeholder="0"', "placeholder={t('common.placeholderZero')}"],
  ['placeholder="—"', "placeholder={t('common.placeholderDash')}"],
  ['>Yes</Label>', ">{t('common.yes')}</Label>"],
  ['>No</Label>', ">{t('common.no')}</Label>"],
];

for (const [file, slug] of Object.entries(SLUG_BY_FILE)) {
  const path = join(componentsDir, `${file}.tsx`);
  let content = readFileSync(path, 'utf8');
  content = ensureImports(content);

  const pairs = [...SAFE_COMMON];
  flattenStrings(en.calcs[slug], '', slug, pairs);
  pairs.sort((a, b) => b[0].length - a[0].length);

  const seen = new Set();
  for (const [from, to] of pairs) {
    if (!from || seen.has(from) || !content.includes(from)) continue;
    seen.add(from);
    content = content.split(from).join(to);
  }

  writeFileSync(path, content);
  console.log(`Patched ${file} (${slug})`);
}

console.log('Done');
