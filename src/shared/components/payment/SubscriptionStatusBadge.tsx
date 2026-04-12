import { format } from 'date-fns';
import { Crown, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrentSubscription } from '@/app/hooks/useSubscriptions';
import { useAuth } from '@/shared/context/AuthContext';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';
import { cn } from '@/shared/lib/utils';

interface SubscriptionStatusBadgeProps {
  className?: string;
  showLink?: boolean;
}

export function SubscriptionStatusBadge({
  className,
  showLink = true,
}: SubscriptionStatusBadgeProps) {
  const { user } = useAuth();
  const { canAccessSubscriptionPages } = useRolePermissions();
  const { data: subscription, isLoading } = useCurrentSubscription({ enabled: !!user });

  if (isLoading) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground', className)}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }

  if (!subscription || subscription.status !== 'active') {
    if (!showLink || !canAccessSubscriptionPages) return null;

    const subscribePath = user ? '/dashboard/subscribe' : '/subscribe';

    return (
      <Link
        to={subscribePath}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100',
          className,
        )}
      >
        <Crown className="h-3 w-3" />
        <span>Become a Subscriber</span>
      </Link>
    );
  }

  const expiresAt = new Date(subscription.endsAt);
  const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysRemaining <= 30;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        isExpiringSoon
          ? 'border border-amber-200 bg-amber-50 text-amber-700'
          : 'border border-primary/30 bg-primary/10 text-primary',
        className,
      )}
    >
      <Crown className="h-3 w-3" />
      <span>
        {isExpiringSoon
          ? `Expires ${format(expiresAt, 'MMM d')}`
          : `Subscriber until ${format(expiresAt, 'MMM d, yyyy')}`}
      </span>
    </div>
  );
}
