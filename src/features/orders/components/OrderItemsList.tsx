import type { OrderItem } from '@/app/api/orders';
import { formatSeriesPriceLabel } from '@/features/series/utils/seriesPricing';

function itemTypeLabel(itemType: OrderItem['itemType']) {
  return itemType === 'series' ? 'Series' : 'Digital product';
}

export function OrderItemsList({ items }: { items: OrderItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No line items.</p>;
  }

  return (
    <ul className="divide-y rounded-lg border text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="font-medium text-neutral-900">{item.title ?? 'Unknown item'}</p>
            <p className="text-xs text-neutral-500">{itemTypeLabel(item.itemType)}</p>
          </div>
          <span className="shrink-0 font-medium text-neutral-700">
            {formatSeriesPriceLabel(item.lineTotalCents)}
          </span>
        </li>
      ))}
    </ul>
  );
}
