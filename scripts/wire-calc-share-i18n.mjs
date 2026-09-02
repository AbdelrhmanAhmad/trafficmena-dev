#!/usr/bin/env node
/**
 * Adds share i18n keys and updates handleShare in calculator components.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const componentsDir = join(root, 'src/features/calculators/components');
const enPath = join(root, 'src/shared/i18n/locales/en/calculators.json');

const SHARE_CONFIG = {
  AOVCalculator: {
    slug: 'aov',
    key: 'result',
    template: `t('calcs.aov.share.result', {
      aov: formatCurrency(aov, currency),
      revenue: formatCurrency(parseFloat(totalRevenue) || 0, currency),
      orders: parseInt(numberOfOrders, 10).toLocaleString(),
    })`,
    condition: 'aov !== null',
  },
  BreakevenROASCalculator: {
    slug: 'breakeven-roas',
    key: 'result',
    template: `t('calcs.breakeven-roas.share.result', {
      grossMargin,
      breakevenRoas: breakevenROAS.toFixed(2),
      targetRoas: targetROAS !== null ? targetROAS.toFixed(2) + 'x' : '—',
      profitMargin: profitMargin !== null ? profitMargin.toFixed(1) + '%' : '—',
    })`,
    condition: 'breakevenROAS !== null',
    multiline: true,
  },
  CACCalculator: {
    slug: 'cac',
    key: 'result',
    template: `t('calcs.cac.share.result', {
      cac: formatCurrency(cac.toFixed(2), currency),
      spend: formatCurrency(totalSpend, currency),
      customers: parseInt(customersAcquired, 10).toLocaleString(),
    })`,
    condition: 'cac !== null',
  },
  CACPaybackCalculator: {
    slug: 'cac-payback',
    key: 'result',
    template: `t('calcs.cac-payback.share.result', {
      payback: paybackPeriod.toFixed(1),
      cac: formatCurrency(cac, currency),
      revenue: formatCurrency(monthlyRevenue, currency),
      margin: grossMargin,
    })`,
    condition: 'paybackPeriod !== null',
  },
  CartAbandonmentRateCalculator: {
    slug: 'cart-abandonment',
    key: 'result',
    template: `t('calcs.cart-abandonment.share.result', {
      rate: abandonmentRate.toFixed(2),
      created: cartsCreated,
      completed: cartsCompleted,
    })`,
    condition: 'abandonmentRate !== null',
    multiline: true,
  },
  CheckoutAbandonmentRateCalculator: {
    slug: 'checkout-abandonment',
    key: 'result',
    template: `t('calcs.checkout-abandonment.share.result', {
      rate: abandonmentRate.toFixed(2),
      started: checkoutsStarted,
      completed: checkoutsCompleted,
    })`,
    condition: 'abandonmentRate !== null',
    multiline: true,
  },
  CPCCalculator: {
    slug: 'cpc',
    key: 'result',
    template: `t('calcs.cpc.share.result', {
      cpc: formatCurrency(cpc.toFixed(2), currency),
      spend: formatCurrency(adSpend, currency),
      clicks: parseInt(clicks, 10).toLocaleString(),
    })`,
    condition: 'cpc !== null',
  },
  CPLCalculator: {
    slug: 'cpl',
    key: 'result',
    template: `t('calcs.cpl.share.result', {
      cpl: formatCurrency(cpl, currency),
      spend: formatCurrency(totalSpend, currency),
      leads: leadsGenerated,
    })`,
    condition: 'cpl !== null',
    multiline: true,
  },
  CPMCalculator: {
    slug: 'cpm',
    key: 'result',
    template: `t('calcs.cpm.share.result', {
      cpm: formatCurrency(cpm.toFixed(2), currency),
      spend: formatCurrency(adSpend, currency),
      impressions: parseInt(impressions, 10).toLocaleString(),
    })`,
    condition: 'cpm !== null',
  },
  CTRCalculator: {
    slug: 'ctr',
    key: 'result',
    template: `t('calcs.ctr.share.result', {
      ctr: ctr.toFixed(2),
      clicks: parseInt(clicks, 10).toLocaleString(),
      impressions: parseInt(impressions, 10).toLocaleString(),
    })`,
    condition: 'ctr !== null',
  },
  CVRCalculator: {
    slug: 'cvr',
    key: 'result',
    template: `t('calcs.cvr.share.result', {
      cvr: cvr.toFixed(2),
      conversions: parseInt(conversions, 10).toLocaleString(),
      visitors: parseInt(visitors, 10).toLocaleString(),
    })`,
    condition: 'cvr !== null',
  },
  GRRCalculator: {
    slug: 'grr',
    key: 'result',
    template: `t('calcs.grr.share.result', {
      grr: grr.toFixed(1),
      starting: formatCurrency(startingMRR, currency),
      retained: formatCurrency(retainedMRR?.toFixed(0) || '0', currency),
      lost: formatCurrency(lostMRR?.toFixed(0) || '0', currency),
    })`,
    condition: 'grr !== null',
  },
  LeadToCustomerRateCalculator: {
    slug: 'lead-to-customer',
    key: 'result',
    template: `t('calcs.lead-to-customer.share.result', {
      rate: conversionRate.toFixed(2),
      leads: totalLeads,
      customers: customersAcquired,
    })`,
    condition: 'conversionRate !== null',
    multiline: true,
  },
  LTVCalculator: {
    slug: 'ltv',
    key: 'result',
    template: `t('calcs.ltv.share.result', {
      ltv: formatCurrency(ltv.toFixed(2), currency),
      aov: formatCurrency(aov, currency),
      frequency: purchaseFrequency,
      margin: grossMargin,
      ratio: ltvCacRatio !== null ? ltvCacRatio.toFixed(1) + ':1' : '',
    })`,
    condition: 'ltv !== null',
  },
  LTVCACCalculator: {
    slug: 'ltv-cac',
    key: 'result',
    template: `t('calcs.ltv-cac.share.result', {
      ratio: ratio.toFixed(1),
      ltv: formatCurrency(ltv, currency),
      cac: formatCurrency(cac, currency),
    })`,
    condition: 'ratio !== null',
  },
  MERCalculator: {
    slug: 'mer',
    key: 'result',
    template: `t('calcs.mer.share.result', {
      mer: mer.toFixed(2),
      percent: merPercentage?.toFixed(0),
      revenue: formatCurrency(totalRevenue, currency),
      spend: formatCurrency(totalMarketingSpend, currency),
    })`,
    condition: 'mer !== null',
  },
  MoMGrowthCalculator: {
    slug: 'mom-growth',
    key: 'result',
    custom: true,
  },
  NCACCalculator: {
    slug: 'ncac',
    key: 'result',
    template: `t('calcs.ncac.share.result', {
      ncac: formatCurrency(ncac.toFixed(2), currency),
      spend: formatCurrency(totalSpend, currency),
      customers: parseInt(newCustomers, 10).toLocaleString(),
      profit: profitPerCustomer !== null ? formatCurrency(profitPerCustomer.toFixed(2), currency) : '',
    })`,
    condition: 'ncac !== null',
  },
  NRRCalculator: {
    slug: 'nrr',
    key: 'result',
    template: `t('calcs.nrr.share.result', {
      nrr: nrr.toFixed(1),
      starting: formatCurrency(startingMRR, currency),
      ending: formatCurrency(endingMRR, currency),
    })`,
    condition: 'nrr !== null',
  },
  ROASCalculator: {
    slug: 'roas',
    key: 'result',
    template: `t('calcs.roas.share.result', {
      roas: roas.toFixed(1),
      spend: formatCurrency(adSpend, currency),
      revenue: formatCurrency(adRevenue, currency),
    })`,
    condition: 'roas !== null',
  },
  RepeatPurchaseRateCalculator: {
    slug: 'repeat-purchase',
    key: 'result',
    template: `t('calcs.repeat-purchase.share.result', {
      rate: rpr.toFixed(2),
      repeat: repeatCustomers,
      total: totalCustomers,
    })`,
    condition: 'rpr !== null',
    multiline: true,
  },
  SEOROICalculator: {
    slug: 'seo-roi',
    key: 'result',
    custom: true,
  },
  SaaSLTVCalculator: {
    slug: 'saas-ltv',
    key: 'result',
    custom: true,
  },
};

const SHARE_STRINGS = {
  aov: { result: 'My AOV: {{aov}} | Total Revenue: {{revenue}} | Orders: {{orders}}' },
  'breakeven-roas': {
    result:
      '{{breakevenRoasLabel}} Calculator Results:\nGross Margin: {{grossMargin}}%\n{{breakevenRoasLabel}}: {{breakevenRoas}}x\nTarget ROAS: {{targetRoas}}\nProfit Margin: {{profitMargin}}',
  },
  cac: {
    result: 'My CAC: {{cac}} | Total Spend: {{spend}} | Customers Acquired: {{customers}}',
  },
  'cac-payback': {
    result:
      'My {{paybackLabel}}: {{payback}} months | CAC: {{cac}} | Monthly Revenue: {{revenue}} | Gross Margin: {{margin}}%',
  },
  'cart-abandonment': {
    result:
      'My {{rateLabel}}: {{rate}}%\nCarts Created: {{created}}\nCarts Completed: {{completed}}\n\nCalculated with {{panelTitle}}',
  },
  'checkout-abandonment': {
    result:
      'My {{rateLabel}}: {{rate}}%\n{{startedLabel}}: {{started}}\n{{completedLabel}}: {{completed}}\n\nCalculated with {{panelTitle}}',
  },
  cpc: { result: 'My CPC: {{cpc}} | Ad Spend: {{spend}} | Clicks: {{clicks}}' },
  cpl: {
    result:
      'My {{cplLabel}}: {{cpl}}\nTotal Spend: {{spend}}\n{{leadsLabel}}: {{leads}}\n\nCalculated with {{panelTitle}}',
  },
  cpm: { result: 'My CPM: {{cpm}} | Ad Spend: {{spend}} | Impressions: {{impressions}}' },
  ctr: { result: 'My CTR: {{ctr}}% | Clicks: {{clicks}} | Impressions: {{impressions}}' },
  cvr: { result: 'My CVR: {{cvr}}% | Conversions: {{conversions}} | Visitors: {{visitors}}' },
  grr: {
    result:
      'My GRR: {{grr}}% | Starting MRR: {{starting}} | Retained: {{retained}} | Lost: {{lost}}',
  },
  'lead-to-customer': {
    result:
      'My {{rateLabel}}: {{rate}}%\n{{leadsLabel}}: {{leads}}\n{{customersLabel}}: {{customers}}\n\nCalculated with {{panelTitle}}',
  },
  ltv: {
    result:
      'My Ecommerce LTV: {{ltv}} | AOV: {{aov}} | Purchases/Customer: {{frequency}} | Gross Margin: {{margin}}%{{ratio}}',
  },
  'ltv-cac': { result: 'My {{ratioLabel}}: {{ratio}}:1 | LTV: {{ltv}} | CAC: {{cac}}' },
  mer: {
    result:
      'My MER: {{mer}}x ({{percent}}%) | Revenue: {{revenue}} | Marketing Spend: {{spend}}',
  },
  'mom-growth': {
    result: 'Month-Over-Month Growth Calculator Results',
    mom: 'MoM Growth: {{value}}%',
    cmgr: 'CMGR: {{value}}%',
  },
  ncac: {
    result:
      'My nCAC: {{ncac}} | Total Spend: {{spend}} | New Customers: {{customers}}{{profit}}',
    profitSuffix: ' | First-Purchase Profit: {{profit}}',
  },
  nrr: {
    result: 'My NRR: {{nrr}}% | Starting MRR: {{starting}} | Ending MRR: {{ending}}',
  },
  roas: { result: 'My ROAS: {{roas}}% | Ad Spend: {{spend}} | Revenue: {{revenue}}' },
  'repeat-purchase': {
    result:
      'My {{rateLabel}}: {{rate}}%\nRepeat Customers: {{repeat}}\n{{totalLabel}}: {{total}}\n\nCalculated with {{panelTitle}}',
  },
  'seo-roi': {
    result: 'SEO ROI Calculator Results',
    line: '{{label}}: {{value}}',
    projectedRoi: 'Projected ROI: {{value}}',
  },
  'saas-ltv': {
    result:
      'My SaaS LTV: {{ltv}} | ARPU: {{arpu}}/mo | Gross Margin: {{margin}}% | Monthly Churn: {{churn}}%',
    lifetimeSuffix: ' | Customer Lifetime: {{months}} months',
  },
};

const en = JSON.parse(readFileSync(enPath, 'utf8'));
for (const [slug, share] of Object.entries(SHARE_STRINGS)) {
  en.calcs[slug].share = share;
}
writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`);

function replaceHandleShare(content, config) {
  if (config.custom) return content;
  const handler = config.multiline
    ? `const handleShare = () => {
    const text =
      ${config.condition}
        ? ${config.template}
        : null;
    shareToClipboard(text);
  };`
    : `const handleShare = () => {
    const text =
      ${config.condition}
        ? ${config.template}
        : null;
    shareToClipboard(text);
  };`;

  return content.replace(/const handleShare = \(\) => \{[\s\S]*?\n  \};/, handler);
}

for (const [file, config] of Object.entries(SHARE_CONFIG)) {
  if (config.custom) continue;
  const path = join(componentsDir, `${file}.tsx`);
  let content = readFileSync(path, 'utf8');
  content = replaceHandleShare(content, config);
  writeFileSync(path, content);
  console.log(`Updated share for ${file}`);
}

console.log('Added share strings to en/calculators.json');
