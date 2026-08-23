import { Badge } from '@/shared/components/ui/badge';
import type { Order } from '@/app/api/orders';

const statusStyles: Record<Order['status'], string> = {
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
  expired: 'bg-neutral-100 text-neutral-700',
};

const statusLabels: Record<Order['status'], string> = {
  paid: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
  expired: 'Expired',
};

export function OrderStatusBadge({ status }: { status: Order['status'] }) {
  return (
    <Badge variant="secondary" className={statusStyles[status]}>
      {statusLabels[status]}
    </Badge>
  );
}
