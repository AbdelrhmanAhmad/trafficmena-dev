#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const enPath = join(root, 'src/shared/i18n/locales/en/calculators.json');
const arPath = join(root, 'src/shared/i18n/locales/ar/calculators.json');

const en = JSON.parse(readFileSync(enPath, 'utf8'));
const ar = JSON.parse(readFileSync(arPath, 'utf8'));

// Fix breakeven share template
en.calcs['breakeven-roas'].share = {
  result:
    '{{breakevenRoasLabel}} Calculator Results:\nGross Margin: {{grossMargin}}%\n{{breakevenRoasLabel}}: {{breakevenRoas}}x\nCurrent ROAS: {{currentRoas}}',
};

const AR_SHARE = {
  aov: { result: 'AOV الخاص بي: {{aov}} | إجمالي الإيرادات: {{revenue}} | الطلبات: {{orders}}' },
  'breakeven-roas': {
    result:
      'نتائج حاسبة {{breakevenRoasLabel}}:\nهامش الربح الإجمالي: {{grossMargin}}%\n{{breakevenRoasLabel}}: {{breakevenRoas}}x\nROAS الحالي: {{currentRoas}}',
  },
  cac: { result: 'CAC الخاص بي: {{cac}} | إجمالي الإنفاق: {{spend}} | العملاء المكتسبون: {{customers}}' },
  'cac-payback': {
    result:
      '{{paybackLabel}}: {{payback}} شهر | CAC: {{cac}} | الإيراد الشهري: {{revenue}} | هامش الربح: {{margin}}%',
  },
  'cart-abandonment': {
    result:
      '{{rateLabel}}: {{rate}}%\nسلات منشأة: {{created}}\nسلات مكتملة: {{completed}}\n\n{{panelTitle}}',
  },
  'checkout-abandonment': {
    result:
      '{{rateLabel}}: {{rate}}%\n{{startedLabel}}: {{started}}\n{{completedLabel}}: {{completed}}\n\n{{panelTitle}}',
  },
  cpc: { result: 'CPC الخاص بي: {{cpc}} | الإنفاق الإعلاني: {{spend}} | النقرات: {{clicks}}' },
  cpl: {
    result: '{{cplLabel}}: {{cpl}}\nإجمالي الإنفاق: {{spend}}\n{{leadsLabel}}: {{leads}}\n\n{{panelTitle}}',
  },
  cpm: { result: 'CPM الخاص بي: {{cpm}} | الإنفاق الإعلاني: {{spend}} | مرات الظهور: {{impressions}}' },
  ctr: { result: 'CTR الخاص بي: {{ctr}}% | النقرات: {{clicks}} | مرات الظهور: {{impressions}}' },
  cvr: { result: 'CVR الخاص بي: {{cvr}}% | التحويلات: {{conversions}} | الزوار: {{visitors}}' },
  grr: {
    result: 'GRR: {{grr}}% | MRR الابتدائي: {{starting}} | المحتفظ به: {{retained}} | المفقود: {{lost}}',
  },
  'lead-to-customer': {
    result:
      '{{rateLabel}}: {{rate}}%\n{{leadsLabel}}: {{leads}}\n{{customersLabel}}: {{customers}}\n\n{{panelTitle}}',
  },
  ltv: {
    result:
      'LTV للتجارة الإلكترونية: {{ltv}} | AOV: {{aov}} | المشتريات/عميل: {{frequency}} | هامش الربح: {{margin}}%{{ratio}}',
  },
  'ltv-cac': { result: '{{ratioLabel}}: {{ratio}}:1 | LTV: {{ltv}} | CAC: {{cac}}' },
  mer: {
    result: 'MER: {{mer}}x ({{percent}}%) | الإيرادات: {{revenue}} | الإنفاق التسويقي: {{spend}}',
  },
  'mom-growth': {
    result: 'نتائج حاسبة النمو الشهري',
    mom: 'نمو MoM: {{value}}%',
    cmgr: 'CMGR: {{value}}%',
  },
  ncac: {
    result: 'nCAC: {{ncac}} | الإنفاق: {{spend}} | عملاء جدد: {{customers}}{{profit}}',
    profitSuffix: ' | ربح الشراء الأول: {{profit}}',
  },
  nrr: { result: 'NRR: {{nrr}}% | MRR الابتدائي: {{starting}} | MRR النهائي: {{ending}}' },
  roas: { result: 'ROAS: {{roas}}% | الإنفاق الإعلاني: {{spend}} | الإيرادات: {{revenue}}' },
  'repeat-purchase': {
    result:
      '{{rateLabel}}: {{rate}}%\nعملاء متكررون: {{repeat}}\n{{totalLabel}}: {{total}}\n\n{{panelTitle}}',
  },
  'seo-roi': {
    result: 'نتائج حاسبة ROI للـ SEO',
    line: '{{label}}: {{value}}',
    projectedRoi: 'ROI المتوقع: {{value}}',
  },
  'saas-ltv': {
    result:
      'LTV SaaS: {{ltv}} | ARPU: {{arpu}}/شهر | هامش الربح: {{margin}}% | Churn شهري: {{churn}}%',
    lifetimeSuffix: ' | عمر العميل: {{months}} شهر',
  },
};

for (const slug of Object.keys(en.calcs)) {
  if (en.calcs[slug].share) ar.calcs[slug].share = AR_SHARE[slug] ?? en.calcs[slug].share;
}

writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`);
writeFileSync(arPath, `${JSON.stringify(ar, null, 2)}\n`);
console.log('Updated share strings in en/ar calculators.json');
