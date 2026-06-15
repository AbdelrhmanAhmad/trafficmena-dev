import { ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCommerceCart } from '@/features/series/context/SeriesCartContext';
import { Button } from '@/shared/components/ui/button';
import { SidebarMenuButton, SidebarMenuItem } from '@/shared/components/ui/sidebar';

type SeriesCartNavButtonProps = {
  variant?: 'header' | 'sidebar';
};

export function SeriesCartNavButton({ variant = 'header' }: SeriesCartNavButtonProps) {
  const { itemCount } = useCommerceCart();
  const location = useLocation();
  const isActive = location.pathname === '/series/cart';

  const badge =
    itemCount > 0 ? (
      <span className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#29cf9f] px-1.5 text-[10px] font-semibold text-white">
        {itemCount > 9 ? '9+' : itemCount}
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
            {badge}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
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
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#29cf9f] px-1 text-[10px] font-semibold text-white">
            {itemCount > 9 ? '9+' : itemCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
