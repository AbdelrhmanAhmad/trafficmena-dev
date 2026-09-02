import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const calcsMeta = [
  ['cpc', 'Cost Per Click', 'Calculate cost efficiency per click', 'traffic'],
  ['cpm', 'Cost Per Mille', 'Cost per 1000 impressions', 'traffic'],
  ['cpl', 'Cost Per Lead', 'Calculate lead acquisition cost', 'traffic'],
  ['ctr', 'Click-Through Rate', 'Measure click engagement', 'traffic'],
  ['cac', 'Customer Acquisition Cost', 'Total cost to acquire a customer', 'traffic'],
  ['ncac', 'New CAC', 'New customer acquisition cost', 'traffic'],
  ['cac-payback', 'CAC Payback Period', 'Time to recover acquisition cost', 'traffic'],
  ['cvr', 'Conversion Rate', 'Track visitor to customer conversion', 'conversion'],
  ['cart-abandonment', 'Cart Abandonment Rate', 'Shopping cart drop-off rate', 'conversion'],
  ['checkout-abandonment', 'Checkout Abandonment', 'Checkout process drop-off rate', 'conversion'],
  ['lead-to-customer', 'Lead to Customer Rate', 'Lead conversion efficiency', 'conversion'],
  ['repeat-purchase', 'Repeat Purchase Rate', 'Customer loyalty metric', 'conversion'],
  ['aov', 'Average Order Value', 'Average transaction value', 'revenue'],
  ['ltv', 'Customer Lifetime Value', 'Total customer value over time', 'revenue'],
  ['saas-ltv', 'SaaS LTV Calculator', 'Subscription lifetime value', 'revenue'],
  ['ltv-cac', 'LTV:CAC Ratio', 'Customer value vs acquisition cost', 'revenue'],
  ['roas', 'Return on Ad Spend', 'Ad revenue efficiency', 'revenue'],
  ['breakeven-roas', 'Breakeven ROAS', 'Minimum ROAS for profitability', 'revenue'],
  ['grr', 'Gross Revenue Retention', 'Revenue kept from existing customers', 'retention'],
  ['nrr', 'Net Revenue Retention', 'Revenue growth from existing customers', 'retention'],
  ['mom-growth', 'Month over Month Growth', 'Monthly growth rate tracking', 'retention'],
  ['mer', 'Marketing Efficiency Ratio', 'Overall marketing ROI', 'efficiency'],
  ['seo-roi', 'SEO ROI Calculator', 'Organic search return on investment', 'efficiency'],
];

