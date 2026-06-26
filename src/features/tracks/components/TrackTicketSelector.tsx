import { useId } from 'react';
import { centsToUnits } from '@/lib/analytics/helpers';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { cn } from '@/shared/lib/utils';
import type { TicketOption, TicketType } from '../ticketTypes';

type TrackTicketSelectorProps = {
  options: TicketOption[];
  value: TicketType | null;
  onChange: (type: TicketType) => void;
};

const priceLabel = (priceCents: number | null) =>
  priceCents && priceCents > 0 ? `${centsToUnits(priceCents).toFixed(0)} EGP` : 'Free';

/**
 * Compact ticket picker for the booking card. Shows every variant in canonical order; disabled ones
 * stay visible but greyed and non-selectable ("Not available now"). One selectable variant at a time.
 */
export function TrackTicketSelector({ options, value, onChange }: TrackTicketSelectorProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-neutral-900" id={headingId}>
          Choose your ticket
        </h3>
        <p className="text-xs text-neutral-500">Pick how you'll attend — each has its own price.</p>
      </div>

      <RadioGroup
        aria-label="Ticket type"
        className="gap-2"
        value={value ?? ''}
        onValueChange={(next) => onChange(next as TicketType)}
      >
        {options.map((option) => {
          const isSelected = option.enabled && option.type === value;
          return (
            <label
              aria-disabled={!option.enabled}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3 transition',
                option.enabled
                  ? 'cursor-pointer border-neutral-200 bg-white hover:border-neutral-400'
                  : 'cursor-not-allowed border-neutral-200 bg-neutral-50',
                isSelected && 'border-[#05ef62] bg-[#f4fff9] ring-1 ring-[#05ef62]/50',
              )}
              htmlFor={`${headingId}-${option.type}`}
              key={option.type}
            >
              <RadioGroupItem
                className="mt-0.5 shrink-0 border-neutral-400 text-[#05c24f] focus-visible:ring-[#05ef62]/40 data-[state=checked]:border-[#05c24f]"
                disabled={!option.enabled}
                id={`${headingId}-${option.type}`}
                value={option.type}
              />
              <div className={cn('min-w-0 flex-1', !option.enabled && 'opacity-60')}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-900">{option.label}</span>
                  <span
                    className={cn(
                      'shrink-0 text-sm font-bold',
                      option.enabled ? 'text-neutral-900' : 'text-neutral-400',
                    )}
                  >
                    {option.enabled ? priceLabel(option.priceCents) : 'Not available now'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-snug text-neutral-500">{option.benefit}</p>
              </div>
            </label>
          );
        })}
      </RadioGroup>
    </section>
  );
}
