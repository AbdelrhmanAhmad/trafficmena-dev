import { Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PricePreview } from '@/app/api/payments';
import { cn } from '@/shared/lib/utils';

interface PriceDisplayCardProps {
  /** Type of item for determining context */
  itemType: 'event' | 'track';
  /** Base price in cents before any discounts */
  basePriceCents: number | null;
  /** Pre-fetched price preview from parent to avoid double API calls */
  pricePreview?: PricePreview | null;
  /** Label text (defaults to translated "Price") */
  label?: string;
  /** Additional class names */
  className?: string;
}

const colorSchemes = {
  event: {
    gradient: 'from-primary/10 to-primary/5',
    icon: 'text-primary',
    price: 'text-primary',
  },
  track: {
    gradient: 'from-purple-100/80 to-indigo-100/60',
    icon: 'text-purple-500',
    price: 'text-purple-700',
  },
};

/**
 * Card wrapper for price display with gradient background and icon.
 * Used in detail pages (EventDetail, TrackDetail) for consistent price presentation.
 */
export function PriceDisplayCard({
  itemType,
  basePriceCents,
  pricePreview,
  label,
  className,
}: PriceDisplayCardProps) {
  const { t } = useTranslation('payments');
  const colors = colorSchemes[itemType];
  const displayLabel = label ?? t('priceLabel');

  // Determine what price to show
  const showSubscriberPrice =
    pricePreview?.isFree || (pricePreview && pricePreview.amountCents > 0);
  const originalAmount = pricePreview?.originalAmountCents ?? basePriceCents ?? 0;
  const hasDiscount =
    pricePreview &&
    pricePreview.discountAppliedCents > 0 &&
    pricePreview.amountCents < originalAmount;
  const discountLabel =
    pricePreview?.discountSource === 'promo'
      ? t('pricePromoApplied')
      : pricePreview?.discountSource === 'subscriber'
        ? t('priceSubscriberDiscount')
        : null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl bg-gradient-to-r px-4 py-3',
        colors.gradient,
        className,
      )}
    >
      <Tag className={cn('h-5 w-5', colors.icon)} />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{displayLabel}</p>
        {showSubscriberPrice && pricePreview ? (
          <div className="flex items-center gap-2">
            <p className={cn('text-sm font-semibold', colors.price)}>
              {pricePreview.isFree ? t('free') : pricePreview.amountFormatted}
            </p>
            {hasDiscount && originalAmount > 0 && (
              <>
                <span className="text-xs text-muted-foreground line-through">
                  {(originalAmount / 100).toFixed(0)} EGP
                </span>
                {discountLabel && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    {discountLabel}
                  </span>
                )}
              </>
            )}
          </div>
        ) : (
          <p className="text-sm font-semibold text-neutral-900">
            {((basePriceCents ?? 0) / 100).toFixed(0)} EGP
          </p>
        )}
      </div>
    </div>
  );
}