const calcUi = {
  cpc: {
    panelTitle: 'Cost Per Click (CPC)',
    fields: { adSpend: 'Total ad spend', clicks: 'Total clicks' },
    results: { cpc: 'CPC (Cost Per Click)', totalClicksReceived: 'Total clicks received' },
    performance: {
      high: 'High CPC. Consider improving ad quality or adjusting targeting.',
      aboveAverage: 'Above average CPC. May be a competitive industry.',
      average: 'Average CPC range for most platforms.',
      excellent: 'Excellent CPC. Very cost-efficient clicks!',
    },
  },
  cpm: {
    panelTitle: 'Cost Per Mille (CPM)',
    fields: { adSpend: 'Total ad spend', impressions: 'Total impressions' },
    results: { cpm: 'CPM (Cost Per 1,000 Impressions)', costPerImpression: 'Cost per single impression' },
    performance: {
      high: 'High CPM. Consider optimizing targeting or creative.',
      aboveAverage: 'Above average CPM. May be premium inventory.',
      average: 'Average CPM range for most platforms.',
      excellent: 'Excellent CPM. Very cost-efficient impressions!',
    },
  },
  cpl: {
    panelTitle: 'CPL Calculator',
    fields: { totalSpend: 'Total Marketing/Ad Spend', leadsGenerated: 'Leads Generated' },
    placeholders: { totalSpend: 'Enter total spend', leadsGenerated: 'Enter number of leads' },
    results: { cpl: 'Cost Per Lead (CPL)' },
    performance: {
      excellent: '🚀 Excellent CPL! Well below industry average.',
      good: '✅ Good CPL. Competitive for most industries.',
      aboveAverage: '📊 Above average CPL. Typical for B2B/SaaS sectors.',
      high: '⚠️ High CPL. Ensure lead quality justifies the cost.',
    },
  },
  ctr: {
    panelTitle: 'Click-Through Rate (CTR)',
    fields: { clicks: 'Total clicks', impressions: 'Total impressions' },
    results: { ctr: 'CTR (Click-Through Rate)' },
    performance: {
      low: 'Low CTR. Consider improving ad copy, creative, or targeting.',
      belowAverage: 'Below average CTR. Room for optimization.',
      good: 'Good CTR. Your ads are performing well.',
      excellent: 'Excellent CTR. Highly engaging ads!',
    },
  },
  cac: {
    panelTitle: 'Customer Acquisition Cost (CAC)',
    fields: { totalSpend: 'Total sales & marketing spend', customersAcquired: 'Number of new customers acquired' },
    results: { cac: 'CAC (Customer Acquisition Cost)' },
    performance: {
      high: 'High CAC. Ensure your LTV justifies this acquisition cost.',
      aboveAverage: 'Above average CAC. Typical for B2B and SaaS industries.',
      reasonable: 'Reasonable CAC. Competitive for most industries.',
      excellent: 'Excellent CAC. Very efficient customer acquisition!',
    },
  },
  ncac: {
    panelTitle: 'New Customer Acquisition Cost (nCAC)',
    fields: {
      adSpend: 'Total ad spend',
      newCustomers: 'Number of NEW customers only (first-time buyers)',
      aovOptional: 'Average order value (optional)',
    },
    results: { ncac: 'nCAC (New Customer Acquisition Cost)', firstPurchaseProfit: 'First-purchase profit per customer' },
    performance: {
      high: 'High nCAC. Ensure LTV justifies this cost or optimize targeting.',
      aboveAverage: 'Above average nCAC. Typical for B2B, SaaS, or competitive niches.',
      reasonable: 'Reasonable nCAC. Compare against your AOV and LTV.',
      excellent: 'Excellent nCAC. Efficient new customer acquisition!',
      negativeProfitOk: 'Negative first-purchase profit is acceptable if customer LTV exceeds nCAC over time.',
      positiveProfit: 'Profitable on first purchase. Strong acquisition efficiency!',
    },
  },
  'cac-payback': {
    panelTitle: 'CAC Payback Period Calculator',
    fields: { cac: 'Customer acquisition cost (CAC)', monthlyRevenue: 'Monthly revenue per customer (ARPU)', grossMargin: 'Gross margin (%)' },
    results: { monthlyGrossProfit: 'Monthly gross profit per customer', paybackPeriod: 'CAC Payback Period' },
  },
  cvr: {
    panelTitle: 'Conversion Rate (CVR)',
    fields: { conversions: 'Total conversions', visitors: 'Total visitors' },
    results: { cvr: 'CVR (Conversion Rate)' },
    performance: {
      low: 'Low CVR. Significant optimization needed on your funnel.',
      belowAverage: 'Below average CVR. Room for improvement.',
      good: 'Good CVR. Performing well for most industries.',
      excellent: 'Excellent CVR. Top-performing conversion rate!',
    },
  },
  'cart-abandonment': {
    panelTitle: 'Cart Abandonment Rate Calculator',
    fields: { cartsCreated: 'Shopping Carts Created', cartsCompleted: 'Completed Purchases' },
    placeholders: { cartsCreated: 'Enter number of carts created', cartsCompleted: 'Enter number of completed purchases' },
    results: { rate: 'Cart Abandonment Rate' },
  },
  'checkout-abandonment': {
    panelTitle: 'Checkout Abandonment Rate Calculator',
    fields: { checkoutsStarted: 'Checkouts Started', checkoutsCompleted: 'Checkouts Completed' },
    placeholders: { checkoutsStarted: 'Enter number of checkouts initiated', checkoutsCompleted: 'Enter number of completed purchases' },
    results: { rate: 'Checkout Abandonment Rate' },
  },
  'lead-to-customer': {
    panelTitle: 'Lead-to-Customer Rate Calculator',
    fields: { totalLeads: 'Total Leads', customersAcquired: 'Customers Acquired' },
    results: { rate: 'Lead-to-Customer Rate' },
  },
  'repeat-purchase': {
    panelTitle: 'Repeat Purchase Rate Calculator',
    fields: { repeatCustomers: 'Customers Who Bought More Than Once', totalCustomers: 'Total Customers' },
    placeholders: { repeatCustomers: 'Enter number of repeat customers', totalCustomers: 'Enter total number of customers' },
    results: { rate: 'Repeat Purchase Rate' },
  },
  aov: {
    panelTitle: 'Average Order Value (AOV)',
    fields: { totalRevenue: 'Total revenue', numberOfOrders: 'Number of orders' },
    results: { aov: 'AOV (Average Order Value)' },
    performance: {
      low: 'Low AOV. Consider bundles, upsells, or free shipping thresholds.',
      moderate: 'Moderate AOV. Typical for apparel, beauty, or food industries.',
      strong: 'Strong AOV. Above global average of $145.',
      excellent: 'Excellent AOV. High-value products or effective upselling!',
    },
  },
  ltv: {
    panelTitle: 'Ecommerce LTV (Customer Lifetime Value)',
    fields: {
      aov: 'Average order value (AOV)',
      purchaseFrequency: 'Purchases per customer (lifetime)',
      grossMargin: 'Gross margin (%)',
      cacOptional: 'Customer acquisition cost (optional, for ratio)',
    },
    results: { ltv: 'LTV (Customer Lifetime Value)', ltvCacRatio: 'LTV:CAC Ratio' },
  },
  'saas-ltv': {
    panelTitle: 'SaaS LTV (Subscription Lifetime Value)',
    fields: {
      arpu: 'Average revenue per user (ARPU) / month',
      grossMargin: 'Gross margin (%)',
      churnRate: 'Monthly churn rate (%)',
      cacOptional: 'Customer acquisition cost (optional, for ratio)',
    },
    results: { avgLifetime: 'Average customer lifetime', ltv: 'SaaS LTV (Customer Lifetime Value)', ltvCacRatio: 'LTV:CAC Ratio' },
  },
  'ltv-cac': {
    panelTitle: 'LTV:CAC Ratio Calculator',
    fields: { ltv: 'Customer lifetime value (LTV)', cac: 'Customer acquisition cost (CAC)' },
    results: { ratio: 'LTV:CAC Ratio' },
  },
  roas: {
    panelTitle: 'Return on ad spend (ROAS)',
    panelTitleRoi: 'Return on investment (ROI)',
    fields: {
      adSpend: 'Ad spend',
      knowsRevenue: 'Do you know your revenue?',
      adRevenue: 'Ad revenue',
      targetRoas: 'Target ROAS (enter 100% for breakeven)',
      profitMargin: 'Profit margin',
    },
    results: { requiredRevenue: 'Required ad revenue', roas: 'ROAS', roi: 'ROI' },
    hints: {
      requiredRevenue: 'You need {{amount}} in revenue to achieve {{target}}% ROAS',
      roiBasis: 'Based on {{margin}}% profit margin and {{roas}}% ROAS',
      roasVsRoi: 'ROAS vs ROI: ROAS measures revenue per ad dollar, while ROI accounts for profit margins and other costs.',
    },
    performance: {
      losing: "You're losing money on this campaign.",
      breakeven: 'Break-even to moderate return.',
      good: 'Good performance!',
      excellent: 'Excellent performance!',
    },
  },
  'breakeven-roas': {
    panelTitle: 'Calculate Break-even ROAS',
    fields: { grossMargin: 'Gross Margin (%)', currentRoasOptional: 'Current ROAS (Optional)' },
    results: { breakevenRoas: 'Break-even ROAS', profitabilityStatus: 'Profitability Status' },
    hints: { currentRoas: 'Enter your current ROAS to see if you\'re profitable' },
    status: { profitable: 'Profitable!', belowBreakeven: 'Below Break-even' },
  },
  grr: {
    panelTitle: 'Gross Revenue Retention (GRR) Calculator',
    fields: {
      startingMrr: 'Starting MRR (from existing customers)',
      contractionMrr: 'Contraction MRR (downgrades, reduced usage)',
      churnMrr: 'Churn MRR (cancellations)',
    },
    results: {
      totalLost: 'Total MRR lost (contraction + churn)',
      retainedMrr: 'Retained MRR',
      grr: 'Gross Revenue Retention (GRR)',
    },
  },
  nrr: {
    panelTitle: 'Net Revenue Retention (NRR) Calculator',
    fields: {
      startingMrr: 'Starting MRR (from existing customers)',
      expansionMrr: 'Expansion MRR (upsells, cross-sells, upgrades)',
      contractionMrr: 'Contraction MRR (downgrades, reduced usage)',
      churnMrr: 'Churn MRR (cancellations)',
    },
    results: {
      endingMrr: 'Ending MRR (from existing customers)',
      nrr: 'Net Revenue Retention (NRR)',
      grr: 'Gross Revenue Retention (GRR)',
    },
  },
  'mom-growth': {
    panelTitle: 'MoM Growth Calculator',
    panelTitleCmgr: 'Compound Monthly Growth Rate (CMGR)',
    fields: {
      previousValue: 'Previous Month Value',
      currentValue: 'Current Month Value',
      startValue: 'Start Value (Month 1)',
      endValue: 'End Value (Final Month)',
      numberOfMonths: 'Number of Months Between',
    },
    placeholders: { previousValue: 'e.g., 100000', currentValue: 'e.g., 120000', startValue: 'e.g., 10000', endValue: 'e.g., 20000', numberOfMonths: 'e.g., 11' },
    results: { momGrowth: 'MoM Growth Rate', cmgr: 'Compound Monthly Growth Rate' },
    hints: { monthsBetween: 'Note: Count months between start and end (Jan to Dec = 11 months)' },
    performance: {
      momNegative: 'Negative growth indicates decline. Analyze root causes immediately.',
      momSlow: 'Slow growth. Consider strategies to accelerate momentum.',
      momHealthy: 'Healthy growth rate for established businesses.',
      momExcellent: 'Excellent growth! Typical for high-performing startups.',
      cmgrNegative: 'Negative CMGR indicates overall decline over the period.',
      cmgrLow: 'Low compound growth. Typical for mature, stable businesses.',
      cmgrSolid: 'Solid compound growth rate for growing businesses.',
      cmgrExceptional: 'Exceptional compound growth! Strong momentum.',
    },
  },
  mer: {
    panelTitle: 'Marketing Efficiency Ratio (MER)',
    fields: { totalRevenue: 'Total revenue', totalMarketingSpend: 'Total marketing spend' },
    results: { merRatio: 'MER (Ratio)', merPercent: 'MER (Percentage)', spendPercent: 'Marketing spend as % of revenue' },
  },
  'seo-roi': {
    panelTitle: 'Current Numbers',
    panelTitleGrowth: 'Growth Potential',
    chartTitle: '12-Month Traffic Projection',
    tableTitle: '12-Month Growth Projections',
    fields: {
      monthlyTraffic: 'Monthly Traffic',
      conversionRate: 'Conversion Rate (%)',
      averageOrderValue: 'Average Order Value',
      customerLifetimeValue: 'Customer Lifetime Value',
      monthlyGrowthRate: 'Monthly Growth Rate (%)',
      seoInvestment: 'Monthly SEO Investment (Optional)',
    },
    placeholders: { monthlyTraffic: 'e.g., 20000', conversionRate: 'e.g., 3', averageOrderValue: 'e.g., 50', customerLifetimeValue: 'e.g., 300', monthlyGrowthRate: 'e.g., 10', seoInvestment: 'e.g., 5000' },
    hints: { seoGrowth: 'Typical SEO growth: 5-15% MoM for well-optimized sites', roiProjection: 'Enter to calculate ROI projection' },
    table: { month: 'Month', traffic: 'Traffic', newSales: 'New Sales', newRevenue: 'New Revenue' },
    totals: { revenue12Month: 'Total 12-Month Revenue:', ltvRevenue: 'Total LTV Revenue:', projectedRoi: 'Projected ROI:' },
    tooltip: { traffic: 'Traffic', monthLabel: 'Month {{month}}' },
  },
};

