#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const componentsDir = join(root, 'src/features/calculators/components');
const en = JSON.parse(readFileSync(join(root, 'src/shared/i18n/locales/en/calculators.json'), 'utf8'));
const ar = JSON.parse(readFileSync(join(root, 'src/shared/i18n/locales/ar/calculators.json'), 'utf8'));

const SLUGS = [
  'cpc', 'cpm', 'cpl', 'ctr', 'cac', 'ncac', 'cac-payback', 'cvr',
  'cart-abandonment', 'checkout-abandonment', 'lead-to-customer', 'repeat-purchase',
  'aov', 'ltv', 'saas-ltv', 'ltv-cac', 'roas', 'breakeven-roas',
  'grr', 'nrr', 'mom-growth', 'mer', 'seo-roi',
];

const FILE_BY_SLUG = {
  cpc: 'CPCCalculator.tsx', cpm: 'CPMCalculator.tsx', cpl: 'CPLCalculator.tsx',
  ctr: 'CTRCalculator.tsx', cac: 'CACCalculator.tsx', ncac: 'NCACCalculator.tsx',
  'cac-payback': 'CACPaybackCalculator.tsx', cvr: 'CVRCalculator.tsx',
  'cart-abandonment': 'CartAbandonmentRateCalculator.tsx',
  'checkout-abandonment': 'CheckoutAbandonmentRateCalculator.tsx',
  'lead-to-customer': 'LeadToCustomerRateCalculator.tsx',
  'repeat-purchase': 'RepeatPurchaseRateCalculator.tsx',
  aov: 'AOVCalculator.tsx', ltv: 'LTVCalculator.tsx', 'saas-ltv': 'SaaSLTVCalculator.tsx',
  'ltv-cac': 'LTVCACCalculator.tsx', roas: 'ROASCalculator.tsx',
  'breakeven-roas': 'BreakevenROASCalculator.tsx', grr: 'GRRCalculator.tsx',
  nrr: 'NRRCalculator.tsx', 'mom-growth': 'MoMGrowthCalculator.tsx',
  mer: 'MERCalculator.tsx', 'seo-roi': 'SEOROICalculator.tsx',
};

console.log('| Slug | Panel | EN Edu | AR Edu | EN Share | AR Share |');
console.log('|------|-------|--------|--------|----------|----------|');

let complete = 0;
for (const slug of SLUGS) {
  const file = join(componentsDir, FILE_BY_SLUG[slug]);
  const content = readFileSync(file, 'utf8');
  const hasPanel = content.includes(`CalculatorEducationPanel slug="${slug}"`);
  const enSections = en.calcs[slug]?.education?.sections?.length ?? 0;
  const arSections = ar.calcs[slug]?.education?.sections?.length ?? 0;
  const enShare = Boolean(en.calcs[slug]?.share?.result);
  const arShare = Boolean(ar.calcs[slug]?.share?.result);
  const ok = hasPanel && enSections > 0 && arSections > 0 && enShare && arShare;
  if (ok) complete++;
  console.log(`| ${slug} | ${hasPanel ? '✓' : '✗'} | ${enSections} | ${arSections} | ${enShare ? '✓' : '✗'} | ${arShare ? '✓' : '✗'} |`);
}
console.log(`\n${complete}/23 complete`);
