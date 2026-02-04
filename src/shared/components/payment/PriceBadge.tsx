import { Loader2, Tag } from 'lucide-react';
import type { PaymentItemType, PricePreview } from '@/app/api/payments';
import { usePricePreview } from '@/app/hooks/usePayments';
import { cn } from '@/shared/lib/utils';

interface PriceBadgeProps {
  itemType: PaymentItemType;
  itemId?: string;
  basePriceCents?: number | null;
  className?: string;
  showSubscriberDiscount?: boolean;
  /** Pass external pricePreview to avoid double API calls when parent already fetches it */
  pricePreview?: PricePreview | null;
  /** Color scheme: 'primary' for events, 'purple' for tracks */
  colorScheme?: 'primary' | 'purple';
}

const colorSchemes = {
  primary: {
    badge: 'bg-primary/10 text-primary',
    discount: 'bg-amber-100 text-amber-700',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-700',
    discount: 'bg-amber-100 text-amber-700',
  },
};

export function PriceBadge({
  itemType,
  itemId,
  basePriceCents,
  className,
  showSubscriberDiscount = true,
  pricePreview: externalPricePreview,
  colorScheme = 'primary',
}: PriceBadgeProps) {
  // Skip internal fetch if external data is provided
  const shouldFetch = showSubscriberDiscount && externalPricePreview === undefined;
  const { data: fetchedPricePreview, isLoading } = usePricePreview(
    shouldFetch ? itemType : undefined,
    itemId,
    undefined,
    { enabled: shouldFetch },
  );

  // Use external data if provided, otherwise use fetched data
  const pricePreview = externalPricePreview ?? fetchedPricePreview;
  const colors = colorSchemes[colorScheme];

  // If we have price preview data (user is logged in), use that
  if (showSubscriberDiscount && pricePreview) {
    if (pricePreview.isFree) {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700',
            className,
          )}
        >
          Free
        </span>
      );
    }

    const hasDiscount =
      pricePreview.isSubscriber && basePriceCents && pricePreview.amountCents < basePriceCents;

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold',
            colors.badge,
          )}
        >
          {pricePreview.amountFormatted}
        </span>
        {hasDiscount && (
          <>
            <span className="text-sm text-muted-foreground line-through">
              {(basePriceCents / 100).toFixed(0)} EGP
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                colors.discount,
              )}
            >
              <Tag className="h-3 w-3" />
              Subscriber Price
            </span>
          </>
        )}
      </div>
    );
  }

  // Fallback: show base price without discount info
  if (isLoading && showSubscriberDiscount) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground', className)}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading price...
      </span>
    );
  }

  if (!basePriceCents || basePriceCents === 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700',
          className,
        )}
      >
        Free
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold',
        colors.badge,
        className,
      )}
    >
      {(basePriceCents / 100).toFixed(0)} EGP
    </span>
  );
}