const en = {
  index: {
    title: 'Marketing Calculators',
    subtitle: '23 essential calculators to measure and optimize your marketing performance',
  },
  detail: {
    notFound: 'Calculator Not Found',
    notFoundDescription: "The calculator you're looking for doesn't exist.",
    notAvailable: 'Calculator Not Available',
    notAvailableDescription: 'This calculator is not yet implemented.',
    backToAll: 'All Calculators',
    loading: 'Loading {{title}}...',
  },
  common: {
    share: 'Share',
    clear: 'Clear',
    calculate: 'Calculate',
    reset: 'Reset',
    currency: 'Currency',
    feedback: 'Was this calculator helpful?',
    loading: 'Loading…',
    notFound: 'Not found',
    backToAll: 'Back to Calculators',
    invalidInput: 'Invalid input',
    placeholderZero: '0',
    placeholderDash: '—',
    yes: 'Yes',
    no: 'No',
    percent: '%',
    optional: '(optional)',
    feedbackThanksTitle: 'Thanks for the feedback!',
    feedbackImproveTitle: "We'll improve!",
    feedbackThanksDescription: "We're glad this calculator helped you.",
    feedbackImproveDescription: 'Your feedback helps us make better tools.',
  },
  categories: {
    traffic: 'Traffic & Acquisition',
    conversion: 'Conversion',
    revenue: 'Revenue & Value',
    retention: 'Retention & Growth',
    efficiency: 'Efficiency',
  },
  calcs: {},
};

