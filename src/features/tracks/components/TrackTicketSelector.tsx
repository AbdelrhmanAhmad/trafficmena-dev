import { centsToUnits } from '@/lib/analytics/helpers';
import type { EnabledTicketType, TicketType } from '../ticketTypes';

type TrackTicketSelectorProps = {
  options: EnabledTicketType[];
  value: TicketType | null;
  onChange: (type: TicketType) => void;
};

export function TrackTicketSelector({ options, value, onChange }: TrackTicketSelectorProps) {
  const selected = options.find((option) => option.type === value) ?? null;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-neutral-900">Choose your ticket</h3>
        <p className="text-sm text-neutral-600">
          Pick how you want to attend — each option has its own price.
        </p>
      </div>

      {/* High-contrast cards: near-black border by default, brand-green ring when selected. */}
      <div aria-label="Ticket type" className="grid gap-3 sm:grid-cols-3" role="radiogroup">
        {options.map((option) => {
          const isSelected = option.type === value;
          return (
            <button
              aria-checked={isSelected}
              className={`flex flex-col rounded-2xl border-2 p-4 text-left transition ${
                isSelected
                  ? 'border-[#05ef62] bg-[#f4fff9] ring-2 ring-[#05ef62]/40'
                  : 'border-neutral-900/80 bg-white hover:border-neutral-900'
              }`}
              key={option.type}
              onClick={() => onChange(option.type)}
              role="radio"
              type="button"
            >
              <span className="text-sm font-semibold text-neutral-900">{option.label}</span>
              <span className="mt-1 text-lg font-bold text-neutral-900">
                {option.priceCents > 0
                  ? `${centsToUnits(option.priceCents).toFixed(0)} EGP`
                  : 'Free'}
              </span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <p className="text-sm text-neutral-700">{selected.benefit}</p>
      ) : (
        <p className="text-sm font-medium text-neutral-900">Select a ticket type to continue.</p>
      )}
      <p className="text-xs text-neutral-500">Recordings appear after the team uploads them.</p>
    </div>
  );
}
