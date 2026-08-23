import type React from 'react';
import { Badge } from '@/shared/components/ui/badge';
import type { Series } from '../types';
import { formatSeriesPriceLabel, shouldShowSeriesPrice } from '../utils/seriesPricing';

type SeriesPriceBadgeProps = {
  series: Pick<Series, 'sales_enabled' | 'price_in_cents'>;
  isStaff?: boolean;
  className?: string;
};

const SeriesPriceBadge: React.FC<SeriesPriceBadgeProps> = ({ series, isStaff = false, className }) => {
  if (!shouldShowSeriesPrice(series, { isStaff })) {
    return null;
  }

  if (isStaff && !series.sales_enabled) {
    return (
      <Badge
        variant="outline"
        className={`rounded-full border-neutral-300 bg-neutral-100 text-neutral-600 ${className ?? ''}`}
      >
        Sales off
      </Badge>
    );
  }

  return (
    <Badge
      className={`rounded-full border border-emerald-600/60 bg-emerald-500/10 text-emerald-700 ${className ?? ''}`}
    >
      {formatSeriesPriceLabel(series.price_in_cents)}
    </Badge>
  );
};

export default SeriesPriceBadge;