for (const [slug, title, description] of calcsMeta) {
  en.calcs[slug] = {
    title,
    description,
    ...(calcUi[slug] ?? {}),
  };
}

const arCategories = {
  traffic: 'حركة المرور والاكتساب',
  conversion: 'التحويل',
  revenue: 'الإيرادات والقيمة',
  retention: 'الاحتفاظ والنمو',
  efficiency: 'الكفاءة',
};

const arCalcTitles = {
  cpc: ['تكلفة النقرة', 'احسب كفاءة التكلفة لكل نقرة'],
  cpm: ['تكلفة الألف ظهور', 'التكلفة لكل 1000 ظهور'],
  cpl: ['تكلفة العميل المحتمل', 'احسب تكلفة اكتساب العميل المحتمل'],
  ctr: ['معدل النقر', 'قياس تفاعل النقرات'],
  cac: ['تكلفة اكتساب العميل', 'إجمالي التكلفة لاكتساب عميل'],
  ncac: ['تكلفة اكتساب العميل الجديد', 'تكلفة اكتساب العميل الجديد'],
  'cac-payback': ['فترة استرداد CAC', 'الوقت اللازم لاسترداد تكلفة الاكتساب'],
  cvr: ['معدل التحويل', 'تتبع تحويل الزائر إلى عميل'],
  'cart-abandonment': ['معدل التخلي عن السلة', 'معدل ترك سلة التسوق'],
  'checkout-abandonment': ['التخلي عن الدفع', 'معدل ترك عملية الدفع'],
  'lead-to-customer': ['معدل تحويل العميل المحتمل', 'كفاءة تحويل العميل المحتمل'],
  'repeat-purchase': ['معدل الشراء المتكرر', 'مقياس ولاء العملاء'],
  aov: ['متوسط قيمة الطلب', 'متوسط قيمة المعاملة'],
  ltv: ['القيمة الدائمة للعميل', 'إجمالي قيمة العميل عبر الزمن'],
  'saas-ltv': ['حاسبة LTV للبرمجيات كخدمة', 'القيمة الدائمة للاشتراك'],
  'ltv-cac': ['نسبة LTV:CAC', 'قيمة العميل مقابل تكلفة الاكتساب'],
  roas: ['العائد على الإنفاق الإعلاني', 'كفاءة إيرادات الإعلان'],
  'breakeven-roas': ['نقطة التعادل ROAS', 'الحد الأدنى للربحية'],
  grr: ['الاحتفاظ الإجمالي بالإيرادات', 'الإيرادات المحتفظ بها من العملاء الحاليين'],
  nrr: ['صافي الاحتفاظ بالإيرادات', 'نمو الإيرادات من العملاء الحاليين'],
  'mom-growth': ['النمو الشهري', 'تتبع معدل النمو الشهري'],
  mer: ['نسبة كفاءة التسويق', 'العائد الإجمالي على التسويق'],
  'seo-roi': ['حاسبة عائد SEO', 'العائد على الاستثمار في البحث العضوي'],
};

