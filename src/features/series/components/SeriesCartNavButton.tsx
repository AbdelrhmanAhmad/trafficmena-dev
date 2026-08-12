import { ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCommerceCart } from '@/features/series/context/SeriesCartContext';
import { Button } from '@/shared/components/ui/button';
import { SidebarMenuButton, SidebarMenuItem } from '@/shared/components/ui/sidebar';

type SeriesCartNavButtonProps = {
  variant?: 'header' | 'sidebar' | 'icon' | 'drawer';
};

export function SeriesCartNavButton({ variant = 'header' }: SeriesCartNavButtonProps) {
  const { itemCount } = useCommerceCart();
  const location = useLocation();
  const isActive = location.pathname === '/series/cart';

  const countLabel = itemCount > 9 ? '9+' : itemCount;

  const badge =
    itemCount > 0 ? (
      <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#29cf9f] px-1.5 text-[10px] font-semibold text-[#101010]">
        {countLabel}
      </span>
    ) : null;

  if (variant === 'sidebar') {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className="h-10 rounded-lg px-3 text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 data-[active=true]:bg-neutral-100 data-[active=true]:text-neutral-900"
        >
          <Link to="/series/cart" className="flex w-full items-center gap-2.5">
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span className="truncate font-medium">Cart</span>
            {badge && <span className="ml-auto">{badge}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (variant === 'icon') {
    return (
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="relative h-10 w-10 rounded-xl text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <Link
          to="/series/cart"
          aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : 'Cart'}
        >
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#29cf9f] px-1 text-[10px] font-semibold text-[#101010]">
              {countLabel}
            </span>
          )}
        </Link>
      </Button>
    );
  }

  if (variant === 'drawer') {
    return (
      <Link
        to="/series/cart"
        className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-neutral-100 text-neutral-900'
            : 'text-neutral-800 hover:bg-neutral-50'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <ShoppingCart className="h-4 w-4 text-neutral-600" />
          Cart
        </span>
        {badge}
      </Link>
    );
  }

  return (
    <Button
      asChild
      variant={isActive ? 'secondary' : 'outline'}
      size="sm"
      className="relative gap-2"
    >
      <Link to="/series/cart">
        <ShoppingCart className="h-4 w-4" />
        <span className="hidden sm:inline">Cart</span>
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#29cf9f] px-1 text-[10px] font-semibold text-[#101010]">
            {countLabel}
          </span>
        )}
      </Link>
    </Button>
  );
}
