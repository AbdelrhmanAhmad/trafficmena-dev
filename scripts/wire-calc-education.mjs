#!/usr/bin/env node
/**
 * Replaces left-column educational JSX with CalculatorEducationPanel
 * and fixes handleShare to use i18n.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const componentsDir = join(root, 'src/features/calculators/components');

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

function ensureEducationImport(content) {
  if (content.includes('CalculatorEducationPanel')) return content;
  return content.replace(
    "import { CalculatorActionButtons, CalculatorFeedback } from './shared';",
    "import { CalculatorActionButtons, CalculatorEducationPanel, CalculatorFeedback } from './shared';",
  );
}

function replaceLeftColumn(content, slug) {
  const leftMarker = /{\/\* Left Column - Educational Content \*\/}/;
  const rightMarker = /{\/\* Right Column/;
  const leftIdx = content.search(leftMarker);
  const rightIdx = content.search(rightMarker);
  if (leftIdx === -1 || rightIdx === -1) {
    console.warn(`Could not find column markers`);
    return content;
  }

  const before = content.slice(0, leftIdx);
  const after = content.slice(rightIdx);

  const needsValues = content.slice(leftIdx, rightIdx).includes('formatCurrency');
  const panel = needsValues
    ? `{/* Left Column - Educational Content */}
        <CalculatorEducationPanel slug="${slug}" values={educationValues} />`
    : `{/* Left Column - Educational Content */}
        <CalculatorEducationPanel slug="${slug}" />`;

  return `${before}${panel}

        ${after}`;
}

function fixShareHandler(content, slug) {
  // Replace broken {t('...')} in template literals with actual t() calls
  content = content.replace(
    /`([^`]*)\{t\('([^']+)'\)\}([^`]*)`/g,
    (_match, before, key, after) => `\`${before}\${t('${key}')}${after}\``,
  );

  // If already uses t('calcs.${slug}.share
  if (content.includes(`calcs.${slug}.share`)) return content;

  return content;
}

for (const [file, slug] of Object.entries(SLUG_BY_FILE)) {
  const path = join(componentsDir, `${file}.tsx`);
  let content = readFileSync(path, 'utf8');
  content = ensureEducationImport(content);
  content = replaceLeftColumn(content, slug);
  content = fixShareHandler(content, slug);
  writeFileSync(path, content);
  console.log(`Wired ${file}`);
}

console.log('Done wiring education panels');