function deepTranslate(obj, slug) {
  if (typeof obj !== 'object' || obj === null) return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === 'object' ? deepTranslate(v, slug) : v;
  }
  return out;
}

const ar = JSON.parse(JSON.stringify(en));
ar.index = {
  title: 'حاسبات التسويق',
  subtitle: '23 حاسبة أساسية لقياس وتحسين أداء التسويق',
};
ar.detail = {
  notFound: 'الحاسبة غير موجودة',
  notFoundDescription: 'الحاسبة التي تبحث عنها غير موجودة.',
  notAvailable: 'الحاسبة غير متاحة',
  notAvailableDescription: 'لم يتم تنفيذ هذه الحاسبة بعد.',
  backToAll: 'جميع الحاسبات',
  loading: 'جاري تحميل {{title}}...',
};
ar.common = {
  share: 'مشاركة',
  clear: 'مسح',
  calculate: 'احسب',
  reset: 'إعادة تعيين',
  currency: 'العملة',
  feedback: 'هل كانت هذه الحاسبة مفيدة؟',
  loading: 'جاري التحميل…',
  notFound: 'غير موجود',
  backToAll: 'العودة إلى الحاسبات',
  invalidInput: 'إدخال غير صالح',
  placeholderZero: '0',
  placeholderDash: '—',
  yes: 'نعم',
  no: 'لا',
  percent: '%',
  optional: '(اختياري)',
  feedbackThanksTitle: 'شكراً على ملاحظاتك!',
  feedbackImproveTitle: 'سنعمل على التحسين!',
  feedbackThanksDescription: 'يسعدنا أن هذه الحاسبة ساعدتك.',
  feedbackImproveDescription: 'ملاحظاتك تساعدنا على بناء أدوات أفضل.',
};
ar.categories = arCategories;

