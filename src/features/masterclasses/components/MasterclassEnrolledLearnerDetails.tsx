import type { ReactNode } from 'react';
import { formatSeriesPriceLabel } from '@/features/series/utils/seriesPricing';
import { Badge } from '@/shared/components/ui/badge';

type MasterclassEnrolledLearnerDetailsProps = {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
  phoneNumber?: string | null;
  source: 'paid' | 'manual';
  purchasedPriceInCents?: number | null;
  subtitle?: ReactNode;
};

export function MasterclassEnrolledLearnerDetails({
  firstName,
  lastName,
  name,
  email,
  phoneNumber,
  source,
  purchasedPriceInCents,
  subtitle,
}: MasterclassEnrolledLearnerDetailsProps) {
  const displayName =
    firstName || lastName ? `${firstName ?? ''} ${lastName ?? ''}`.trim() : name || email;

  return (
    <div>
      <p className="font-medium">{displayName}</p>
      <p className="text-sm text-neutral-500">{email}</p>
      <p className="text-sm text-neutral-500">{phoneNumber?.trim() || '—'}</p>
      {subtitle ? <div className="mt-1">{subtitle}</div> : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant={source === 'paid' ? 'default' : 'secondary'}>{source}</Badge>
        {source === 'paid' && purchasedPriceInCents != null ? (
          <Badge variant="outline">{formatSeriesPriceLabel(purchasedPriceInCents)}</Badge>
        ) : null}
      </div>
    </div>
  );
}
