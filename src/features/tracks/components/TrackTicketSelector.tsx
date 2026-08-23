import { useId } from 'react';
import { centsToUnits } from '@/lib/analytics/helpers';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { cn } from '@/shared/lib/utils';
import type { EnabledTicketType, TicketType } from '../ticketTypes';

type TrackTicketSelectorProps = {
  options: EnabledTicketType[];
  value: TicketType | null;
  onChange: (type: TicketType) => void;
};

const priceLabel = (priceCents: number) =>
  priceCents > 0 ? `${centsToUnits(priceCents).toFixed(0)} EGP` : 'Free';

/**
 * Compact ticket picker for the booking card. Renders only the variants the track sells (the
 * admin-enabled Ticket Types), in canonical order.
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
          const isSelected = option.type === value;
          return (
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-neutral-400',
                isSelected && 'border-[#05ef62] bg-[#f4fff9] ring-1 ring-[#05ef62]/50',
              )}
              htmlFor={`${headingId}-${option.type}`}
              key={option.type}
            >
              <RadioGroupItem
                className="mt-0.5 shrink-0 border-neutral-400 text-[#05c24f] focus-visible:ring-[#05ef62]/40 data-[state=checked]:border-[#05c24f]"
                id={`${headingId}-${option.type}`}
                value={option.type}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-900">{option.label}</span>
                  <span className="shrink-0 text-sm font-bold text-neutral-900">
                    {priceLabel(option.priceCents)}
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