const arFieldMap = {
  'Total ad spend': 'إجمالي الإنفاق الإعلاني',
  'Total clicks': 'إجمالي النقرات',
  'Total impressions': 'إجمالي مرات الظهور',
  'Total Marketing/Ad Spend': 'إجمالي إنفاق التسويق/الإعلان',
  'Leads Generated': 'العملاء المحتملون المُولَّدون',
  'Total sales & marketing spend': 'إجمالي إنفاق المبيعات والتسويق',
  'Number of new customers acquired': 'عدد العملاء الجدد المكتسبين',
  'Number of NEW customers only (first-time buyers)': 'عدد العملاء الجدد فقط (المشترون لأول مرة)',
  'Average order value (optional)': 'متوسط قيمة الطلب (اختياري)',
  'Total conversions': 'إجمالي التحويلات',
  'Total visitors': 'إجمالي الزوار',
  'Shopping Carts Created': 'سلات التسوق المُنشأة',
  'Completed Purchases': 'المشتريات المكتملة',
  'Checkouts Started': 'عمليات الدفع المبدوءة',
  'Checkouts Completed': 'عمليات الدفع المكتملة',
  'Total Leads': 'إجمالي العملاء المحتملين',
  'Customers Acquired': 'العملاء المكتسبون',
  'Customers Who Bought More Than Once': 'العملاء الذين اشتروا أكثر من مرة',
  'Total Customers': 'إجمالي العملاء',
  'Total revenue': 'إجمالي الإيرادات',
  'Number of orders': 'عدد الطلبات',
  'Average order value (AOV)': 'متوسط قيمة الطلب (AOV)',
  'Purchases per customer (lifetime)': 'عدد المشتريات لكل عميل (مدى الحياة)',
  'Gross margin (%)': 'هامش الربح الإجمالي (%)',
  'Customer acquisition cost (optional, for ratio)': 'تكلفة اكتساب العميل (اختياري، للنسبة)',
  'Average revenue per user (ARPU) / month': 'متوسط الإيراد لكل مستخدم (ARPU) / شهر',
  'Monthly churn rate (%)': 'معدل التسرب الشهري (%)',
  'Customer lifetime value (LTV)': 'القيمة الدائمة للعميل (LTV)',
  'Customer acquisition cost (CAC)': 'تكلفة اكتساب العميل (CAC)',
  'Ad spend': 'الإنفاق الإعلاني',
  'Do you know your revenue?': 'هل تعرف إيراداتك؟',
  'Ad revenue': 'إيرادات الإعلان',
  'Target ROAS (enter 100% for breakeven)': 'ROAS المستهدف (أدخل 100% لنقطة التعادل)',
  'Profit margin': 'هامش الربح',
  'Gross Margin (%)': 'هامش الربح الإجمالي (%)',
  'Current ROAS (Optional)': 'ROAS الحالي (اختياري)',
  'Starting MRR (from existing customers)': 'MRR الابتدائي (من العملاء الحاليين)',
  'Contraction MRR (downgrades, reduced usage)': 'MRR الانكماش (تخفيضات، استخدام أقل)',
  'Churn MRR (cancellations)': 'MRR التسرب (الإلغاءات)',
  'Expansion MRR (upsells, cross-sells, upgrades)': 'MRR التوسع (ترقيات، مبيعات متقاطعة)',
  'Previous Month Value': 'قيمة الشهر السابق',
  'Current Month Value': 'قيمة الشهر الحالي',
  'Start Value (Month 1)': 'القيمة الابتدائية (الشهر 1)',
  'End Value (Final Month)': 'القيمة النهائية (الشهر الأخير)',
  'Number of Months Between': 'عدد الأشهر بينهما',
  'Total marketing spend': 'إجمالي إنفاق التسويق',
  'Monthly Traffic': 'حركة المرور الشهرية',
  'Conversion Rate (%)': 'معدل التحويل (%)',
  'Average Order Value': 'متوسط قيمة الطلب',
  'Customer Lifetime Value': 'القيمة الدائمة للعميل',
  'Monthly Growth Rate (%)': 'معدل النمو الشهري (%)',
  'Monthly SEO Investment (Optional)': 'استثمار SEO الشهري (اختياري)',
  'Customer acquisition cost (CAC)': 'تكلفة اكتساب العميل (CAC)',
  'Monthly revenue per customer (ARPU)': 'الإيراد الشهري لكل عميل (ARPU)',
};

