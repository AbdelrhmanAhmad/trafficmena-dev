export type CalculatorCategory = 'traffic' | 'conversion' | 'revenue' | 'retention' | 'efficiency';

export interface CalculatorMeta {
  slug: string;
  title: string;
  description: string;
  category: CalculatorCategory;
  component: string;
}

export const CALCULATOR_CATEGORIES: Record<CalculatorCategory, string> = {
  traffic: 'Traffic & Acquisition',
  conversion: 'Conversion',
  revenue: 'Revenue & Value',
  retention: 'Retention & Growth',
  efficiency: 'Efficiency',
};

export const CALCULATORS: CalculatorMeta[] = [
  // Traffic & Acquisition
  {
    slug: 'cpc',
    title: 'Cost Per Click',
    description: 'Calculate cost efficiency per click',
    category: 'traffic',
    component: 'CPCCalculator',
  },
  {
    slug: 'cpm',
    title: 'Cost Per Mille',
    description: 'Cost per 1000 impressions',
    category: 'traffic',
    component: 'CPMCalculator',
  },
  {
    slug: 'cpl',
    title: 'Cost Per Lead',
    description: 'Calculate lead acquisition cost',
    category: 'traffic',
    component: 'CPLCalculator',
  },
  {
    slug: 'ctr',
    title: 'Click-Through Rate',
    description: 'Measure click engagement',
    category: 'traffic',
    component: 'CTRCalculator',
  },
  {
    slug: 'cac',
    title: 'Customer Acquisition Cost',
    description: 'Total cost to acquire a customer',
    category: 'traffic',
    component: 'CACCalculator',
  },
  {
    slug: 'ncac',
    title: 'New CAC',
    description: 'New customer acquisition cost',
    category: 'traffic',
    component: 'NCACCalculator',
  },
  {
    slug: 'cac-payback',
    title: 'CAC Payback Period',
    description: 'Time to recover acquisition cost',
    category: 'traffic',
    component: 'CACPaybackCalculator',
  },

  // Conversion
  {
    slug: 'cvr',
    title: 'Conversion Rate',
    description: 'Track visitor to customer conversion',
    category: 'conversion',
    component: 'CVRCalculator',
  },
  {
    slug: 'cart-abandonment',
    title: 'Cart Abandonment Rate',
    description: 'Shopping cart drop-off rate',
    category: 'conversion',
    component: 'CartAbandonmentRateCalculator',
  },
  {
    slug: 'checkout-abandonment',
    title: 'Checkout Abandonment',
    description: 'Checkout process drop-off rate',
    category: 'conversion',
    component: 'CheckoutAbandonmentRateCalculator',
  },
  {
    slug: 'lead-to-customer',
    title: 'Lead to Customer Rate',
    description: 'Lead conversion efficiency',
    category: 'conversion',
    component: 'LeadToCustomerRateCalculator',
  },
  {
    slug: 'repeat-purchase',
    title: 'Repeat Purchase Rate',
    description: 'Customer loyalty metric',
    category: 'conversion',
    component: 'RepeatPurchaseRateCalculator',
  },

  // Revenue & Value
  {
    slug: 'aov',
    title: 'Average Order Value',
    description: 'Average transaction value',
    category: 'revenue',
    component: 'AOVCalculator',
  },
  {
    slug: 'ltv',
    title: 'Customer Lifetime Value',
    description: 'Total customer value over time',
    category: 'revenue',
    component: 'LTVCalculator',
  },
  {
    slug: 'saas-ltv',
    title: 'SaaS LTV Calculator',
    description: 'Subscription lifetime value',
    category: 'revenue',
    component: 'SaaSLTVCalculator',
  },
  {
    slug: 'ltv-cac',
    title: 'LTV:CAC Ratio',
    description: 'Customer value vs acquisition cost',
    category: 'revenue',
    component: 'LTVCACCalculator',
  },
  {
    slug: 'roas',
    title: 'Return on Ad Spend',
    description: 'Ad revenue efficiency',
    category: 'revenue',
    component: 'ROASCalculator',
  },
  {
    slug: 'breakeven-roas',
    title: 'Breakeven ROAS',
    description: 'Minimum ROAS for profitability',
    category: 'revenue',
    component: 'BreakevenROASCalculator',
  },

  // Retention & Growth
  {
    slug: 'grr',
    title: 'Gross Revenue Retention',
    description: 'Revenue kept from existing customers',
    category: 'retention',
    component: 'GRRCalculator',
  },
  {
    slug: 'nrr',
    title: 'Net Revenue Retention',
    description: 'Revenue growth from existing customers',
    category: 'retention',
    component: 'NRRCalculator',
  },
  {
    slug: 'mom-growth',
    title: 'Month over Month Growth',
    description: 'Monthly growth rate tracking',
    category: 'retention',
    component: 'MoMGrowthCalculator',
  },

  // Efficiency
  {
    slug: 'mer',
    title: 'Marketing Efficiency Ratio',
    description: 'Overall marketing ROI',
    category: 'efficiency',
    component: 'MERCalculator',
  },
  {
    slug: 'seo-roi',
    title: 'SEO ROI Calculator',
    description: 'Organic search return on investment',
    category: 'efficiency',
    component: 'SEOROICalculator',
  },
];

export const getCalculatorBySlug = (slug: string): CalculatorMeta | undefined =>
  CALCULATORS.find((c) => c.slug === slug);
