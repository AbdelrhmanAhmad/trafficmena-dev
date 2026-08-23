import type { OrderItem } from '@/app/api/orders';

export function getOrderItemDashboardPath(item: OrderItem): string {
  if (item.itemType === 'series' && item.seriesId) {
    return `/dashboard/library/series/${item.seriesId}`;
  }
  if (item.itemType === 'digital_product' && item.digitalProductId) {
    return `/dashboard/digital-products/${item.digitalProductId}`;
  }
  return '/dashboard';
}

export function getOrderItemTypeLabel(itemType: OrderItem['itemType']): string {
  return itemType === 'series' ? 'Recording' : 'Digital product';
}