function translateLeaf(value) {
  return arFieldMap[value] ?? value;
}

function translateCalcTree(node) {
  if (node == null) return node;
  if (typeof node === 'string') return translateLeaf(node);
  if (Array.isArray(node)) return node.map(translateCalcTree);
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === 'title' || k === 'description') continue;
    out[k] = translateCalcTree(v);
  }
  return out;
}

for (const [slug, title, description] of calcsMeta) {
  const ui = en.calcs[slug];
  ar.calcs[slug] = {
    title: arCalcTitles[slug]?.[0] ?? title,
    description: arCalcTitles[slug]?.[1] ?? description,
    ...translateCalcTree(ui),
  };
}

// Manual Arabic overrides for panel titles and performance strings
const arOverrides = {
  'cpc.panelTitle': 'تكلفة النقرة (CPC)',
  'cpm.panelTitle': 'تكلفة الألف ظهور (CPM)',
  'ctr.panelTitle': 'معدل النقر (CTR)',
  'cac.panelTitle': 'تكلفة اكتساب العميل (CAC)',
  'cvr.panelTitle': 'معدل التحويل (CVR)',
  'aov.panelTitle': 'متوسط قيمة الطلب (AOV)',
  'cpl.panelTitle': 'حاسبة CPL',
  'ncac.panelTitle': 'تكلفة اكتساب العميل الجديد (nCAC)',
  'roas.panelTitle': 'العائد على الإنفاق الإعلاني (ROAS)',
  'roas.panelTitleRoi': 'العائد على الاستثمار (ROI)',
  'seo-roi.panelTitle': 'الأرقام الحالية',
  'seo-roi.panelTitleGrowth': 'إمكانات النمو',
  'seo-roi.chartTitle': 'توقعات حركة المرور لـ 12 شهراً',
  'seo-roi.tableTitle': 'توقعات النمو لـ 12 شهراً',
};

for (const [path, value] of Object.entries(arOverrides)) {
  const [slug, ...rest] = path.split('.');
  let cur = ar.calcs[slug];
  if (!cur) continue;
  for (let i = 0; i < rest.length - 1; i++) {
    cur[rest[i]] ??= {};
    cur = cur[rest[i]];
  }
  cur[rest.at(-1)] = value;
}

writeFileSync(join(root, 'src/shared/i18n/locales/en/calculators.json'), `${JSON.stringify(en, null, 2)}\n`);
writeFileSync(join(root, 'src/shared/i18n/locales/ar/calculators.json'), `${JSON.stringify(ar, null, 2)}\n`);
console.log('Generated calculators.json for en and ar');
