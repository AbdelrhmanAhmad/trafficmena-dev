import type { CreateSeriesPayload } from '@/app/api/series';
import type { Series } from '../types';

export type SeriesFormPricingValues = {
  title: string;
  description?: string;
  imageUrl?: string;
  isPublished: boolean;
  isPremium: boolean;
  priceEgp?: string;
  salesEnabled: boolean;
};

export function mapSeriesFormToPayload(values: SeriesFormPricingValues): CreateSeriesPayload {
  return {
    title: values.title,
    description: values.description || null,
    imageUrl: values.imageUrl || null,
    isPublished: values.isPublished,
    isPremium: values.isPremium,
    priceInCents: values.priceEgp ? Math.round(Number(values.priceEgp) * 100) : null,
    salesEnabled: values.salesEnabled,
  };
}

export function formatSeriesPriceLabel(priceInCents: number | null | undefined): string {
  if (priceInCents == null || priceInCents === 0) {
    return 'Free';
  }

  const hasFraction = priceInCents % 100 !== 0;
  return `${(priceInCents / 100).toFixed(hasFraction ? 2 : 0)} EGP`;
}

export function shouldShowSeriesPrice(
  series: Pick<Series, 'sales_enabled' | 'price_in_cents'>,
  options?: { isStaff?: boolean },
): boolean {
  if (options?.isStaff) {
    return series.price_in_cents != null || series.sales_enabled;
  }

  return series.sales_enabled && (series.price_in_cents ?? 0) > 0;
}

export function isSeriesPurchasable(
  series: Pick<Series, 'sales_enabled' | 'price_in_cents' | 'asset_count' | 'is_sellable'>,
): boolean {
  if (series.is_sellable !== undefined) {
    return series.is_sellable;
  }

  return (
    series.sales_enabled &&
    (series.price_in_cents ?? 0) > 0 &&
    (series.asset_count ?? 0) > 0
  );
}
